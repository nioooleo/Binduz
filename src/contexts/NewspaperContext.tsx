import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  clampString,
  db,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  sanitizeSlug,
  testConnection,
} from '../lib/firebase';
import {
  DEFAULT_HOMEPAGE_SECTIONS,
  DEFAULT_NAVIGATION_ITEMS,
  DEFAULT_SITE_SETTINGS,
  I18N_DICT,
  LOCAL_EDITORIAL_MEDIA,
  NEWS_BUREAUS,
} from '../data/seedArticles';
import {
  ActiveView,
  AdCampaign,
  ALL_ROLES,
  Article,
  ArticleRevision,
  ArticleStatus,
  AuditLogItem,
  BookmarkItem,
  BureauLocation,
  CategoryName,
  CmsPage,
  CommentItem,
  HomepageSection,
  LanguageCode,
  MediaAsset,
  NavigationItem,
  ROLE_PERMISSIONS,
  RoleName,
  RolePermissionConfig,
  RolePermissionSet,
  RssFeedSource,
  SiteSettings,
  UserPublicProfile,
  WebVitalsSnapshot,
} from '../types/newspaper';

const SUPER_ADMIN_EMAIL = 'nioooleo@gmail.com';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

interface NewspaperContextValue {
  user: User | null;
  authReady: boolean;
  adminToken: string | null;
  adminAuthStatus: { envConfigured: boolean; claimed: boolean };
  actualRole: RoleName;
  effectiveRole: RoleName;
  permissions: RolePermissionSet;
  rolePermissionMatrix: RolePermissionConfig[];
  isStaffAuthenticated: boolean;
  signInWithGoogle: () => Promise<void>;
  loginWithAdminPasscode: (passcode: string) => Promise<{ ok: boolean; error?: string }>;
  claimAdminPasscode: (passcode: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;

  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  activePageSlug: string | null;
  openCustomPage: (slug: string) => void;
  visualEditMode: boolean;
  setVisualEditMode: (on: boolean) => void;

  selectedCategory: CategoryName | 'All';
  setSelectedCategory: (cat: CategoryName | 'All') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  followedTopics: CategoryName[];
  toggleFollowedTopic: (cat: CategoryName) => void;

  articles: Article[];
  publishedArticles: Article[];
  liveNewsLoading: boolean;
  lastLiveNewsUpdatedAt: string | null;
  refreshLiveNews: (force?: boolean) => Promise<void>;
  activeArticle: Article | null;
  openArticle: (article: Article) => void;
  closeArticle: () => void;

  pages: CmsPage[];
  publishedPages: CmsPage[];
  homepageSections: HomepageSection[];
  navigationItems: NavigationItem[];
  bureaus: BureauLocation[];
  rssFeeds: RssFeedSource[];

  bookmarks: BookmarkItem[];
  isBookmarked: (articleId: string) => boolean;
  toggleBookmark: (article: Article) => Promise<void>;
  bookmarksDrawerOpen: boolean;
  setBookmarksDrawerOpen: (open: boolean) => void;

  likedArticleIds: string[];
  toggleLikeArticle: (article: Article) => Promise<void>;

  mediaAssets: MediaAsset[];
  campaigns: AdCampaign[];
  staffProfiles: UserPublicProfile[];
  privateUsers: Array<{ uid: string; email: string; role: RoleName }>;
  auditLogs: AuditLogItem[];
  siteSettings: SiteSettings;

  darkMode: boolean;
  toggleDarkMode: () => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (typeof I18N_DICT)['en'];

  notifications: NotificationItem[];
  unreadCount: number;
  markAllNotificationsRead: () => void;
  pushToast: (title: string, message: string) => void;
  toastQueue: Array<{ id: string; title: string; message: string }>;

  webVitals: WebVitalsSnapshot;
  selectedBureauId: string;
  setSelectedBureauId: (id: string) => void;

  saveArticle: (draft: Partial<Article>, isNew?: boolean, changeSummary?: string) => Promise<Article | null>;
  transitionArticleStatus: (article: Article, nextStatus: ArticleStatus) => Promise<void>;
  deleteArticle: (articleId: string) => Promise<void>;
  fetchArticleRevisions: (articleId: string) => Promise<ArticleRevision[]>;

  savePage: (page: Partial<CmsPage>, isNew?: boolean) => Promise<CmsPage | null>;
  deletePage: (pageId: string) => Promise<void>;
  fetchPageRevisions: (pageId: string) => Promise<Array<Record<string, unknown>>>;

  saveHomepageSections: (sections: HomepageSection[]) => Promise<void>;
  saveNavigationItems: (items: NavigationItem[]) => Promise<void>;
  saveSiteSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  saveRolePermissions: (matrix: RolePermissionConfig[]) => Promise<void>;
  saveRssFeeds: (feeds: RssFeedSource[]) => Promise<void>;

  saveMediaAsset: (asset: Omit<MediaAsset, 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteMediaAsset: (assetId: string) => Promise<void>;
  saveCampaign: (campaign: Omit<AdCampaign, 'createdAt' | 'updatedAt'>) => Promise<void>;
  trackCampaignClick: (campaign: AdCampaign) => Promise<void>;
  subscribeNewsletter: (email: string, frequency?: 'daily' | 'weekly' | 'breaking') => Promise<boolean>;
  updateUserRole: (uid: string, role: RoleName) => Promise<void>;
  fetchArticleComments: (articleId: string) => Promise<CommentItem[]>;
  postComment: (articleId: string, content: string) => Promise<boolean>;
  moderateComment: (articleId: string, commentId: string, status: CommentItem['status']) => Promise<void>;
}

const NewspaperContext = createContext<NewspaperContextValue | null>(null);

function buildDefaultRoleMatrix(): RolePermissionConfig[] {
  return ALL_ROLES.map((roleName) => ({
    id: sanitizeId(`role-${roleName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`),
    roleName,
    ...ROLE_PERMISSIONS[roleName],
  }));
}

function sanitizeArticleForFirestore(
  article: Partial<Article> & {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: CategoryName;
    status: ArticleStatus;
    authorId: string;
    authorName: string;
    imageUrl: string;
  },
  existingCreatedAt?: unknown
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: sanitizeId(article.id),
    slug: sanitizeSlug(article.slug || article.title),
    title: clampString(article.title, 220, 'Untitled Dispatch'),
    excerpt: clampString(article.excerpt, 600, 'Editorial summary pending.'),
    content: clampString(article.content, 30000, 'Full dispatch body pending editorial review.'),
    category: article.category,
    status: article.status,
    authorId: sanitizeId(article.authorId),
    authorName: clampString(article.authorName, 80, 'Binduz Staff'),
    imageUrl: clampString(article.imageUrl, 600, '/src/assets/images/hero_climate_desk_1795430987467.jpg'),
    isBreaking: Boolean(article.isBreaking),
    isTrending: Boolean(article.isTrending),
    isFeatured: Boolean(article.isFeatured),
    isEditorsPick: Boolean(article.isEditorsPick),
    isSpecialReport: Boolean(article.isSpecialReport),
    views: Math.max(0, Math.floor(Number(article.views ?? 0))),
    likesCount: Math.max(0, Math.floor(Number(article.likesCount ?? 0))),
    commentsCount: Math.max(0, Math.floor(Number(article.commentsCount ?? 0))),
    language: article.language || 'en',
    createdAt: existingCreatedAt || serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (article.subtitle) payload.subtitle = clampString(article.subtitle, 320);
  if (article.videoUrl) payload.videoUrl = clampString(article.videoUrl, 600);
  if (article.audioUrl) payload.audioUrl = clampString(article.audioUrl, 600);
  if (article.locationName) payload.locationName = clampString(article.locationName, 120);
  if (typeof article.lat === 'number' && !Number.isNaN(article.lat)) payload.lat = article.lat;
  if (typeof article.lng === 'number' && !Number.isNaN(article.lng)) payload.lng = article.lng;
  if (article.sourceName) payload.sourceName = clampString(article.sourceName, 100);
  if (article.sourceUrl) payload.sourceUrl = clampString(article.sourceUrl, 500);
  if (article.seoTitle) payload.seoTitle = clampString(article.seoTitle, 120);
  if (article.seoDescription) payload.seoDescription = clampString(article.seoDescription, 240);
  if (Array.isArray(article.focusKeywords) && article.focusKeywords.length > 0) {
    payload.focusKeywords = article.focusKeywords.slice(0, 10).map((k) => clampString(k, 60));
  }
  if (article.aiSummary) payload.aiSummary = clampString(article.aiSummary, 1200);
  if (article.canonicalUrl) payload.canonicalUrl = clampString(article.canonicalUrl, 400);
  if (article.scheduledAt) payload.scheduledAt = clampString(article.scheduledAt, 64);
  if (article.publishedAt) payload.publishedAt = clampString(article.publishedAt, 64);

  return payload;
}

export function NewspaperProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [adminToken, setAdminToken] = useState<string | null>(null); // Strictly memory-only
  const [adminAuthStatus, setAdminAuthStatus] = useState({ envConfigured: false, claimed: false });
  const [actualRole, setActualRole] = useState<RoleName>('Guest');
  const [visualEditMode, setVisualEditMode] = useState(false);

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname === '/admin') return 'admin_login';
      if (new URLSearchParams(window.location.search).get('page')) return 'page';
    }
    return 'frontpage';
  });
  const [activePageSlug, setActivePageSlug] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('page');
    }
    return null;
  });

  const [selectedCategory, setSelectedCategory] = useState<CategoryName | 'All'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [followedTopics, setFollowedTopics] = useState<CategoryName[]>(() => {
    const valid = new Set<string>([
      'Bangladesh National', 'Politics', 'Economy', 'Business', 'Technology',
      'Sports', 'Entertainment', 'Education', 'International',
    ]);
    try {
      const raw = localStorage.getItem('binduz_followed_topics');
      const parsed = raw ? (JSON.parse(raw) as string[]) : [];
      const filtered = parsed.filter((c) => valid.has(c)) as CategoryName[];
      return filtered.length > 0 ? filtered : ['Bangladesh National', 'Economy', 'Technology'];
    } catch {
      return ['Bangladesh National', 'Economy', 'Technology'];
    }
  });

  // Real Live Wire Articles + Firestore Articles + Server CMS Articles
  const [liveWireArticles, setLiveWireArticles] = useState<Article[]>([]);
  const [liveNewsLoading, setLiveNewsLoading] = useState(true);
  const [lastLiveNewsUpdatedAt, setLastLiveNewsUpdatedAt] = useState<string | null>(null);
  const [remoteArticles, setRemoteArticles] = useState<Article[]>([]);
  const [serverArticles, setServerArticles] = useState<Article[]>([]);
  const [myDraftArticles, setMyDraftArticles] = useState<Article[]>([]);
  const [activeArticle, setActiveArticle] = useState<Article | null>(null);

  const [remotePages, setRemotePages] = useState<CmsPage[]>([]);
  const [serverPages, setServerPages] = useState<CmsPage[]>([]);
  const [homepageSections, setHomepageSections] = useState<HomepageSection[]>(DEFAULT_HOMEPAGE_SECTIONS);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>(DEFAULT_NAVIGATION_ITEMS);
  const [rolePermissionMatrix, setRolePermissionMatrix] = useState<RolePermissionConfig[]>(
    buildDefaultRoleMatrix()
  );
  const [rssFeeds, setRssFeeds] = useState<RssFeedSource[]>([]);

  const [bureaus, setBureaus] = useState<BureauLocation[]>(NEWS_BUREAUS);

  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(() => {
    try {
      const raw = localStorage.getItem('binduz_bookmarks');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [bookmarksDrawerOpen, setBookmarksDrawerOpen] = useState(false);

  const [likedArticleIds, setLikedArticleIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('binduz_likes');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(LOCAL_EDITORIAL_MEDIA);
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [staffProfiles, setStaffProfiles] = useState<UserPublicProfile[]>([]);
  const [privateUsers, setPrivateUsers] = useState<Array<{ uid: string; email: string; role: RoleName }>>([]);
  const [serverAuditLogs, setServerAuditLogs] = useState<AuditLogItem[]>([]);
  const [firestoreAuditLogs, setFirestoreAuditLogs] = useState<AuditLogItem[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('binduz_theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [language, setLanguageState] = useState<LanguageCode>(() => {
    try {
      const saved = localStorage.getItem('binduz_lang') as LanguageCode;
      return saved && I18N_DICT[saved] ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const [selectedBureauId, setSelectedBureauId] = useState<string>(NEWS_BUREAUS[0].id);
  const [toastQueue, setToastQueue] = useState<Array<{ id: string; title: string; message: string }>>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [webVitals, setWebVitals] = useState<WebVitalsSnapshot>({
    lcpMs: null,
    cls: 0,
    inpMs: null,
  });

  const pushToast = useCallback((title: string, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToastQueue((prev) => [...prev.slice(-2), { id, title, message }]);
    setNotifications((prev) => [
      { id, title, message, timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), read: false },
      ...prev.slice(0, 14),
    ]);
    setTimeout(() => {
      setToastQueue((prev) => prev.filter((item) => item.id !== id));
    }, 4500);
  }, []);

  // Helper to obtain authorization header from either Admin Passcode token or Firebase ID token
  const getAuthHeader = useCallback(async (): Promise<Record<string, string>> => {
    if (adminToken) return { Authorization: `Bearer ${adminToken}` };
    if (auth.currentUser) {
      const idTok = await auth.currentUser.getIdToken();
      return { Authorization: `Bearer ${idTok}` };
    }
    return {};
  }, [adminToken]);

  const normalizeLoadedSections = useCallback((rawSections: HomepageSection[]): HomepageSection[] => {
    const deduped = new globalThis.Map<string, HomepageSection>();
    rawSections.forEach((sec) => {
      if (sec.sectionType !== 'crawler_endpoints' && sec.id) {
        deduped.set(sec.id, sec);
      }
    });
    const cleaned = Array.from(deduped.values());
    if (cleaned.length > 0 && !cleaned.some((sec) => sec.sectionType === 'live_news')) {
      const liveDefault = DEFAULT_HOMEPAGE_SECTIONS.find((s) => s.sectionType === 'live_news');
      if (liveDefault) {
        const sorted = [...cleaned].sort((a, b) => a.orderIndex - b.orderIndex);
        sorted.splice(1, 0, liveDefault);
        return sorted.map((s, idx) => ({ ...s, orderIndex: idx }));
      }
    }
    return [...cleaned].sort((a, b) => a.orderIndex - b.orderIndex);
  }, []);

  const normalizeLoadedNavigation = useCallback((rawNav: NavigationItem[]): NavigationItem[] => {
    const removedViews = new Set(['frontpage', 'map', 'globe', 'seo', 'newsroom', 'admin_login']);
    const deduped = new globalThis.Map<string, NavigationItem>();
    rawNav.forEach((n) => {
      if (
        !(n.targetType === 'view' && removedViews.has(n.targetValue)) &&
        n.id !== 'nav-bd-national' &&
        n.label.trim().toLowerCase() !== 'bangladesh' &&
        n.id
      ) {
        deduped.set(n.id, n);
      }
    });
    const cleaned = Array.from(deduped.values());
    const hasArticles = cleaned.some(
      (n) => n.id === 'nav-articles' || n.label.trim().toLowerCase() === 'articles'
    );
    if (!hasArticles) {
      const articlesItem = DEFAULT_NAVIGATION_ITEMS.find((n) => n.id === 'nav-articles');
      if (articlesItem) {
        cleaned.unshift(articlesItem);
      }
    }
    return [...cleaned].sort((a, b) => a.orderIndex - b.orderIndex);
  }, []);

  const syncServerStoreIntoState = useCallback((s: Record<string, unknown>) => {
    if (Array.isArray(s.articles)) setServerArticles(s.articles as Article[]);
    if (Array.isArray(s.pages)) setServerPages(s.pages as CmsPage[]);
    if (Array.isArray(s.homepageSections) && s.homepageSections.length > 0) {
      const normalized = normalizeLoadedSections(s.homepageSections as HomepageSection[]);
      if (normalized.length > 0) setHomepageSections(normalized);
    }
    if (Array.isArray(s.navigationItems) && s.navigationItems.length > 0) {
      const normalizedNav = normalizeLoadedNavigation(s.navigationItems as NavigationItem[]);
      if (normalizedNav.length > 0) setNavigationItems(normalizedNav);
    }
    if (Array.isArray(s.mediaAssets) && s.mediaAssets.length > 0) {
      setMediaAssets([...(s.mediaAssets as MediaAsset[]), ...LOCAL_EDITORIAL_MEDIA.filter((l) => !(s.mediaAssets as MediaAsset[]).some((m) => m.id === l.id))]);
    }
    if (Array.isArray(s.campaigns)) setCampaigns(s.campaigns as AdCampaign[]);
    if (Array.isArray(s.rolePermissions) && s.rolePermissions.length > 0) {
      setRolePermissionMatrix(s.rolePermissions as RolePermissionConfig[]);
    }
    if (s.siteSettings && typeof s.siteSettings === 'object') {
      const nextSet = { ...DEFAULT_SITE_SETTINGS, ...(s.siteSettings as Partial<SiteSettings>) };
      if (nextSet.headerCtaLabel === 'Staff Portal' || nextSet.headerCtaUrl === 'view:admin_login') {
        nextSet.headerCtaLabel = DEFAULT_SITE_SETTINGS.headerCtaLabel;
        nextSet.headerCtaUrl = DEFAULT_SITE_SETTINGS.headerCtaUrl;
      }
      setSiteSettings(nextSet);
    }
    if (Array.isArray(s.rssFeeds)) setRssFeeds(s.rssFeeds as RssFeedSource[]);
    if (Array.isArray(s.auditLogs)) setServerAuditLogs(s.auditLogs as AuditLogItem[]);
  }, [normalizeLoadedSections, normalizeLoadedNavigation]);

  const mutateServerCms = useCallback(
    async (action: string, payload: unknown) => {
      const headers = await getAuthHeader();
      if (!headers.Authorization) return false;
      const resp = await fetch('/api/cms/mutate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ action, payload }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || 'Server CMS mutation failed.');
      }
      const data = await resp.json();
      if (data.store) syncServerStoreIntoState(data.store);
      return true;
    },
    [getAuthHeader, syncServerStoreIntoState]
  );

  // Live Theme CSS Variable Application
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.documentElement.style.setProperty('--brand-primary', siteSettings.primaryColor || '#E1262D');
    document.documentElement.style.setProperty('--brand-secondary', siteSettings.secondaryColor || '#0D47FF');
    if (siteSettings.displayFont) {
      document.documentElement.style.setProperty('--font-display', `'${siteSettings.displayFont}', Georgia, serif`);
    }
    if (siteSettings.bodyFont) {
      document.documentElement.style.setProperty('--font-sans', `'${siteSettings.bodyFont}', system-ui, sans-serif`);
    }
    try {
      localStorage.setItem('binduz_theme', darkMode ? 'dark' : 'light');
    } catch {
      // ignore
    }
  }, [darkMode, siteSettings]);

  const toggleDarkMode = useCallback(() => setDarkMode((d) => !d), []);

  const setLanguage = useCallback(
    (lang: LanguageCode) => {
      setLanguageState(lang);
      try {
        localStorage.setItem('binduz_lang', lang);
      } catch {
        // ignore
      }
      if (user) {
        updateDoc(doc(db, 'users_private', user.uid), {
          preferredLanguage: lang,
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    },
    [user]
  );

  const toggleFollowedTopic = useCallback((cat: CategoryName) => {
    setFollowedTopics((prev) => {
      const next = prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat];
      try {
        localStorage.setItem('binduz_followed_topics', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  // Real Core Web Vitals tracking
  useEffect(() => {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) return;
    const observers: PerformanceObserver[] = [];

    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) setWebVitals((prev) => ({ ...prev, lcpMs: Math.round(last.startTime) }));
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
      observers.push(lcpObs);
    } catch {
      // ignore
    }

    try {
      let clsTotal = 0;
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
          if (!entry.hadRecentInput && typeof entry.value === 'number') clsTotal += entry.value;
        }
        setWebVitals((prev) => ({ ...prev, cls: Number(clsTotal.toFixed(4)) }));
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
      observers.push(clsObs);
    } catch {
      // ignore
    }

    try {
      const inpObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const dur = Math.round(entry.duration);
          if (dur > 0) setWebVitals((prev) => ({ ...prev, inpMs: prev.inpMs === null ? dur : Math.max(prev.inpMs, dur) }));
        }
      });
      inpObs.observe({ type: 'event', buffered: true });
      observers.push(inpObs);
    } catch {
      // ignore
    }

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  // Load Initial Live Journalism, Real Weather, Public CMS State & Admin Auth Status
  const refreshLiveNews = useCallback(async (force = false) => {
    setLiveNewsLoading(true);
    try {
      const resp = await fetch(`/api/news/live${force ? '?refresh=1' : ''}`);
      if (resp.ok) {
        const json = await resp.json();
        if (Array.isArray(json.items)) setLiveWireArticles(json.items);
        if (Array.isArray(json.feeds)) setRssFeeds(json.feeds);
        setLastLiveNewsUpdatedAt(json.fetchedAt || new Date().toISOString());
      }
    } catch {
      // fallback silently if network unavailable
    } finally {
      setLiveNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void testConnection();
    void refreshLiveNews(false);

    // Automatic 90-second live national & international news polling while tab is visible
    const autoPoll = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        void refreshLiveNews(true);
      }
    }, 90_000);

    const onVisibilityChange = () => {
      if (!document.hidden) {
        void refreshLiveNews(false);
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    fetch('/api/admin/auth-status')
      .then((r) => r.json())
      .then((status) => setAdminAuthStatus(status))
      .catch(() => {});

    fetch('/api/cms/state')
      .then((r) => r.json())
      .then((data) => syncServerStoreIntoState(data))
      .catch(() => {});

    fetch('/api/weather/live')
      .then((r) => r.json())
      .then((json: { bureaus?: Record<string, { tempC: string; tempF: string }> }) => {
        if (json.bureaus) {
          setBureaus(
            NEWS_BUREAUS.map((b) => ({
              ...b,
              weatherTempC: json.bureaus?.[b.id]?.tempC,
              weatherTempF: json.bureaus?.[b.id]?.tempF,
            }))
          );
        }
      })
      .catch(() => {});

    return () => {
      clearInterval(autoPoll);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [refreshLiveNews, syncServerStoreIntoState]);

  // Firebase Auth & Profile Bootstrap
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setUser(fbUser);
      if (!fbUser) {
        if (!adminToken) setActualRole('Guest');
        setAuthReady(true);
        return;
      }

      const isSuperAdminEmail = fbUser.email === SUPER_ADMIN_EMAIL && fbUser.emailVerified;
      const initialRole: RoleName = isSuperAdminEmail ? 'Super Admin' : 'Registered User';

      try {
        const privRef = doc(db, 'users_private', fbUser.uid);
        const pubRef = doc(db, 'users_public', fbUser.uid);
        const privSnap = await getDoc(privRef);

        if (!privSnap.exists()) {
          await setDoc(privRef, {
            uid: fbUser.uid,
            email: fbUser.email || `${fbUser.uid}@users.binduz.news`,
            role: initialRole,
            preferredLanguage: language,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setActualRole(initialRole);
        } else {
          const data = privSnap.data();
          const role = (data.role as RoleName) || initialRole;
          setActualRole(isSuperAdminEmail ? 'Super Admin' : role);
        }

        const pubSnap = await getDoc(pubRef);
        const resolvedRole = isSuperAdminEmail
          ? 'Super Admin'
          : ((privSnap.exists() ? (privSnap.data().role as RoleName) : initialRole) || 'Registered User');

        if (!pubSnap.exists()) {
          await setDoc(pubRef, {
            uid: fbUser.uid,
            displayName: clampString(fbUser.displayName || fbUser.email?.split('@')[0] || 'Reader', 80),
            ...(fbUser.photoURL ? { photoURL: clampString(fbUser.photoURL, 500) } : {}),
            role: resolvedRole,
            title: isSuperAdminEmail ? 'Global Publisher & Super Admin' : 'Binduz Reader',
            updatedAt: serverTimestamp(),
          });
        }
      } catch (err) {
        console.error('Auth profile sync warning:', err);
        setActualRole(isSuperAdminEmail ? 'Super Admin' : 'Registered User');
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, [language, adminToken]);

  const isBootstrappedSuperAdmin = Boolean(user?.email === SUPER_ADMIN_EMAIL && user?.emailVerified);
  const effectiveRole: RoleName = adminToken ? 'Super Admin' : actualRole;
  const isStaffAuthenticated = Boolean(adminToken || (user && ROLE_PERMISSIONS[actualRole]?.canAccessNewsroom));

  // Fetch full Server Admin CMS state when staff/admin authenticates
  useEffect(() => {
    if (!isStaffAuthenticated) return;
    getAuthHeader().then((headers) => {
      if (!headers.Authorization) return;
      fetch('/api/cms/admin-state', { headers })
        .then((r) => (r.ok ? r.json() : null))
        .then((store) => {
          if (store) syncServerStoreIntoState(store);
        })
        .catch(() => {});
    });
  }, [isStaffAuthenticated, getAuthHeader, syncServerStoreIntoState]);

  // Firestore Real-Time Listeners (Articles, Pages, Homepage Sections, Nav, Role Permissions, Settings)
  useEffect(() => {
    const artQ = isBootstrappedSuperAdmin
      ? query(collection(db, 'articles'))
      : query(collection(db, 'articles'), where('status', '==', 'published'));

    const unsubArticles = onSnapshot(
      artQ,
      (snap) => {
        const loaded = snap.docs.map((d) => {
          const data = d.data() as Article;
          return {
            ...data,
            id: d.id,
            displayDate: data.publishedAt
              ? new Date(data.publishedAt).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Newsroom Desk',
            readMinutes: Math.max(2, Math.ceil((data.content?.split(/\s+/).length || 240) / 180)),
          };
        });
        setRemoteArticles(loaded);
      },
      () => {}
    );

    const pageQ = isBootstrappedSuperAdmin
      ? query(collection(db, 'pages'))
      : query(collection(db, 'pages'), where('status', '==', 'published'));
    const unsubPages = onSnapshot(
      pageQ,
      (snap) => {
        setRemotePages(snap.docs.map((d) => ({ ...(d.data() as CmsPage), id: d.id })));
      },
      () => {}
    );

    const secQ = query(collection(db, 'homepage_sections'), where('orderIndex', '>=', 0));
    const unsubSec = onSnapshot(
      secQ,
      (snap) => {
        if (!snap.empty) {
          const raw = snap.docs.map((d) => ({ ...(d.data() as HomepageSection), id: d.id }));
          const normalized = normalizeLoadedSections(raw);
          if (normalized.length > 0) {
            setHomepageSections(normalized);
          }
        }
      },
      () => {}
    );

    const navQ = query(collection(db, 'navigation_items'), where('orderIndex', '>=', 0));
    const unsubNav = onSnapshot(
      navQ,
      (snap) => {
        if (!snap.empty) {
          const raw = snap.docs.map((d) => ({ ...(d.data() as NavigationItem), id: d.id }));
          const normalizedNav = normalizeLoadedNavigation(raw);
          if (normalizedNav.length > 0) {
            setNavigationItems(normalizedNav);
          }
        }
      },
      () => {}
    );

    const rolePermQ = query(collection(db, 'role_permissions'), where('roleName', '!=', ''));
    const unsubRolePerm = onSnapshot(
      rolePermQ,
      (snap) => {
        if (!snap.empty) {
          setRolePermissionMatrix(
            snap.docs.map((d) => ({ ...(d.data() as RolePermissionConfig), id: d.id }))
          );
        }
      },
      () => {}
    );

    const mediaQ = query(
      collection(db, 'media_assets'),
      where('aspectRatio', 'in', ['16:9', '4:3', '1:1', '3:4'])
    );
    const unsubMedia = onSnapshot(
      mediaQ,
      (snap) => {
        if (!snap.empty) {
          const fsMedia = snap.docs.map((d) => ({ ...(d.data() as MediaAsset), id: d.id }));
          setMediaAssets([...fsMedia, ...LOCAL_EDITORIAL_MEDIA.filter((l) => !fsMedia.some((m) => m.id === l.id))]);
        }
      },
      () => {}
    );

    const campQ = isBootstrappedSuperAdmin
      ? query(collection(db, 'campaigns'))
      : query(collection(db, 'campaigns'), where('status', '==', 'active'));
    const unsubCamp = onSnapshot(
      campQ,
      (snap) => {
        if (!snap.empty) setCampaigns(snap.docs.map((d) => ({ ...(d.data() as AdCampaign), id: d.id })));
      },
      () => {}
    );

    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'global'),
      (snap) => {
        if (snap.exists()) setSiteSettings({ ...DEFAULT_SITE_SETTINGS, ...(snap.data() as SiteSettings) });
      },
      () => {}
    );

    const staffQ = query(collection(db, 'users_public'), where('role', '!=', 'Guest'));
    const unsubStaff = onSnapshot(
      staffQ,
      (snap) => setStaffProfiles(snap.docs.map((d) => d.data() as UserPublicProfile)),
      () => {}
    );

    return () => {
      unsubArticles();
      unsubPages();
      unsubSec();
      unsubNav();
      unsubRolePerm();
      unsubMedia();
      unsubCamp();
      unsubSettings();
      unsubStaff();
    };
  }, [isBootstrappedSuperAdmin]);

  // Own drafts + bookmarks + Super Admin user/audit listeners
  useEffect(() => {
    if (!user) {
      setMyDraftArticles([]);
      return;
    }

    const unsubMyDrafts = !isBootstrappedSuperAdmin
      ? onSnapshot(
          query(collection(db, 'articles'), where('authorId', '==', user.uid)),
          (snap) => setMyDraftArticles(snap.docs.map((d) => ({ ...(d.data() as Article), id: d.id }))),
          () => {}
        )
      : () => {};

    const unsubBm = onSnapshot(
      collection(db, 'users_private', user.uid, 'bookmarks'),
      (snap) => {
        const items = snap.docs.map((d) => d.data() as BookmarkItem);
        setBookmarks(items);
        try {
          localStorage.setItem('binduz_bookmarks', JSON.stringify(items));
        } catch {
          // ignore
        }
      },
      () => {}
    );

    let unsubPriv: (() => void) | undefined;
    let unsubAudit: (() => void) | undefined;
    if (isBootstrappedSuperAdmin) {
      unsubPriv = onSnapshot(
        collection(db, 'users_private'),
        (snap) => {
          setPrivateUsers(
            snap.docs.map((d) => ({
              uid: d.id,
              email: String(d.data().email || ''),
              role: (d.data().role as RoleName) || 'Registered User',
            }))
          );
        },
        () => {}
      );
      unsubAudit = onSnapshot(
        collection(db, 'audit_logs'),
        (snap) => {
          setFirestoreAuditLogs(
            snap.docs.map((d) => ({ ...(d.data() as AuditLogItem), id: d.id }))
          );
        },
        () => {}
      );
    }

    return () => {
      unsubMyDrafts();
      unsubBm();
      if (unsubPriv) unsubPriv();
      if (unsubAudit) unsubAudit();
    };
  }, [user, isBootstrappedSuperAdmin]);

  // Combine verified live RSS news + Server CMS articles + Firestore articles
  const articles = useMemo(() => {
    const map = new globalThis.Map<string, Article>();
    liveWireArticles.forEach((a) => map.set(a.id, a));
    serverArticles.forEach((a) => map.set(a.id, a));
    remoteArticles.forEach((a) => map.set(a.id, a));
    myDraftArticles.forEach((a) => map.set(a.id, a));
    return Array.from(map.values()).sort((a, b) => {
      const da = Date.parse(a.publishedAt || '') || 0;
      const dbTime = Date.parse(b.publishedAt || '') || 0;
      return dbTime - da;
    });
  }, [liveWireArticles, serverArticles, remoteArticles, myDraftArticles]);

  const publishedArticles = useMemo(() => {
    const now = Date.now();
    return articles.filter((a) => {
      if (a.status === 'published') return true;
      if (a.status === 'scheduled' && a.scheduledAt) {
        const ts = Date.parse(a.scheduledAt);
        return !Number.isNaN(ts) && ts <= now;
      }
      return false;
    });
  }, [articles]);

  const pages = useMemo(() => {
    const map = new globalThis.Map<string, CmsPage>();
    serverPages.forEach((p) => map.set(p.id, p));
    remotePages.forEach((p) => map.set(p.id, p));
    return Array.from(map.values());
  }, [serverPages, remotePages]);

  const publishedPages = useMemo(
    () => pages.filter((p) => p.status === 'published'),
    [pages]
  );

  const auditLogs = useMemo(() => {
    const map = new globalThis.Map<string, AuditLogItem>();
    serverAuditLogs.forEach((l) => map.set(l.id, l));
    firestoreAuditLogs.forEach((l) => map.set(l.id, l));
    return Array.from(map.values()).sort((a, b) => String(b.id).localeCompare(String(a.id)));
  }, [serverAuditLogs, firestoreAuditLogs]);

  // Deep-link ?article=slug support
  useEffect(() => {
    if (typeof window === 'undefined' || articles.length === 0) return;
    const slugParam = new URLSearchParams(window.location.search).get('article');
    if (slugParam) {
      const matched = articles.find((a) => a.slug === slugParam || a.id === slugParam);
      if (matched) setActiveArticle(matched);
    }
  }, [articles]);

  // Dynamic Permissions Lookup (combines default matrix with custom editable Firestore overrides)
  const permissions: RolePermissionSet = useMemo(() => {
    const custom = rolePermissionMatrix.find((r) => r.roleName === effectiveRole);
    if (custom) return custom;
    return ROLE_PERMISSIONS[effectiveRole];
  }, [rolePermissionMatrix, effectiveRole]);

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleAuthProvider);
      pushToast('Signed In', 'Authenticated with Google account.');
    } catch (err) {
      pushToast('Sign In Notice', err instanceof Error ? err.message : 'Sign-in cancelled.');
    }
  }, [pushToast]);

  const loginWithAdminPasscode = useCallback(
    async (passcode: string) => {
      try {
        const resp = await fetch('/api/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode }),
        });
        const data = await resp.json();
        if (!resp.ok) return { ok: false, error: data.error || 'Authentication failed.' };
        setAdminToken(data.token);
        setActualRole('Super Admin');
        pushToast('Admin Authenticated', 'Unlocked full WordPress-style CMS & Newsroom controls.');
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Network error.' };
      }
    },
    [pushToast]
  );

  const claimAdminPasscode = useCallback(
    async (passcode: string) => {
      try {
        const resp = await fetch('/api/admin/claim', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode }),
        });
        const data = await resp.json();
        if (!resp.ok) return { ok: false, error: data.error || 'Unable to claim admin passcode.' };
        setAdminToken(data.token);
        setAdminAuthStatus({ envConfigured: false, claimed: true });
        setActualRole('Super Admin');
        pushToast('Admin Passcode Claimed', 'Your private admin credential is now active.');
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Network error.' };
      }
    },
    [pushToast]
  );

  const signOut = useCallback(async () => {
    setAdminToken(null);
    setVisualEditMode(false);
    if (auth.currentUser) {
      await firebaseSignOut(auth);
    }
    setActualRole('Guest');
    pushToast('Signed Out', 'Private session ended cleanly.');
  }, [pushToast]);

  const openCustomPage = useCallback((slug: string) => {
    setActivePageSlug(slug);
    setActiveView('page');
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('page', slug);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  }, []);

  const logAudit = useCallback(
    async (action: string, targetType: string, targetId: string, details?: string) => {
      if (!user) return;
      const logId = sanitizeId(`log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      try {
        await setDoc(doc(db, 'audit_logs', logId), {
          id: logId,
          actorId: user.uid,
          actorRole: actualRole,
          action: clampString(action, 80),
          targetType: clampString(targetType, 40),
          targetId: clampString(targetId, 128),
          ...(details ? { details: clampString(details, 400) } : {}),
          createdAt: serverTimestamp(),
        });
      } catch {
        // ignore if caller is passcode-only
      }
    },
    [user, actualRole]
  );

  const openArticle = useCallback((article: Article) => {
    setActiveArticle(article);
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('article', article.slug);
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
    if (article.status === 'published' && !article.id.startsWith('live-')) {
      updateDoc(doc(db, 'articles', article.id), {
        views: increment(1),
        updatedAt: serverTimestamp(),
      }).catch(() => {});
    }
  }, []);

  const closeArticle = useCallback(() => {
    setActiveArticle(null);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('article');
      window.history.replaceState({}, '', url.toString());
    } catch {
      // ignore
    }
  }, []);

  const isBookmarked = useCallback(
    (articleId: string) => bookmarks.some((b) => b.articleId === articleId),
    [bookmarks]
  );

  const toggleBookmark = useCallback(
    async (article: Article) => {
      const exists = bookmarks.some((b) => b.articleId === article.id);
      const nextLocal = exists
        ? bookmarks.filter((b) => b.articleId !== article.id)
        : [{ articleId: article.id, title: article.title, category: article.category, imageUrl: article.imageUrl }, ...bookmarks];
      setBookmarks(nextLocal);
      try {
        localStorage.setItem('binduz_bookmarks', JSON.stringify(nextLocal));
      } catch {
        // ignore
      }
      if (user) {
        const bmRef = doc(db, 'users_private', user.uid, 'bookmarks', article.id);
        try {
          if (exists) await deleteDoc(bmRef);
          else {
            const artSnap = await getDoc(doc(db, 'articles', article.id));
            if (artSnap.exists()) {
              await setDoc(bmRef, {
                articleId: article.id,
                title: clampString(article.title, 220),
                category: clampString(article.category, 60),
                imageUrl: clampString(article.imageUrl, 600),
                savedAt: serverTimestamp(),
              });
            }
          }
        } catch {
          // local fallback retained for live wire dispatches
        }
      }
      pushToast(exists ? 'Bookmark Removed' : 'Story Saved', article.title.slice(0, 72));
    },
    [bookmarks, user, pushToast]
  );

  const toggleLikeArticle = useCallback(
    async (article: Article) => {
      const liked = likedArticleIds.includes(article.id);
      const next = liked ? likedArticleIds.filter((id) => id !== article.id) : [...likedArticleIds, article.id];
      setLikedArticleIds(next);
      try {
        localStorage.setItem('binduz_likes', JSON.stringify(next));
      } catch {
        // ignore
      }
      if (article.status === 'published') {
        updateDoc(doc(db, 'articles', article.id), {
          likesCount: increment(liked ? -1 : 1),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
      }
    },
    [likedArticleIds]
  );

  // --- Full WordPress CMS Mutations (Dual Server + Firestore Persistence) ---
  const saveArticle = useCallback(
    async (draft: Partial<Article>, isNew = false, changeSummary = 'Editorial save'): Promise<Article | null> => {
      if (!isStaffAuthenticated) {
        pushToast('Staff Login Required', 'Sign in via Staff Portal or Google Account to save stories.');
        return null;
      }
      const id = sanitizeId(draft.id || `story-${Date.now()}`);
      const authorId = user?.uid || 'admin-desk';
      const authorName = clampString(
        draft.authorName || user?.displayName || 'Editorial Desk',
        80
      );

      const normalized: Article = {
        id,
        slug: sanitizeSlug(draft.slug || draft.title || id),
        title: clampString(draft.title || 'Untitled Dispatch', 220),
        subtitle: draft.subtitle ? clampString(draft.subtitle, 320) : undefined,
        excerpt: clampString(draft.excerpt || draft.title || 'Editorial summary pending.', 600),
        content: clampString(draft.content || draft.excerpt || 'Full editorial dispatch.', 30000),
        category: (draft.category || 'Bangladesh National') as CategoryName,
        status: (draft.status || 'draft') as ArticleStatus,
        authorId,
        authorName,
        imageUrl: clampString(draft.imageUrl || '/src/assets/images/hero_climate_desk_1795430987467.jpg', 600),
        videoUrl: draft.videoUrl ? clampString(draft.videoUrl, 600) : undefined,
        audioUrl: draft.audioUrl ? clampString(draft.audioUrl, 600) : undefined,
        locationName: draft.locationName ? clampString(draft.locationName, 120) : 'Dhaka, Bangladesh',
        lat: typeof draft.lat === 'number' ? draft.lat : 23.8103,
        lng: typeof draft.lng === 'number' ? draft.lng : 90.4125,
        isBreaking: Boolean(draft.isBreaking),
        isTrending: Boolean(draft.isTrending),
        isFeatured: Boolean(draft.isFeatured),
        isEditorsPick: Boolean(draft.isEditorsPick),
        isSpecialReport: Boolean(draft.isSpecialReport),
        sourceName: draft.sourceName,
        sourceUrl: draft.sourceUrl,
        views: Math.max(0, Math.floor(Number(draft.views ?? 0))),
        likesCount: Math.max(0, Math.floor(Number(draft.likesCount ?? 0))),
        commentsCount: Math.max(0, Math.floor(Number(draft.commentsCount ?? 0))),
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        focusKeywords: draft.focusKeywords,
        aiSummary: draft.aiSummary,
        canonicalUrl: draft.canonicalUrl,
        language: draft.language || 'en',
        scheduledAt: draft.scheduledAt,
        publishedAt:
          draft.status === 'published' && !draft.publishedAt
            ? new Date().toISOString()
            : draft.publishedAt,
      };

      await mutateServerCms('save_article', normalized);

      if (user) {
        try {
          const ref = doc(db, 'articles', id);
          const snap = await getDoc(ref);
          const payload = sanitizeArticleForFirestore(
            {
              ...normalized,
              authorId: snap.exists() ? String(snap.data().authorId) : user.uid,
            },
            snap.exists() ? snap.data().createdAt : undefined
          );
          await setDoc(ref, payload);
          const revId = sanitizeId(`rev-${Date.now()}`);
          await setDoc(doc(db, 'articles', id, 'revisions', revId), {
            id: revId,
            articleId: id,
            title: normalized.title,
            excerpt: normalized.excerpt,
            content: normalized.content,
            status: normalized.status,
            editorId: user.uid,
            editorName: clampString(user.displayName || 'Editor', 80),
            changeSummary: clampString(changeSummary, 160),
            createdAt: serverTimestamp(),
          });
          await logAudit(isNew ? 'CREATE_ARTICLE' : 'UPDATE_ARTICLE', 'article', id, normalized.title);
        } catch (err) {
          if (!adminToken) {
            handleFirestoreError(err, OperationType.WRITE, `articles/${id}`);
          }
        }
      }

      pushToast('Saved', `${normalized.title.slice(0, 48)} (${normalized.status})`);
      return normalized;
    },
    [isStaffAuthenticated, user, adminToken, mutateServerCms, logAudit, pushToast]
  );

  const transitionArticleStatus = useCallback(
    async (article: Article, nextStatus: ArticleStatus) => {
      await saveArticle(
        {
          ...article,
          status: nextStatus,
          publishedAt: nextStatus === 'published' ? article.publishedAt || new Date().toISOString() : article.publishedAt,
        },
        false,
        `Status changed to ${nextStatus}`
      );
    },
    [saveArticle]
  );

  const deleteArticle = useCallback(
    async (articleId: string) => {
      if (!isStaffAuthenticated) return;
      await mutateServerCms('delete_article', { id: articleId });
      if (user) {
        try {
          await deleteDoc(doc(db, 'articles', articleId));
          await logAudit('DELETE_ARTICLE', 'article', articleId);
        } catch {
          // ignore if article was only in server CMS store
        }
      }
      pushToast('Article Deleted', articleId);
    },
    [isStaffAuthenticated, user, mutateServerCms, logAudit, pushToast]
  );

  const fetchArticleRevisions = useCallback(
    async (articleId: string): Promise<ArticleRevision[]> => {
      const merged: ArticleRevision[] = [];
      if (user) {
        try {
          const snap = await getDocs(collection(db, 'articles', articleId, 'revisions'));
          snap.docs.forEach((d) => merged.push(d.data() as ArticleRevision));
        } catch {
          // fallback to server revisions
        }
      }
      try {
        const headers = await getAuthHeader();
        if (headers.Authorization) {
          const resp = await fetch('/api/cms/admin-state', { headers });
          if (resp.ok) {
            const store = await resp.json();
            const list = (store.revisions?.[articleId] || []) as ArticleRevision[];
            list.forEach((rev) => {
              if (!merged.some((m) => m.id === rev.id)) merged.push(rev);
            });
          }
        }
      } catch {
        // ignore
      }
      return merged.sort((a, b) => String(b.id).localeCompare(String(a.id)));
    },
    [user, getAuthHeader]
  );

  const savePage = useCallback(
    async (pageDraft: Partial<CmsPage>, isNew = false): Promise<CmsPage | null> => {
      if (!isStaffAuthenticated) {
        pushToast('Staff Login Required', 'Authenticate as Admin/Editor to manage CMS pages.');
        return null;
      }
      const id = sanitizeId(pageDraft.id || `page-${Date.now()}`);
      const authorId = user?.uid || 'admin-desk';
      const authorName = clampString(pageDraft.authorName || user?.displayName || 'Editorial Desk', 80);

      const page: CmsPage = {
        id,
        slug: sanitizeSlug(pageDraft.slug || pageDraft.title || id),
        title: clampString(pageDraft.title || 'Untitled Page', 160),
        description: pageDraft.description ? clampString(pageDraft.description, 400) : '',
        status: pageDraft.status || 'draft',
        showInHeader: Boolean(pageDraft.showInHeader),
        showInFooter: Boolean(pageDraft.showInFooter),
        blocks: Array.isArray(pageDraft.blocks) ? pageDraft.blocks.slice(0, 25) : [],
        seoTitle: pageDraft.seoTitle ? clampString(pageDraft.seoTitle, 120) : undefined,
        seoDescription: pageDraft.seoDescription ? clampString(pageDraft.seoDescription, 240) : undefined,
        authorId,
        authorName,
        scheduledAt: pageDraft.scheduledAt,
        publishedAt:
          pageDraft.status === 'published' && !pageDraft.publishedAt
            ? new Date().toISOString()
            : pageDraft.publishedAt,
      };

      await mutateServerCms('save_page', page);

      if (user) {
        try {
          const ref = doc(db, 'pages', id);
          const snap = await getDoc(ref);
          await setDoc(ref, {
            ...page,
            authorId: snap.exists() ? snap.data().authorId : user.uid,
            createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          const revId = sanitizeId(`rev-${Date.now()}`);
          await setDoc(doc(db, 'pages', id, 'revisions', revId), {
            id: revId,
            pageId: id,
            title: page.title,
            status: page.status,
            blocks: page.blocks,
            editorId: user.uid,
            editorName: authorName,
            createdAt: serverTimestamp(),
          });
          await logAudit(isNew ? 'CREATE_PAGE' : 'UPDATE_PAGE', 'page', id, page.title);
        } catch {
          // persisted in server CMS store
        }
      }

      pushToast('Page Saved', `${page.title} (${page.status})`);
      return page;
    },
    [isStaffAuthenticated, user, mutateServerCms, logAudit, pushToast]
  );

  const deletePage = useCallback(
    async (pageId: string) => {
      if (!isStaffAuthenticated) return;
      await mutateServerCms('delete_page', { id: pageId });
      if (user) {
        await deleteDoc(doc(db, 'pages', pageId)).catch(() => {});
        await logAudit('DELETE_PAGE', 'page', pageId);
      }
      pushToast('Page Deleted', pageId);
    },
    [isStaffAuthenticated, user, mutateServerCms, logAudit, pushToast]
  );

  const fetchPageRevisions = useCallback(
    async (pageId: string): Promise<Array<Record<string, unknown>>> => {
      const headers = await getAuthHeader();
      if (!headers.Authorization) return [];
      try {
        const resp = await fetch('/api/cms/admin-state', { headers });
        if (!resp.ok) return [];
        const store = await resp.json();
        return store.revisions?.[`page_${pageId}`] || [];
      } catch {
        return [];
      }
    },
    [getAuthHeader]
  );

  const saveHomepageSections = useCallback(
    async (sections: HomepageSection[]) => {
      if (!isStaffAuthenticated) return;
      const ordered = sections.map((s, idx) => ({ ...s, orderIndex: idx }));
      setHomepageSections(ordered);
      await mutateServerCms('save_homepage_sections', { sections: ordered });

      if (user) {
        try {
          const batch = writeBatch(db);
          ordered.forEach((sec) => {
            const cleanSec: Record<string, unknown> = {
              id: sanitizeId(sec.id),
              sectionType: sec.sectionType,
              title: clampString(sec.title, 120),
              visible: Boolean(sec.visible),
              orderIndex: sec.orderIndex,
              updatedBy: user.uid,
              updatedAt: serverTimestamp(),
            };
            if (sec.subtitle) cleanSec.subtitle = clampString(sec.subtitle, 240);
            if (sec.itemCount) cleanSec.itemCount = Math.min(30, Math.max(1, Math.floor(sec.itemCount)));
            if (sec.categoryFilter) cleanSec.categoryFilter = clampString(sec.categoryFilter, 40);
            if (sec.layoutVariant) cleanSec.layoutVariant = sec.layoutVariant;
            if (sec.accentColor) cleanSec.accentColor = clampString(sec.accentColor, 32);
            if (sec.promoHeadline) cleanSec.promoHeadline = clampString(sec.promoHeadline, 180);
            if (sec.promoBody) cleanSec.promoBody = clampString(sec.promoBody, 400);
            if (sec.promoImageUrl) cleanSec.promoImageUrl = clampString(sec.promoImageUrl, 600);
            if (sec.promoVideoUrl) cleanSec.promoVideoUrl = clampString(sec.promoVideoUrl, 600);
            if (sec.promoButtonText) cleanSec.promoButtonText = clampString(sec.promoButtonText, 60);
            if (sec.promoButtonUrl) cleanSec.promoButtonUrl = clampString(sec.promoButtonUrl, 300);
            if (sec.autoPlayMs) cleanSec.autoPlayMs = Math.min(30000, Math.max(2000, sec.autoPlayMs));
            batch.set(doc(db, 'homepage_sections', sanitizeId(sec.id)), cleanSec);
          });
          await batch.commit();
        } catch {
          // persisted in server CMS store
        }
      }
      pushToast('Homepage Updated', 'Section order and layout saved live.');
    },
    [isStaffAuthenticated, user, mutateServerCms, pushToast]
  );

  const saveNavigationItems = useCallback(
    async (items: NavigationItem[]) => {
      if (!isStaffAuthenticated) return;
      const ordered = items.map((item, idx) => ({ ...item, orderIndex: idx }));
      setNavigationItems(ordered);
      await mutateServerCms('save_navigation', { items: ordered });

      if (user) {
        try {
          const batch = writeBatch(db);
          ordered.forEach((item) => {
            batch.set(doc(db, 'navigation_items', sanitizeId(item.id)), {
              id: sanitizeId(item.id),
              label: clampString(item.label, 60),
              location: item.location,
              targetType: item.targetType,
              targetValue: clampString(item.targetValue, 300),
              orderIndex: item.orderIndex,
              visible: Boolean(item.visible),
              updatedBy: user.uid,
              updatedAt: serverTimestamp(),
            });
          });
          await batch.commit();
        } catch {
          // persisted in server CMS store
        }
      }
      pushToast('Menus Updated', 'Header & footer navigation saved.');
    },
    [isStaffAuthenticated, user, mutateServerCms, pushToast]
  );

  const saveSiteSettings = useCallback(
    async (partial: Partial<SiteSettings>) => {
      if (!isStaffAuthenticated) return;
      const merged: SiteSettings = {
        ...siteSettings,
        ...partial,
        updatedBy: user?.uid || 'admin-desk',
      };
      setSiteSettings(merged);
      await mutateServerCms('save_settings', merged);

      if (user) {
        try {
          await setDoc(doc(db, 'settings', 'global'), {
            siteName: clampString(merged.siteName, 80, 'BINDUZ'),
            tagline: clampString(merged.tagline || '', 180),
            brandMarkText: clampString(merged.brandMarkText || 'B', 4),
            headerCtaLabel: clampString(merged.headerCtaLabel || 'Listen Live', 40),
            headerCtaUrl: clampString(merged.headerCtaUrl || 'section:audio_news', 200),
            footerCopyright: clampString(merged.footerCopyright || '', 160),
            footerBio: clampString(merged.footerBio || '', 320),
            primaryColor: clampString(merged.primaryColor || '#E1262D', 24),
            secondaryColor: clampString(merged.secondaryColor || '#0D47FF', 24),
            headerBgColor: clampString(merged.headerBgColor || '', 24),
            footerBgColor: clampString(merged.footerBgColor || '#0B0F17', 24),
            displayFont: clampString(merged.displayFont || 'Playfair Display', 60),
            bodyFont: clampString(merged.bodyFont || 'Plus Jakarta Sans', 60),
            showBreakingBar: Boolean(merged.showBreakingBar ?? true),
            defaultLanguage: merged.defaultLanguage,
            enableComments: Boolean(merged.enableComments),
            enableAiGeo: Boolean(merged.enableAiGeo),
            updatedBy: user.uid,
            updatedAt: serverTimestamp(),
          });
        } catch {
          // persisted in server CMS store
        }
      }
      pushToast('Appearance & Settings Saved', 'Live site theme and settings updated.');
    },
    [isStaffAuthenticated, siteSettings, user, mutateServerCms, pushToast]
  );

  const saveRolePermissions = useCallback(
    async (matrix: RolePermissionConfig[]) => {
      if (!isStaffAuthenticated) return;
      setRolePermissionMatrix(matrix);
      await mutateServerCms('save_role_permissions', { roles: matrix });
      if (user) {
        try {
          const batch = writeBatch(db);
          matrix.forEach((r) => {
            batch.set(doc(db, 'role_permissions', sanitizeId(r.id)), {
              ...r,
              updatedBy: user.uid,
              updatedAt: serverTimestamp(),
            });
          });
          await batch.commit();
        } catch {
          // persisted in server CMS store
        }
      }
      pushToast('Permissions Updated', 'Granular role capabilities applied across all dashboards.');
    },
    [isStaffAuthenticated, user, mutateServerCms, pushToast]
  );

  const saveRssFeeds = useCallback(
    async (feeds: RssFeedSource[]) => {
      if (!isStaffAuthenticated) return;
      await mutateServerCms('save_rss_feeds', { feeds });
      await refreshLiveNews(true);
      pushToast('Live Feeds Updated', 'Verified journalism feeds refreshed.');
    },
    [isStaffAuthenticated, mutateServerCms, refreshLiveNews, pushToast]
  );

  const saveMediaAsset = useCallback(
    async (asset: Omit<MediaAsset, 'createdAt' | 'updatedAt'>) => {
      if (!isStaffAuthenticated) return;
      const id = sanitizeId(asset.id || `media-${Date.now()}`);
      await mutateServerCms('save_media', { ...asset, id });
      if (user) {
        try {
          await setDoc(doc(db, 'media_assets', id), {
            id,
            url: clampString(asset.url, 600),
            mediaType: asset.mediaType || 'image',
            title: clampString(asset.title, 160),
            altText: clampString(asset.altText, 260),
            aspectRatio: asset.aspectRatio,
            uploadedBy: user.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // persisted on server
        }
      }
      pushToast('Media Asset Saved', asset.title);
    },
    [isStaffAuthenticated, user, mutateServerCms, pushToast]
  );

  const deleteMediaAsset = useCallback(
    async (assetId: string) => {
      if (!isStaffAuthenticated) return;
      await mutateServerCms('delete_media', { id: assetId });
      if (user) await deleteDoc(doc(db, 'media_assets', assetId)).catch(() => {});
      pushToast('Media Deleted', assetId);
    },
    [isStaffAuthenticated, user, mutateServerCms, pushToast]
  );

  const saveCampaign = useCallback(
    async (campaign: Omit<AdCampaign, 'createdAt' | 'updatedAt'>) => {
      if (!isStaffAuthenticated) return;
      const id = sanitizeId(campaign.id || `camp-${Date.now()}`);
      await mutateServerCms('save_campaign', { ...campaign, id });
      if (user) {
        try {
          const ref = doc(db, 'campaigns', id);
          const snap = await getDoc(ref);
          await setDoc(ref, {
            ...campaign,
            id,
            ownerId: snap.exists() ? snap.data().ownerId : user.uid,
            createdAt: snap.exists() ? snap.data().createdAt : serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } catch {
          // persisted on server
        }
      }
      pushToast('Promotion Updated', campaign.title);
    },
    [isStaffAuthenticated, user, mutateServerCms, pushToast]
  );

  const trackCampaignClick = useCallback(async (campaign: AdCampaign) => {
    try {
      const ref = doc(db, 'campaigns', campaign.id);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().status === 'active') {
        await updateDoc(ref, { clicks: increment(1), updatedAt: serverTimestamp() });
      }
    } catch {
      // ignore
    }
  }, []);

  const subscribeNewsletter = useCallback(
    async (email: string, frequency: 'daily' | 'weekly' | 'breaking' = 'daily') => {
      const clean = email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
        pushToast('Invalid Email', 'Please enter a valid email address.');
        return false;
      }
      const id = sanitizeId(`sub-${clean.replace(/[^a-z0-9]/g, '-')}`);
      try {
        await setDoc(doc(db, 'subscribers', id), {
          id,
          email: clean.slice(0, 180),
          frequency,
          topics: followedTopics.slice(0, 6),
          subscribedAt: serverTimestamp(),
        });
        pushToast('Subscribed', `Confirmed ${frequency} briefing for ${clean}.`);
        return true;
      } catch (err) {
        pushToast('Subscription Notice', err instanceof Error ? err.message : 'Unable to subscribe.');
        return false;
      }
    },
    [followedTopics, pushToast]
  );

  const updateUserRole = useCallback(
    async (uid: string, role: RoleName) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, 'users_private', uid), { role, updatedAt: serverTimestamp() });
        await updateDoc(doc(db, 'users_public', uid), { role, updatedAt: serverTimestamp() });
        await logAudit('UPDATE_ROLE', 'user', uid, `Assigned role ${role}`);
        pushToast('Role Updated', `User assigned ${role}`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users_private/${uid}`);
      }
    },
    [user, logAudit, pushToast]
  );

  const fetchArticleComments = useCallback(
    async (articleId: string): Promise<CommentItem[]> => {
      try {
        const q = isBootstrappedSuperAdmin
          ? query(collection(db, 'articles', articleId, 'comments'))
          : query(collection(db, 'articles', articleId, 'comments'), where('status', '==', 'approved'));
        const snap = await getDocs(q);
        return snap.docs.map((d) => ({ ...(d.data() as CommentItem), id: d.id }));
      } catch {
        return [];
      }
    },
    [isBootstrappedSuperAdmin]
  );

  const postComment = useCallback(
    async (articleId: string, content: string): Promise<boolean> => {
      if (!user) {
        pushToast('Sign In Required', 'Please sign in with Google to post reader commentary.');
        return false;
      }
      const clean = clampString(content, 1500);
      if (clean.length < 2) return false;
      const commentId = sanitizeId(`cmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
      try {
        const artSnap = await getDoc(doc(db, 'articles', articleId));
        if (!artSnap.exists()) {
          pushToast('Save First', 'Save or import this wire dispatch into Firestore CMS before posting live comments.');
          return false;
        }
        await setDoc(doc(db, 'articles', articleId, 'comments', commentId), {
          id: commentId,
          articleId,
          authorId: user.uid,
          authorName: clampString(user.displayName || 'Subscriber', 80),
          content: clean,
          status: 'approved',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await updateDoc(doc(db, 'articles', articleId), {
          commentsCount: increment(1),
          updatedAt: serverTimestamp(),
        }).catch(() => {});
        pushToast('Comment Published', 'Your reader note is now live.');
        return true;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `articles/${articleId}/comments/${commentId}`);
        return false;
      }
    },
    [user, pushToast]
  );

  const moderateComment = useCallback(
    async (articleId: string, commentId: string, status: CommentItem['status']) => {
      if (!user) return;
      try {
        await updateDoc(doc(db, 'articles', articleId, 'comments', commentId), {
          status,
          updatedAt: serverTimestamp(),
        });
        await logAudit('MODERATE_COMMENT', 'comment', commentId, `Set status to ${status}`);
        pushToast('Comment Moderated', `Status updated to ${status}.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `articles/${articleId}/comments/${commentId}`);
      }
    },
    [user, logAudit, pushToast]
  );

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const t = I18N_DICT[language] || I18N_DICT.en;

  const value: NewspaperContextValue = {
    user,
    authReady,
    adminToken,
    adminAuthStatus,
    actualRole,
    effectiveRole,
    permissions,
    rolePermissionMatrix,
    isStaffAuthenticated,
    signInWithGoogle,
    loginWithAdminPasscode,
    claimAdminPasscode,
    signOut,
    activeView,
    setActiveView,
    activePageSlug,
    openCustomPage,
    visualEditMode,
    setVisualEditMode,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    followedTopics,
    toggleFollowedTopic,
    articles,
    publishedArticles,
    liveNewsLoading,
    lastLiveNewsUpdatedAt,
    refreshLiveNews: (force = true) => refreshLiveNews(force),
    activeArticle,
    openArticle,
    closeArticle,
    pages,
    publishedPages,
    homepageSections,
    navigationItems,
    bureaus,
    rssFeeds,
    bookmarks,
    isBookmarked,
    toggleBookmark,
    bookmarksDrawerOpen,
    setBookmarksDrawerOpen,
    likedArticleIds,
    toggleLikeArticle,
    mediaAssets,
    campaigns,
    staffProfiles,
    privateUsers,
    auditLogs,
    siteSettings,
    darkMode,
    toggleDarkMode,
    language,
    setLanguage,
    t,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    pushToast,
    toastQueue,
    webVitals,
    selectedBureauId,
    setSelectedBureauId,
    saveArticle,
    transitionArticleStatus,
    deleteArticle,
    fetchArticleRevisions,
    savePage,
    deletePage,
    fetchPageRevisions,
    saveHomepageSections,
    saveNavigationItems,
    saveSiteSettings,
    saveRolePermissions,
    saveRssFeeds,
    saveMediaAsset,
    deleteMediaAsset,
    saveCampaign,
    trackCampaignClick,
    subscribeNewsletter,
    updateUserRole,
    fetchArticleComments,
    postComment,
    moderateComment,
  };

  return <NewspaperContext.Provider value={value}>{children}</NewspaperContext.Provider>;
}

export function useNewspaper() {
  const ctx = useContext(NewspaperContext);
  if (!ctx) throw new Error('useNewspaper must be used within NewspaperProvider');
  return ctx;
}
