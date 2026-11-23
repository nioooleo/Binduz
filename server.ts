import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { NextFunction, Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
const ADMIN_SECRET_FILE = path.resolve(__dirname, '.binduz-admin-secret.json');
const CMS_STORE_FILE = path.resolve(__dirname, '.binduz-cms-store.json');

// Runtime HMAC signing secret (process.env or ephemeral high-entropy fallback)
const SESSION_SIGNING_SECRET =
  process.env.ADMIN_SESSION_SECRET || crypto.randomBytes(32).toString('hex');

app.use(express.json({ limit: '2mb' }));

// Security headers (iframe-compatible: omit X-Frame-Options)
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');
  next();
});

// Sliding-window rate limiter for /api/*
const rateBuckets = new Map<string, number[]>();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 120;

function apiRateLimiter(req: Request, res: Response, next: NextFunction) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const history = (rateBuckets.get(ip) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (history.length >= RATE_MAX_REQUESTS) {
    res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment and try again.' });
    return;
  }
  history.push(now);
  rateBuckets.set(ip, history);
  next();
}

app.use('/api', apiRateLimiter);

// --- Server-Side Private Admin Passcode Auth (scrypt + HMAC Bearer) ---
interface StoredAdminSecret {
  salt: string;
  hash: string;
  claimedAt: string;
}

function readStoredAdminSecret(): StoredAdminSecret | null {
  try {
    if (!fs.existsSync(ADMIN_SECRET_FILE)) return null;
    const raw = fs.readFileSync(ADMIN_SECRET_FILE, 'utf8');
    const parsed = JSON.parse(raw) as StoredAdminSecret;
    if (parsed.salt && parsed.hash) return parsed;
    return null;
  } catch {
    return null;
  }
}

function getEnvPasscode(): string {
  return (process.env.ADMIN_PASSCODE || '').trim();
}

function hashPasscode(passcode: string, saltHex: string): string {
  return crypto.scryptSync(passcode, Buffer.from(saltHex, 'hex'), 64).toString('hex');
}

function verifyPasscodeMatch(candidate: string): boolean {
  const envPass = getEnvPasscode();
  if (envPass.length > 0) {
    const a = crypto.createHash('sha256').update(candidate).digest();
    const b = crypto.createHash('sha256').update(envPass).digest();
    return crypto.timingSafeEqual(a, b);
  }
  const stored = readStoredAdminSecret();
  if (!stored) return false;
  const candidateHash = hashPasscode(candidate, stored.salt);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(stored.hash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function issueAdminBearerToken(subject: string): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 1000 * 60 * 60 * 8; // 8 hours
  const payloadB64 = Buffer.from(
    JSON.stringify({ sub: subject, role: 'Super Admin', exp: expiresAt }),
    'utf8'
  ).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SESSION_SIGNING_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return { token: `adm.${payloadB64}.${sig}`, expiresAt };
}

function verifyAdminBearerToken(req: Request): { sub: string; role: string } | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer adm.')) return null;
  const rawToken = header.slice(7).trim();
  const parts = rawToken.split('.');
  if (parts.length !== 3 || parts[0] !== 'adm') return null;
  const [, payloadB64, sigB64] = parts;
  try {
    const expectedSig = crypto
      .createHmac('sha256', SESSION_SIGNING_SECRET)
      .update(payloadB64)
      .digest();
    const actualSig = Buffer.from(sigB64, 'base64url');
    if (expectedSig.length !== actualSig.length || !crypto.timingSafeEqual(expectedSig, actualSig)) {
      return null;
    }
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp <= Date.now()) return null;
    return { sub: String(payload.sub || 'admin'), role: String(payload.role || 'Super Admin') };
  } catch {
    return null;
  }
}

// --- Cryptographic Firebase ID token verification via Google public x509 certs ---
let cachedCerts: { certs: Record<string, string>; expiresAt: number } | null = null;

async function getFirebasePublicCerts(): Promise<Record<string, string>> {
  if (cachedCerts && Date.now() < cachedCerts.expiresAt) {
    return cachedCerts.certs;
  }
  const resp = await fetch(
    'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com'
  );
  if (!resp.ok) {
    throw new Error('Failed to fetch Firebase public verification certificates.');
  }
  const cacheControl = resp.headers.get('cache-control') || '';
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeSec = maxAgeMatch ? Number(maxAgeMatch[1]) : 3600;
  const certs = (await resp.json()) as Record<string, string>;
  cachedCerts = { certs, expiresAt: Date.now() + maxAgeSec * 1000 };
  return certs;
}

interface VerifiedUserClaims {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

async function verifyFirebaseBearerToken(req: Request): Promise<VerifiedUserClaims | null> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ') || header.startsWith('Bearer adm.')) {
    return null;
  }
  const token = header.slice(7).trim();
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const [headerB64, payloadB64, sigB64] = parts;
    const decodedHeader = JSON.parse(Buffer.from(headerB64, 'base64url').toString('utf8'));
    const decodedPayload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    const certs = await getFirebasePublicCerts();
    const cert = certs[decodedHeader.kid];
    if (!cert || decodedHeader.alg !== 'RS256') {
      return null;
    }
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(`${headerB64}.${payloadB64}`);
    const sigValid = verifier.verify(cert, Buffer.from(sigB64, 'base64url'));
    if (!sigValid) {
      return null;
    }
    const nowSec = Math.floor(Date.now() / 1000);
    const expectedIss = `https://securetoken.google.com/${firebaseConfig.projectId}`;
    if (
      decodedPayload.aud !== firebaseConfig.projectId ||
      decodedPayload.iss !== expectedIss ||
      typeof decodedPayload.sub !== 'string' ||
      !decodedPayload.sub ||
      decodedPayload.exp <= nowSec
    ) {
      return null;
    }
    return {
      uid: decodedPayload.sub,
      email: decodedPayload.email,
      email_verified: Boolean(decodedPayload.email_verified),
    };
  } catch {
    return null;
  }
}

async function verifyAnyAuthorizedStaff(req: Request): Promise<{ id: string; isAdmin: boolean } | null> {
  const adminSess = verifyAdminBearerToken(req);
  if (adminSess) {
    return { id: adminSess.sub, isAdmin: true };
  }
  const fbUser = await verifyFirebaseBearerToken(req);
  if (fbUser && fbUser.email_verified) {
    return { id: fbUser.uid, isAdmin: fbUser.email === 'nioooleo@gmail.com' };
  }
  return null;
}

// --- Server-Side CMS Persistence Store (for Admin Passcode + Live Feed Overrides) ---
interface ServerCmsStore {
  articles: Array<Record<string, unknown>>;
  pages: Array<Record<string, unknown>>;
  homepageSections: Array<Record<string, unknown>>;
  navigationItems: Array<Record<string, unknown>>;
  mediaAssets: Array<Record<string, unknown>>;
  campaigns: Array<Record<string, unknown>>;
  rolePermissions: Array<Record<string, unknown>>;
  siteSettings: Record<string, unknown> | null;
  rssFeeds: Array<{ id: string; name: string; url: string; category: string; enabled: boolean }>;
  revisions: Record<string, Array<Record<string, unknown>>>;
  auditLogs: Array<Record<string, unknown>>;
}

const DEFAULT_RSS_FEEDS = [
  // Bangladesh National Newspapers, TV Broadcasters & Verified Websites
  { id: 'dailystar-news', name: 'The Daily Star', url: 'https://www.thedailystar.net/news/rss.xml', category: 'Bangladesh National', enabled: true },
  { id: 'dailystar-biz', name: 'The Daily Star Business', url: 'https://www.thedailystar.net/business/rss.xml', category: 'Business', enabled: true },
  { id: 'dailystar-sports', name: 'The Daily Star Sports', url: 'https://www.thedailystar.net/sports/rss.xml', category: 'Sports', enabled: true },
  { id: 'prothomalo-en', name: 'Prothom Alo English', url: 'https://en.prothomalo.com/feed', category: 'Bangladesh National', enabled: true },
  { id: 'dhakatribune-bd', name: 'Dhaka Tribune', url: 'https://www.dhakatribune.com/feed/', category: 'Bangladesh National', enabled: true },
  { id: 'tbs-bd', name: 'The Business Standard BD', url: 'https://news.google.com/rss/search?q=site:tbsnews.net&hl=en&gl=BD&ceid=BD:en', category: 'Economy', enabled: true },
  { id: 'channeli-tv', name: 'Channel i TV', url: 'https://www.channelionline.com/feed/', category: 'Bangladesh National', enabled: true },
  { id: 'ekattor-tv', name: 'Ekattor TV', url: 'https://ekattor.tv/feed/', category: 'Bangladesh National', enabled: true },
  { id: 'jagonews24-bd', name: 'Jago News 24', url: 'https://www.jagonews24.com/rss/rss.xml', category: 'Bangladesh National', enabled: true },
  { id: 'banglatribune-bd', name: 'Bangla Tribune', url: 'https://www.banglatribune.com/feed/', category: 'Bangladesh National', enabled: true },

  // BBC (Broadcast, World, Business, Technology, Sport, Culture & Education)
  { id: 'bbc-top', name: 'BBC News', url: 'https://feeds.bbci.co.uk/news/rss.xml', category: 'International', enabled: true },
  { id: 'bbc-world', name: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml', category: 'International', enabled: true },
  { id: 'bbc-business', name: 'BBC Business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml', category: 'Business', enabled: true },
  { id: 'bbc-tech', name: 'BBC Technology', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', category: 'Technology', enabled: true },
  { id: 'bbc-sport', name: 'BBC Sport', url: 'https://feeds.bbci.co.uk/sport/rss.xml', category: 'Sports', enabled: true },
  { id: 'bbc-entertainment', name: 'BBC Entertainment & Arts', url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', category: 'Entertainment', enabled: true },
  { id: 'bbc-education', name: 'BBC Education', url: 'https://feeds.bbci.co.uk/news/education/rss.xml', category: 'Education', enabled: true },

  // CNN & Major International TV, Newspapers & Wire Agencies
  { id: 'cnn-international', name: 'CNN', url: 'https://news.google.com/rss/search?q=site:cnn.com&hl=en-US&gl=US&ceid=US:en', category: 'International', enabled: true },
  { id: 'aljazeera-tv', name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml', category: 'International', enabled: true },
  { id: 'reuters-wire', name: 'Reuters', url: 'https://news.google.com/rss/search?q=site:reuters.com&hl=en-US&gl=US&ceid=US:en', category: 'International', enabled: true },
  { id: 'ap-news', name: 'Associated Press (AP)', url: 'https://news.google.com/rss/search?q=site:apnews.com&hl=en-US&gl=US&ceid=US:en', category: 'Politics', enabled: true },
  { id: 'guardian-world', name: 'The Guardian', url: 'https://www.theguardian.com/world/rss', category: 'International', enabled: true },
  { id: 'dw-tv', name: 'Deutsche Welle (DW)', url: 'https://rss.dw.com/xml/rss-en-all', category: 'International', enabled: true },
  { id: 'france24-tv', name: 'France 24', url: 'https://www.france24.com/en/rss', category: 'International', enabled: true },
  { id: 'skynews-tv', name: 'Sky News', url: 'https://feeds.skynews.com/feeds/rss/world.xml', category: 'International', enabled: true },
  { id: 'cnbc-world', name: 'CNBC Markets', url: 'https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100727362', category: 'Economy', enabled: true },
  { id: 'npr-world', name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml', category: 'International', enabled: true },
  { id: 'nyt-world', name: 'The New York Times', url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', category: 'International', enabled: true },
];

function readCmsStore(): ServerCmsStore {
  const empty: ServerCmsStore = {
    articles: [],
    pages: [],
    homepageSections: [],
    navigationItems: [],
    mediaAssets: [],
    campaigns: [],
    rolePermissions: [],
    siteSettings: null,
    rssFeeds: DEFAULT_RSS_FEEDS,
    revisions: {},
    auditLogs: [],
  };
  try {
    if (!fs.existsSync(CMS_STORE_FILE)) return empty;
    const parsed = JSON.parse(fs.readFileSync(CMS_STORE_FILE, 'utf8')) as Partial<ServerCmsStore>;
    const legacyStaleUrls = new Set([
      'http://rss.cnn.com/rss/edition.rss',
      'https://rss.cnn.com/rss/edition.rss',
      'https://www.tbsnews.net/rss.xml',
      'https://www.thedailystar.net/frontpage/rss.xml',
    ]);
    let feeds = Array.isArray(parsed.rssFeeds) && parsed.rssFeeds.length > 0 ? parsed.rssFeeds : DEFAULT_RSS_FEEDS;
    // Upgrade stale legacy feed URLs automatically if present in saved CMS store
    feeds = feeds.filter((f) => !legacyStaleUrls.has(f.url));
    if (feeds.length < DEFAULT_RSS_FEEDS.length) {
      const existingIds = new Set(feeds.map((f) => f.id));
      for (const df of DEFAULT_RSS_FEEDS) {
        if (!existingIds.has(df.id)) feeds.push(df);
      }
    }
    return {
      articles: Array.isArray(parsed.articles) ? parsed.articles : [],
      pages: Array.isArray(parsed.pages) ? parsed.pages : [],
      homepageSections: Array.isArray(parsed.homepageSections) ? parsed.homepageSections : [],
      navigationItems: Array.isArray(parsed.navigationItems) ? parsed.navigationItems : [],
      mediaAssets: Array.isArray(parsed.mediaAssets) ? parsed.mediaAssets : [],
      campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns : [],
      rolePermissions: Array.isArray(parsed.rolePermissions) ? parsed.rolePermissions : [],
      siteSettings: parsed.siteSettings || null,
      rssFeeds: feeds,
      revisions: parsed.revisions && typeof parsed.revisions === 'object' ? parsed.revisions : {},
      auditLogs: Array.isArray(parsed.auditLogs) ? parsed.auditLogs : [],
    };
  } catch {
    return empty;
  }
}

function writeCmsStore(store: ServerCmsStore): void {
  fs.writeFileSync(CMS_STORE_FILE, JSON.stringify(store, null, 2), 'utf8');
}

// --- SSRF-Hardened Live RSS & Weather Telemetry ---
const ALLOWED_RSS_HOSTS = new Set([
  'www.thedailystar.net',
  'en.prothomalo.com',
  'www.prothomalo.com',
  'www.dhakatribune.com',
  'www.channelionline.com',
  'ekattor.tv',
  'www.jagonews24.com',
  'www.banglatribune.com',
  'feeds.bbci.co.uk',
  'news.google.com',
  'feeds.npr.org',
  'www.theguardian.com',
  'rss.nytimes.com',
  'www.aljazeera.com',
  'rss.dw.com',
  'www.france24.com',
  'feeds.skynews.com',
  'search.cnbc.com',
  'www.nature.com',
  'newsapi.org',
]);

function isSafeExternalFeedUrl(rawUrl: string): URL | null {
  try {
    const u = new URL(rawUrl);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    const host = u.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.16.') ||
      host.startsWith('169.254.') ||
      host === '::1'
    ) {
      return null;
    }
    if (!ALLOWED_RSS_HOSTS.has(host)) return null;
    return u;
  } catch {
    return null;
  }
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;|&#039;/g, "'")
    .replace(/&#8216;|&#8217;/g, "'")
    .replace(/&#8220;|&#8221;/g, '"')
    .replace(/&#8211;|&#8212;/g, '—')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fallbackEditorialImageForCategory(category: string): string {
  switch (category) {
    case 'Economy':
    case 'Business':
      return '/src/assets/images/hero_climate_desk_1795430987467.jpg';
    case 'Technology':
      return '/src/assets/images/tech_science_screen_1795430986363.jpg';
    case 'Education':
      return '/src/assets/images/food_health_editorial_1795430987279.jpg';
    case 'Sports':
      return '/src/assets/images/sports_adventure_kayak_1795430986551.jpg';
    case 'Bangladesh National':
    case 'Politics':
    case 'International':
      return '/src/assets/images/world_summit_urban_1795430987551.jpg';
    default:
      return '/src/assets/images/urban_culture_cycling_1795430986750.jpg';
  }
}

function classifyEditorialCategory(
  title: string,
  link: string,
  xmlCategory: string,
  feedDefaultCategory: string
): string {
  const hay = `${link} ${xmlCategory} ${title}`.toLowerCase();
  if (/(\/sports\/|cricket|football|tigers|bcb|fifa|champions|ipl|bpl|match|tournament|athletics)/i.test(hay)) {
    return 'Sports';
  }
  if (/(\/tech|ai\b|nvidia|semiconductor|software|cyber|telecom|5g|startup|digital|apple|google)/i.test(hay)) {
    return 'Technology';
  }
  if (/(\/education|university|school|student|exam|campus|scholarship|du\b|buet\b)/i.test(hay)) {
    return 'Education';
  }
  if (/(\/entertainment|cinema|film|music|drama|festival|actor|actress|arts|culture|concert)/i.test(hay)) {
    return 'Entertainment';
  }
  if (/(\/economy|taka|remittance|inflation|bangladesh bank|imf|budget|export|gdp|garment|rmg|tariff)/i.test(hay)) {
    return 'Economy';
  }
  if (/(\/business|market|stock|dse|trade|bank|corporate|industry|port|shares|ceo)/i.test(hay)) {
    return 'Business';
  }
  if (/(\/politics|parliament|election|cabinet|minister|government|policy|diplomacy|reform|senate|congress)/i.test(hay)) {
    return 'Politics';
  }
  if (/(\/bangladesh|dhaka|chattogram|sylhet|rajshahi|khulna|padma|metro rail|prothomalo|thedailystar|dhakatribune|ekattor|channelionline|jagonews24|banglatribune)/i.test(hay)) {
    return 'Bangladesh National';
  }
  if (/(\/international|\/world|un\b|global|europe|middle east|washington|beijing|delhi|ukraine|libya|gaza)/i.test(hay)) {
    return 'International';
  }
  return feedDefaultCategory;
}

function isUsableEditorialImage(raw: string): boolean {
  if (!raw || !/^https?:\/\//i.test(raw)) return false;
  if (/(\/1x1|spacer|pixel\.|doubleclick|googlesyndication|scorecardresearch|gravatar\.com)/i.test(raw)) {
    return false;
  }
  return true;
}

function parseRssXmlItems(
  xml: string,
  sourceName: string,
  feedCategory: string,
  feedId: string,
  feedIndex: number
): Array<Record<string, unknown>> {
  const items: Array<Record<string, unknown>> = [];
  const rssMatches = xml.match(/<item\b[\s\S]*?<\/item>/gi) || [];
  const atomMatches = rssMatches.length === 0 ? xml.match(/<entry\b[\s\S]*?<\/entry>/gi) || [] : [];
  const itemMatches = rssMatches.length > 0 ? rssMatches : atomMatches;

  for (let i = 0; i < Math.min(4, itemMatches.length); i++) {
    const block = itemMatches[i];
    const titleRaw = block.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
    const linkRaw =
      block.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ||
      block.match(/<link\b[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
      '';
    const descRaw =
      block.match(/<description\b[^>]*>([\s\S]*?)<\/description>/i)?.[1] ||
      block.match(/<summary\b[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ||
      '';
    const contentEncodedRaw =
      block.match(/<content:encoded\b[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] ||
      block.match(/<content\b[^>]*>([\s\S]*?)<\/content>/i)?.[1] ||
      '';
    const pubRaw =
      block.match(/<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
      block.match(/<published\b[^>]*>([\s\S]*?)<\/published>/i)?.[1] ||
      block.match(/<updated\b[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ||
      block.match(/<dc:date\b[^>]*>([\s\S]*?)<\/dc:date>/i)?.[1] ||
      '';
    const catRaw = block.match(/<category\b[^>]*>([\s\S]*?)<\/category>/i)?.[1] || '';
    const authorRaw =
      block.match(/<atom:name>([\s\S]*?)<\/atom:name>/i)?.[1] ||
      block.match(/<author\b[^>]*>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i)?.[1] ||
      block.match(/<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i)?.[1] ||
      '';

    const mediaThumbCandidates = [
      block.match(/<media:content[^>]*\burl=["']([^"']+)["'](?![^>]*medium=["']video["'])/i)?.[1],
      block.match(/<media:thumbnail[^>]*\burl=["']([^"']+)["']/i)?.[1],
      block.match(/<enclosure[^>]*\burl=["']([^"']+)["'][^>]*type=["']image/i)?.[1],
      decodeHtmlEntities(descRaw.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || ''),
      decodeHtmlEntities(contentEncodedRaw.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || ''),
    ];
    const mediaThumb = mediaThumbCandidates.find((u) => isUsableEditorialImage(u || '')) || '';

    const enclosureVideo =
      block.match(/<media:content[^>]*\btype=["']video\/[^"']+["'][^>]*\burl=["']([^"']+)["']/i)?.[1] ||
      block.match(/<enclosure[^>]*\burl=["']([^"']+)["'][^>]*type=["']video/i)?.[1] ||
      '';

    let title = decodeHtmlEntities(titleRaw).slice(0, 210);
    // Clean Google News trailing " - SourceName" duplication if feed is already attributed to source
    title = title.replace(/\s+-\s+(CNN|Reuters|AP News|The Business Standard|BBC News)$/i, '').trim();
    const link = decodeHtmlEntities(linkRaw);
    const xmlCat = decodeHtmlEntities(catRaw);
    const bodyText = decodeHtmlEntities(contentEncodedRaw || descRaw);
    const excerpt = (decodeHtmlEntities(descRaw) || bodyText).slice(0, 440);
    if (title.length < 5) continue;

    // Filter obvious placeholder/stale articles > 30 days old on live streams
    const parsedTime = pubRaw && !Number.isNaN(Date.parse(pubRaw)) ? Date.parse(pubRaw) : Date.now();
    if (Date.now() - parsedTime > 1000 * 60 * 60 * 24 * 30) continue;

    const resolvedCategory = classifyEditorialCategory(title, link, xmlCat, feedCategory);

    const shortHash = crypto
      .createHash('md5')
      .update(`${feedId}:${link || title}`)
      .digest('hex')
      .slice(0, 8);
    const asciiSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 96);
    const cleanSlug = asciiSlug.length >= 6 ? `${asciiSlug}-${shortHash}` : `dispatch-${feedId}-${shortHash}`;

    const publishedIso = new Date(parsedTime).toISOString();
    const safeImg = mediaThumb || fallbackEditorialImageForCategory(resolvedCategory);

    const isBdSource =
      /Daily Star|Prothom Alo|Dhaka Tribune|Business Standard|Channel i|Ekattor|Jago News|Bangla Tribune/i.test(
        sourceName
      );

    const fullContent =
      bodyText.length >= 40
        ? `${bodyText.slice(0, 4000)}\n\nVerified live dispatch syndicated from ${sourceName}. Original reporting and attribution remain linked to the publisher.`
        : `${excerpt || title}\n\nVerified live dispatch syndicated from ${sourceName}.`;

    items.push({
      id: `live-${cleanSlug.slice(0, 64)}`,
      slug: cleanSlug,
      title,
      subtitle: `${sourceName} · ${resolvedCategory} Desk`,
      excerpt: excerpt.length >= 10 ? excerpt : `${title} — Live dispatch from ${sourceName}.`,
      content: fullContent,
      category: resolvedCategory,
      status: 'published',
      authorId: 'wire-desk',
      authorName: decodeHtmlEntities(authorRaw) || sourceName,
      imageUrl: safeImg,
      ...(enclosureVideo && /^https?:\/\//i.test(enclosureVideo) ? { videoUrl: enclosureVideo } : {}),
      locationName: isBdSource
        ? 'Dhaka, Bangladesh'
        : /Al Jazeera/i.test(sourceName)
          ? 'Doha / Global'
          : /CNN|AP|NPR|CNBC|New York/i.test(sourceName)
            ? 'New York / Washington'
            : /DW/i.test(sourceName)
              ? 'Berlin / Europe'
              : /France 24/i.test(sourceName)
                ? 'Paris / Europe'
                : 'London / Global',
      lat: isBdSource ? 23.8103 : 51.5074,
      lng: isBdSource ? 90.4125 : -0.1278,
      isBreaking: i === 0 && feedIndex < 10,
      isTrending: i < 2,
      isFeatured: i === 0 && (isBdSource || feedIndex < 12),
      isEditorsPick: i === 1 && feedIndex < 10,
      isSpecialReport: i === 2 && feedIndex < 8,
      sourceName,
      sourceUrl: /^https?:\/\//i.test(link) ? link : '',
      views: 0,
      likesCount: 0,
      commentsCount: 0,
      publishedAt: publishedIso,
      displayDate: new Date(publishedIso).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      }),
      readMinutes: Math.max(2, Math.ceil(fullContent.split(/\s+/).length / 180)),
      language: 'en',
    });
  }
  return items;
}

let cachedLiveNews: { fetchedAt: number; items: Array<Record<string, unknown>> } | null = null;
const LIVE_NEWS_CACHE_TTL_MS = 2 * 60_000;

async function fetchLiveVerifiedNews(forceRefresh = false): Promise<Array<Record<string, unknown>>> {
  if (!forceRefresh && cachedLiveNews && Date.now() - cachedLiveNews.fetchedAt < LIVE_NEWS_CACHE_TTL_MS) {
    return cachedLiveNews.items;
  }

  const store = readCmsStore();
  const activeFeeds = store.rssFeeds.filter((f) => f.enabled);
  const perFeedBuckets: Array<Array<Record<string, unknown>>> = [];

  await Promise.allSettled(
    activeFeeds.map(async (feed, idx) => {
      const safeUrl = isSafeExternalFeedUrl(feed.url);
      if (!safeUrl) return;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      try {
        const resp = await fetch(safeUrl.toString(), {
          signal: controller.signal,
          headers: { 'User-Agent': 'BinduzNewsroomBot/1.0 (+https://binduz.news)' },
        });
        if (!resp.ok) return;
        const xml = await resp.text();
        const parsed = parseRssXmlItems(xml, feed.name, feed.category, feed.id, idx);
        if (parsed.length > 0) {
          perFeedBuckets.push(parsed);
        }
      } catch {
        // Skip slow or unreachable feed cleanly
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  // Interleave items round-robin across feeds so national & international outlets share visibility, then sort chronologically
  const aggregated: Array<Record<string, unknown>> = [];
  const seenIds = new Set<string>();
  const seenTitles = new Set<string>();
  for (let round = 0; round < 4; round++) {
    for (const bucket of perFeedBuckets) {
      const candidate = bucket[round];
      if (!candidate) continue;
      const id = String(candidate.id);
      const normTitle = String(candidate.title || '').toLowerCase().slice(0, 70);
      if (seenIds.has(id) || seenTitles.has(normTitle)) continue;
      seenIds.add(id);
      seenTitles.add(normTitle);
      aggregated.push(candidate);
    }
  }

  // Optional NewsAPI.org integration if NEWS_API_KEY secret is configured
  const newsApiKey = (process.env.NEWS_API_KEY || '').trim();
  if (newsApiKey) {
    try {
      const resp = await fetch(
        `https://newsapi.org/v2/top-headlines?language=en&pageSize=6&apiKey=${encodeURIComponent(newsApiKey)}`
      );
      if (resp.ok) {
        const json = (await resp.json()) as {
          articles?: Array<{
            title?: string;
            description?: string;
            content?: string;
            url?: string;
            urlToImage?: string;
            publishedAt?: string;
            source?: { name?: string };
          }>;
        };
        (json.articles || []).forEach((art, idx) => {
          if (!art.title || art.title === '[Removed]') return;
          const slug =
            art.title
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .trim()
              .replace(/\s+/g, '-')
              .slice(0, 110) || `newsapi-${idx}`;
          const artId = `newsapi-${slug.slice(0, 56)}`;
          if (seenIds.has(artId)) return;
          seenIds.add(artId);
          aggregated.push({
            id: artId,
            slug,
            title: art.title.slice(0, 210),
            subtitle: `${art.source?.name || 'NewsAPI Wire'} Live Headline`,
            excerpt: (art.description || art.title).slice(0, 500),
            content: `${art.description || art.title}\n\n${(art.content || '').replace(/\[\+\d+\s+chars\]/, '').trim()}`,
            category: 'Business',
            status: 'published',
            authorId: 'newsapi-wire',
            authorName: art.source?.name || 'NewsAPI Wire',
            imageUrl:
              art.urlToImage && /^https?:\/\//i.test(art.urlToImage)
                ? art.urlToImage
                : fallbackEditorialImageForCategory('Business'),
            isBreaking: idx === 0,
            isTrending: true,
            isFeatured: idx < 2,
            sourceName: art.source?.name || 'NewsAPI',
            sourceUrl: art.url || '',
            views: 0,
            likesCount: 0,
            commentsCount: 0,
            publishedAt: art.publishedAt || new Date().toISOString(),
            language: 'en',
          });
        });
      }
    } catch {
      // ignore optional external wire error
    }
  }

  // Sort chronologically newest first and cap at 96 dispatches
  aggregated.sort(
    (a, b) => Date.parse(String(b.publishedAt || '')) - Date.parse(String(a.publishedAt || ''))
  );
  const finalItems = aggregated.slice(0, 96);

  cachedLiveNews = { fetchedAt: Date.now(), items: finalItems };
  return finalItems;
}

const BUREAUS_COORDS = [
  { id: 'dhaka', city: 'Dhaka', lat: 23.8103, lng: 90.4125 },
  { id: 'chattogram', city: 'Chattogram', lat: 22.3569, lng: 91.7832 },
  { id: 'sylhet', city: 'Sylhet', lat: 24.8949, lng: 91.8687 },
  { id: 'rajshahi', city: 'Rajshahi', lat: 24.3745, lng: 88.6042 },
  { id: 'london', city: 'London', lat: 51.5074, lng: -0.1278 },
  { id: 'singapore', city: 'Singapore', lat: 1.3521, lng: 103.8198 },
  { id: 'new-york', city: 'New York', lat: 40.7128, lng: -74.006 },
];

let cachedWeather: { fetchedAt: number; data: Record<string, { tempC: string; tempF: string }> } | null = null;

// --- Base URL & SEO/AI Crawler Generators ---
function getBaseUrl(req: Request): string {
  if (process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL') {
    return process.env.APP_URL.replace(/\/+$/, '');
  }
  const proto = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
  const host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
  return `${proto}://${host}`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function getDynamicSeoStories() {
  const store = readCmsStore();
  const cmsPublished = store.articles
    .filter((a) => a.status === 'published')
    .map((a) => ({
      slug: String(a.slug || a.id),
      title: String(a.title || ''),
      excerpt: String(a.excerpt || a.title || ''),
      category: String(a.category || 'Bangladesh National'),
      authorName: String(a.authorName || 'Binduz Newsroom'),
      publishedAt: String(a.publishedAt || new Date().toISOString()),
    }));
  const live = await fetchLiveVerifiedNews(false);
  const liveMapped = live.slice(0, 20).map((a) => ({
    slug: String(a.slug || a.id),
    title: String(a.title || ''),
    excerpt: String(a.excerpt || a.title || ''),
    category: String(a.category || 'Bangladesh National'),
    authorName: String(a.authorName || 'Binduz Wire Desk'),
    publishedAt: String(a.publishedAt || new Date().toISOString()),
  }));
  const seen = new Set<string>();
  return [...cmsPublished, ...liveMapped].filter((s) => {
    if (!s.slug || seen.has(s.slug)) return false;
    seen.add(s.slug);
    return true;
  });
}

function buildRobotsTxt(baseUrl: string): string {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    '',
    '# AI Search & Generative Engine Crawlers',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    'User-agent: ChatGPT-User',
    'Allow: /',
    'User-agent: Google-Extended',
    'Allow: /',
    'User-agent: ClaudeBot',
    'Allow: /',
    'User-agent: PerplexityBot',
    'Allow: /',
    'User-agent: Grok',
    'Allow: /',
    'User-agent: Googlebot-News',
    'Allow: /',
    '',
    `Sitemap: ${baseUrl}/sitemap.xml`,
    `Sitemap: ${baseUrl}/news-sitemap.xml`,
    `RSS: ${baseUrl}/rss.xml`,
    `LLMs: ${baseUrl}/llms.txt`,
  ].join('\n');
}

async function buildLlmsTxt(baseUrl: string): Promise<string> {
  const stories = await getDynamicSeoStories();
  const store = readCmsStore();
  const pages = store.pages.filter((p) => p.status === 'published');
  const storyLines = stories
    .slice(0, 15)
    .map((s) => `- [${s.title}](${baseUrl}/?article=${s.slug}) (${s.category}, ${s.publishedAt.slice(0, 10)})`);
  const pageLines = pages.map(
    (p) => `- [${String(p.title)}](${baseUrl}/?page=${String(p.slug)})`
  );

  return [
    '# Binduz Newspaper — Bangladesh & International Edition',
    '',
    '> Independent digital newspaper delivering verified reporting across Bangladesh national affairs, politics, economy, business, technology, sports, entertainment, education, and international news.',
    '',
    '## Editorial Standards & Newsroom Endpoints',
    '- Schema: Schema.org NewsMediaOrganization & NewsArticle JSON-LD embedded per dispatch',
    `- Canonical Root: ${baseUrl}/`,
    `- RSS 2.0 Syndication: ${baseUrl}/rss.xml`,
    `- JSON Feed Endpoint: ${baseUrl}/api/public/feeds.json`,
    `- News XML Sitemap: ${baseUrl}/news-sitemap.xml`,
    '',
    '## Editorial Desks',
    `- [Bangladesh National, Politics & Economy Edition](${baseUrl}/)`,
    ...pageLines,
    '',
    '## Live Published Dispatches',
    ...storyLines,
    '',
  ].join('\n');
}

async function buildRssFeedXml(baseUrl: string): Promise<string> {
  const stories = await getDynamicSeoStories();
  const itemsXml = stories.slice(0, 25).map(
    (s) => `  <item>
    <title>${escapeXml(s.title)}</title>
    <link>${escapeXml(baseUrl)}/?article=${escapeXml(s.slug)}</link>
    <guid isPermaLink="true">${escapeXml(baseUrl)}/?article=${escapeXml(s.slug)}</guid>
    <category>${escapeXml(s.category)}</category>
    <pubDate>${new Date(s.publishedAt).toUTCString()}</pubDate>
    <description>${escapeXml(s.excerpt)}</description>
  </item>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0">\n<channel>\n  <title>Binduz Newspaper — Bangladesh &amp; International Wire</title>\n  <link>${escapeXml(baseUrl)}/</link>\n  <description>Live verified news dispatches across Bangladesh national affairs, politics, economy, business, technology, sports, entertainment, education, and world news.</description>\n  <language>en</language>\n${itemsXml.join('\n')}\n</channel>\n</rss>`;
}

async function buildSitemapXml(baseUrl: string): Promise<string> {
  const stories = await getDynamicSeoStories();
  const store = readCmsStore();
  const pages = store.pages.filter((p) => p.status === 'published');
  const urls = [
    `<url><loc>${escapeXml(baseUrl)}/</loc><changefreq>hourly</changefreq><priority>1.0</priority></url>`,
    ...pages.map(
      (p) =>
        `<url><loc>${escapeXml(baseUrl)}/?page=${escapeXml(String(p.slug))}</loc><changefreq>weekly</changefreq><priority>0.75</priority></url>`
    ),
    ...stories.map(
      (s) =>
        `<url><loc>${escapeXml(baseUrl)}/?article=${escapeXml(s.slug)}</loc><lastmod>${escapeXml(s.publishedAt)}</lastmod><changefreq>daily</changefreq><priority>0.85</priority></url>`
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  ${urls.join('\n  ')}\n</urlset>`;
}

async function buildNewsSitemapXml(baseUrl: string): Promise<string> {
  const stories = await getDynamicSeoStories();
  const items = stories.slice(0, 25).map(
    (s) => `  <url>
    <loc>${escapeXml(baseUrl)}/?article=${escapeXml(s.slug)}</loc>
    <news:news>
      <news:publication>
        <news:name>Binduz Newspaper</news:name>
        <news:language>en</news:language>
      </news:publication>
      <news:publication_date>${escapeXml(s.publishedAt)}</news:publication_date>
      <news:title>${escapeXml(s.title)}</news:title>
    </news:news>
  </url>`
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">\n${items.join('\n')}\n</urlset>`;
}

// --- Public SEO / Crawler / Newsroom Routes ---
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(buildRobotsTxt(getBaseUrl(req)));
});

app.get('/llms.txt', async (req, res) => {
  res.type('text/markdown; charset=utf-8').send(await buildLlmsTxt(getBaseUrl(req)));
});

app.get('/rss.xml', async (req, res) => {
  res.type('application/rss+xml; charset=utf-8').send(await buildRssFeedXml(getBaseUrl(req)));
});

app.get('/sitemap.xml', async (req, res) => {
  res.type('application/xml').send(await buildSitemapXml(getBaseUrl(req)));
});

app.get('/news-sitemap.xml', async (req, res) => {
  res.type('application/xml').send(await buildNewsSitemapXml(getBaseUrl(req)));
});

app.get('/api/public/feeds.json', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  const stories = await getDynamicSeoStories();
  res.json({
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Binduz Newspaper — Bangladesh & International Edition',
    home_page_url: `${baseUrl}/`,
    feed_url: `${baseUrl}/api/public/feeds.json`,
    items: stories.map((s) => ({
      id: s.slug,
      url: `${baseUrl}/?article=${s.slug}`,
      title: s.title,
      summary: s.excerpt,
      category: s.category,
      author: { name: s.authorName },
      date_published: s.publishedAt,
    })),
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'binduz-newspaper', timestamp: new Date().toISOString() });
});

// --- Private Admin Passcode Auth Endpoints ---
app.get('/api/admin/auth-status', (_req, res) => {
  const envConfigured = getEnvPasscode().length > 0;
  const claimed = Boolean(readStoredAdminSecret());
  res.json({ envConfigured, claimed });
});

app.post('/api/admin/claim', (req, res) => {
  if (getEnvPasscode().length > 0) {
    res.status(403).json({ error: 'Admin passcode is managed by server environment configuration.' });
    return;
  }
  if (readStoredAdminSecret()) {
    res.status(409).json({ error: 'Admin passcode has already been claimed.' });
    return;
  }
  const { passcode } = req.body ?? {};
  if (typeof passcode !== 'string' || passcode.trim().length < 8 || passcode.length > 128) {
    res.status(400).json({ error: 'Passcode must be between 8 and 128 characters.' });
    return;
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = hashPasscode(passcode.trim(), salt);
  fs.writeFileSync(
    ADMIN_SECRET_FILE,
    JSON.stringify({ salt, hash, claimedAt: new Date().toISOString() }, null, 2),
    'utf8'
  );
  const session = issueAdminBearerToken('admin-passcode');
  res.json({ token: session.token, expiresAt: session.expiresAt, role: 'Super Admin' });
});

app.post('/api/admin/login', (req, res) => {
  const { passcode } = req.body ?? {};
  if (typeof passcode !== 'string' || passcode.length < 4) {
    res.status(400).json({ error: 'Please provide your private admin passcode.' });
    return;
  }
  if (!verifyPasscodeMatch(passcode.trim())) {
    res.status(401).json({ error: 'Invalid admin passcode.' });
    return;
  }
  const session = issueAdminBearerToken('admin-passcode');
  res.json({ token: session.token, expiresAt: session.expiresAt, role: 'Super Admin' });
});

// --- Live Verified Journalism Feeds & Weather ---
app.get('/api/news/live', async (req, res) => {
  const force = req.query.refresh === '1';
  const items = await fetchLiveVerifiedNews(force);
  const store = readCmsStore();
  res.json({
    items,
    feeds: store.rssFeeds,
    fetchedAt: new Date().toISOString(),
  });
});

app.get('/api/weather/live', async (_req, res) => {
  if (cachedWeather && Date.now() - cachedWeather.fetchedAt < 10 * 60_000) {
    res.json({ bureaus: cachedWeather.data, fetchedAt: new Date(cachedWeather.fetchedAt).toISOString() });
    return;
  }
  const result: Record<string, { tempC: string; tempF: string }> = {};
  await Promise.allSettled(
    BUREAUS_COORDS.map(async (b) => {
      try {
        const resp = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${b.lat}&longitude=${b.lng}&current_weather=true`
        );
        if (!resp.ok) return;
        const json = (await resp.json()) as { current_weather?: { temperature?: number } };
        const c = json.current_weather?.temperature;
        if (typeof c === 'number') {
          const f = (c * 9) / 5 + 32;
          result[b.id] = { tempC: `${c.toFixed(1)} °C`, tempF: `${f.toFixed(1)} °F` };
        }
      } catch {
        // leave bureau temperature omitted cleanly if offline
      }
    })
  );
  cachedWeather = { fetchedAt: Date.now(), data: result };
  res.json({ bureaus: result, fetchedAt: new Date().toISOString() });
});

// --- Server CMS State & Authenticated Mutations ---
app.get('/api/cms/state', (_req, res) => {
  const store = readCmsStore();
  res.json({
    articles: store.articles.filter((a) => a.status === 'published'),
    pages: store.pages.filter((p) => p.status === 'published'),
    homepageSections: store.homepageSections,
    navigationItems: store.navigationItems,
    mediaAssets: store.mediaAssets,
    campaigns: store.campaigns.filter((c) => c.status === 'active'),
    rolePermissions: store.rolePermissions,
    siteSettings: store.siteSettings,
    rssFeeds: store.rssFeeds,
  });
});

app.get('/api/cms/admin-state', async (req, res) => {
  const staff = await verifyAnyAuthorizedStaff(req);
  if (!staff) {
    res.status(401).json({ error: 'Authorized staff or admin session required.' });
    return;
  }
  const store = readCmsStore();
  res.json(store);
});

app.post('/api/cms/mutate', async (req, res) => {
  const staff = await verifyAnyAuthorizedStaff(req);
  if (!staff) {
    res.status(401).json({ error: 'Authorized staff or admin session required.' });
    return;
  }

  const { action, payload } = req.body ?? {};
  const store = readCmsStore();
  const nowIso = new Date().toISOString();

  if (action === 'save_article' && payload && typeof payload === 'object') {
    const art = payload as Record<string, unknown>;
    const id = String(art.id || `art-${Date.now()}`);
    const idx = store.articles.findIndex((a) => a.id === id);
    const saved: Record<string, unknown> = { ...art, id, updatedAt: nowIso, createdAt: art.createdAt || nowIso };
    if (idx >= 0) store.articles[idx] = saved;
    else store.articles.unshift(saved);

    // Record revision snapshot
    const revList = store.revisions[id] || [];
    revList.unshift({
      id: `rev-${Date.now()}`,
      articleId: id,
      title: saved.title,
      excerpt: saved.excerpt,
      content: saved.content,
      status: saved.status,
      editorId: staff.id,
      editorName: String(saved.authorName || 'Newsroom Editor'),
      changeSummary: idx >= 0 ? 'Editorial update' : 'Initial draft',
      createdAt: nowIso,
    });
    store.revisions[id] = revList.slice(0, 25);
  } else if (action === 'delete_article' && payload?.id) {
    store.articles = store.articles.filter((a) => a.id !== payload.id);
  } else if (action === 'save_page' && payload && typeof payload === 'object') {
    const page = payload as Record<string, unknown>;
    const id = String(page.id || `page-${Date.now()}`);
    const idx = store.pages.findIndex((p) => p.id === id);
    const saved: Record<string, unknown> = { ...page, id, updatedAt: nowIso, createdAt: page.createdAt || nowIso };
    if (idx >= 0) store.pages[idx] = saved;
    else store.pages.unshift(saved);

    const revList = store.revisions[`page_${id}`] || [];
    revList.unshift({
      id: `rev-${Date.now()}`,
      pageId: id,
      title: saved.title,
      status: saved.status,
      blocks: saved.blocks || [],
      editorId: staff.id,
      editorName: String(saved.authorName || 'CMS Editor'),
      createdAt: nowIso,
    });
    store.revisions[`page_${id}`] = revList.slice(0, 25);
  } else if (action === 'delete_page' && payload?.id) {
    store.pages = store.pages.filter((p) => p.id !== payload.id);
  } else if (action === 'save_homepage_sections' && Array.isArray(payload?.sections)) {
    store.homepageSections = payload.sections;
  } else if (action === 'save_navigation' && Array.isArray(payload?.items)) {
    store.navigationItems = payload.items;
  } else if (action === 'save_settings' && payload && typeof payload === 'object') {
    store.siteSettings = { ...payload, updatedBy: staff.id, updatedAt: nowIso };
  } else if (action === 'save_media' && payload && typeof payload === 'object') {
    const m = payload as Record<string, unknown>;
    const id = String(m.id || `media-${Date.now()}`);
    const idx = store.mediaAssets.findIndex((x) => x.id === id);
    const saved = { ...m, id, updatedAt: nowIso, createdAt: m.createdAt || nowIso };
    if (idx >= 0) store.mediaAssets[idx] = saved;
    else store.mediaAssets.unshift(saved);
  } else if (action === 'delete_media' && payload?.id) {
    store.mediaAssets = store.mediaAssets.filter((m) => m.id !== payload.id);
  } else if (action === 'save_campaign' && payload && typeof payload === 'object') {
    const c = payload as Record<string, unknown>;
    const id = String(c.id || `camp-${Date.now()}`);
    const idx = store.campaigns.findIndex((x) => x.id === id);
    const saved = { ...c, id, updatedAt: nowIso, createdAt: c.createdAt || nowIso };
    if (idx >= 0) store.campaigns[idx] = saved;
    else store.campaigns.unshift(saved);
  } else if (action === 'save_role_permissions' && Array.isArray(payload?.roles)) {
    store.rolePermissions = payload.roles;
  } else if (action === 'save_rss_feeds' && Array.isArray(payload?.feeds)) {
    const validated: ServerCmsStore['rssFeeds'] = [];
    for (const f of payload.feeds) {
      if (f && typeof f.url === 'string' && isSafeExternalFeedUrl(f.url)) {
        validated.push({
          id: String(f.id || `feed-${Date.now()}`),
          name: String(f.name || 'Verified RSS Feed').slice(0, 80),
          url: f.url,
          category: String(f.category || 'Business').slice(0, 40),
          enabled: Boolean(f.enabled),
        });
      }
    }
    store.rssFeeds = validated;
    cachedLiveNews = null;
  } else {
    res.status(400).json({ error: 'Unsupported CMS mutation action.' });
    return;
  }

  store.auditLogs.unshift({
    id: `log-${Date.now()}`,
    actorId: staff.id,
    actorRole: staff.isAdmin ? 'Super Admin' : 'Editorial Staff',
    action: String(action).toUpperCase(),
    targetType: 'cms',
    targetId: String(payload?.id || 'global'),
    details: `Executed ${action}`,
    createdAt: nowIso,
  });
  store.auditLogs = store.auditLogs.slice(0, 100);

  writeCmsStore(store);
  res.json({ ok: true, store });
});

app.get('/api/public/seo-preview', async (req, res) => {
  const baseUrl = getBaseUrl(req);
  res.json({
    baseUrl,
    robotsTxt: buildRobotsTxt(baseUrl),
    llmsTxt: await buildLlmsTxt(baseUrl),
    sitemapXml: await buildSitemapXml(baseUrl),
    newsSitemapXml: await buildNewsSitemapXml(baseUrl),
  });
});

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Server-side AI SEO & GEO Optimization Endpoint
app.post('/api/ai/optimize-seo', async (req, res) => {
  const staff = await verifyAnyAuthorizedStaff(req);
  if (!staff) {
    res.status(401).json({ error: 'Sign in with a verified account or admin passcode to run AI SEO & GEO optimization.' });
    return;
  }

  const { title, excerpt, content, category } = req.body ?? {};
  if (
    typeof title !== 'string' ||
    typeof content !== 'string' ||
    title.trim().length < 5 ||
    content.trim().length < 20
  ) {
    res.status(400).json({ error: 'Article title and content are required for SEO/GEO analysis.' });
    return;
  }

  const ai = createGeminiClient();
  if (!ai) {
    res.status(503).json({ error: 'Gemini API key is not configured in server secrets.' });
    return;
  }

  try {
    const prompt = [
      'Analyze this news article for Technical SEO, Google News / Google Discover eligibility, and Generative Engine Optimization (ChatGPT, Gemini, Claude, Grok).',
      `Category: ${String(category || 'General').slice(0, 60)}`,
      `Title: ${title.slice(0, 220)}`,
      `Excerpt: ${String(excerpt || '').slice(0, 600)}`,
      `Body: ${content.slice(0, 8000)}`,
    ].join('\n\n');

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction:
          'You are a senior News SEO and Generative Engine Optimization (GEO) architect. Return concise, high-signal, citation-ready structured metadata with no fluff.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            seoTitle: { type: Type.STRING, description: 'Search title under 60 characters.' },
            seoDescription: { type: Type.STRING, description: 'Meta description 120-160 characters.' },
            focusKeywords: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Up to 6 semantic focus keywords.',
            },
            entities: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Named entities (organizations, places, concepts) for knowledge graphs.',
            },
            aiSummary: {
              type: Type.STRING,
              description: 'Citation-friendly 2-3 sentence executive summary for AI answer engines.',
            },
            faqPairs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING },
                },
              },
            },
            geoRecommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '3 concrete recommendations to improve Discover & AI engine visibility.',
            },
            discoverReadinessScore: {
              type: Type.INTEGER,
              description: 'Score 1-100 reflecting headline clarity, entity density, and citation structure.',
            },
          },
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    console.error('AI SEO optimization failed:', err);
    res.status(502).json({ error: 'Unable to complete AI SEO optimization right now.' });
  }
});

// Server-side AI Citation Briefing for Readers
app.post('/api/ai/briefing', async (req, res) => {
  const { title, content, category } = req.body ?? {};
  if (typeof title !== 'string' || typeof content !== 'string' || content.trim().length < 20) {
    res.status(400).json({ error: 'Valid article title and content are required.' });
    return;
  }
  const ai = createGeminiClient();
  if (!ai) {
    res.status(503).json({ error: 'Gemini API key is not configured in server secrets.' });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Category: ${String(category || 'News').slice(0, 60)}\nHeadline: ${title.slice(0, 220)}\n\nArticle:\n${content.slice(0, 7000)}`,
      config: {
        systemInstruction:
          'Produce a neutral journalistic executive briefing with key takeaways, entities, and a one-line academic/AI citation note.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
            entities: { type: Type.ARRAY, items: { type: Type.STRING } },
            citationLine: { type: Type.STRING },
          },
        },
      },
    });
    res.json(JSON.parse((response.text ?? '{}').trim()));
  } catch (err) {
    console.error('AI briefing failed:', err);
    res.status(502).json({ error: 'Unable to generate AI briefing right now.' });
  }
});

// Server-side Multilingual Translation
app.post('/api/ai/translate', async (req, res) => {
  const { title, excerpt, content, targetLanguage } = req.body ?? {};
  const allowedLangs: Record<string, string> = {
    en: 'English',
    es: 'Spanish',
    fr: 'French',
    de: 'German',
    ja: 'Japanese',
  };
  const langName = allowedLangs[String(targetLanguage)];
  if (!langName || typeof title !== 'string' || typeof content !== 'string') {
    res.status(400).json({ error: 'Valid targetLanguage and article fields are required.' });
    return;
  }
  const ai = createGeminiClient();
  if (!ai) {
    res.status(503).json({ error: 'Gemini API key is not configured in server secrets.' });
    return;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: `Translate this journalistic dispatch into natural, publication-grade ${langName}.\n\nTitle: ${title.slice(0, 220)}\nExcerpt: ${String(excerpt || '').slice(0, 600)}\nContent: ${content.slice(0, 6000)}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            excerpt: { type: Type.STRING },
            content: { type: Type.STRING },
          },
        },
      },
    });
    res.json(JSON.parse((response.text ?? '{}').trim()));
  } catch (err) {
    console.error('AI translation failed:', err);
    res.status(502).json({ error: 'Unable to translate article right now.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Binduz Newspaper CMS server listening on http://0.0.0.0:${PORT}`);
    // Pre-warm live RSS cache and auto-update national & international dispatches every 2 minutes
    void fetchLiveVerifiedNews(true).catch(() => {});
    setInterval(() => {
      void fetchLiveVerifiedNews(true).catch(() => {});
    }, LIVE_NEWS_CACHE_TTL_MS);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Binduz server:', err);
  process.exit(1);
});
