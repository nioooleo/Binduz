import {
  ArrowUpRight,
  ExternalLink,
  Play,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useMemo, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { Article, HomepageSection } from '../types/newspaper';

type WireFilterId =
  | 'all'
  | 'national'
  | 'bbc'
  | 'cnn'
  | 'aljazeera'
  | 'europe'
  | 'wires'
  | 'global_press';

const WIRE_FILTERS: Array<{ id: WireFilterId; label: string }> = [
  { id: 'all', label: 'All Platforms' },
  { id: 'national', label: 'National Press & TV' },
  { id: 'bbc', label: 'BBC' },
  { id: 'cnn', label: 'CNN' },
  { id: 'aljazeera', label: 'Al Jazeera' },
  { id: 'europe', label: 'DW & France 24' },
  { id: 'wires', label: 'Reuters & AP' },
  { id: 'global_press', label: 'Guardian, CNBC & NYT' },
];

function matchesWireFilter(article: Article, filter: WireFilterId): boolean {
  if (filter === 'all') return true;
  const src = `${article.sourceName || ''} ${article.authorName || ''}`.toLowerCase();
  if (filter === 'national') {
    return /daily star|prothom alo|dhaka tribune|business standard|channel i|ekattor|jago news|bangla tribune|bangladesh/i.test(
      src
    ) || article.category === 'Bangladesh National';
  }
  if (filter === 'bbc') return /\bbbc\b/i.test(src);
  if (filter === 'cnn') return /\bcnn\b/i.test(src);
  if (filter === 'aljazeera') return /al jazeera/i.test(src);
  if (filter === 'europe') return /deutsche welle|\bdw\b|france 24|sky news/i.test(src);
  if (filter === 'wires') return /reuters|associated press|\bap\b/i.test(src);
  if (filter === 'global_press') return /guardian|cnbc|npr|new york times/i.test(src);
  return true;
}

function formatRelativeAge(iso?: string): string {
  if (!iso) return 'Live';
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return 'Live';
  const diffMin = Math.max(0, Math.floor((Date.now() - ts) / 60_000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function LiveNewsSection({
  section,
  editBar,
}: {
  section: HomepageSection;
  editBar: React.ReactNode;
}) {
  const {
    publishedArticles,
    liveNewsLoading,
    lastLiveNewsUpdatedAt,
    refreshLiveNews,
    openArticle,
    siteSettings,
  } = useNewspaper();

  const [wireFilter, setWireFilter] = useState<WireFilterId>('all');
  const primaryColor = siteSettings.primaryColor || '#E1262D';

  const filteredLive = useMemo(() => {
    const basePool =
      section.categoryFilter && section.categoryFilter !== 'All'
        ? publishedArticles.filter((a) => a.category === section.categoryFilter)
        : publishedArticles;

    const matched = basePool.filter((a) => matchesWireFilter(a, wireFilter));
    const list = matched.length > 0 ? matched : basePool;
    const cap = Math.max(6, section.itemCount || 12);
    return list.slice(0, cap);
  }, [publishedArticles, section.categoryFilter, section.itemCount, wireFilter]);

  const leadDispatch = filteredLive[0];
  const subSpotlight = filteredLive.slice(1, 3);
  const rollingFeed = filteredLive.slice(3);

  const formattedUpdatedTime = useMemo(() => {
    if (!lastLiveNewsUpdatedAt) return 'Synchronizing...';
    const ts = Date.parse(lastLiveNewsUpdatedAt);
    if (Number.isNaN(ts)) return 'Live';
    return new Date(ts).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }, [lastLiveNewsUpdatedAt]);

  return (
    <div>
      {editBar}
      <section
        id="section-live-news"
        aria-label={section.title || 'Live News'}
        className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5"
      >
        {/* Header Bar with Live Sync Timestamp & Refresh */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-3 min-w-0">
            <span
              style={{ backgroundColor: primaryColor }}
              className="w-8 h-8 rounded-md text-white flex items-center justify-center shrink-0 shadow-sm"
            >
              <Radio className="w-4 h-4 animate-pulse" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white tracking-tight">
                  {section.title || 'Live News'}
                </h2>
                <span className="inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-[#E1262D]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E1262D] animate-ping" />
                  Auto-Updating
                </span>
              </div>
              {section.subtitle && (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {section.subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono shrink-0">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400 tabular-nums">
              Synced {formattedUpdatedTime}
            </span>
            <button
              type="button"
              onClick={() => void refreshLiveNews(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 hover:border-[#E1262D] font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${liveNewsLoading ? 'animate-spin text-[#E1262D]' : ''}`} />
              <span>{liveNewsLoading ? 'Updating...' : 'Refresh Wires'}</span>
            </button>
          </div>
        </div>

        {/* Platform & Broadcaster Filter Bar */}
        <div className="flex items-center gap-4 overflow-x-auto pb-1 border-b border-neutral-100 dark:border-neutral-800/80 text-xs font-semibold">
          {WIRE_FILTERS.map((tab) => {
            const active = wireFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setWireFilter(tab.id)}
                style={active ? { color: primaryColor } : undefined}
                className={`relative pb-2.5 whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'text-[#E1262D]'
                    : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
                {active && (
                  <span
                    style={{ backgroundColor: primaryColor }}
                    className="absolute inset-x-0 bottom-0 h-0.5"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Asymmetric 2-Column Live Broadcast + Chronological Wire Timeline */}
        {!leadDispatch ? (
          <div className="p-10 text-center rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-500">
            {liveNewsLoading ? 'Fetching verified national & international news wires...' : 'No live wire stories loaded yet.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            {/* Left 7 Columns: Lead Live Dispatch + 2 Spotlight Cards */}
            <div className="lg:col-span-7 flex flex-col gap-5">
              <article className="relative rounded-xl overflow-hidden bg-[#0B0F17] text-white border border-neutral-200/20 dark:border-neutral-800 shadow-lg flex flex-col justify-between min-h-[340px] group">
                {leadDispatch.videoUrl ? (
                  <video
                    key={`live-lead-vid-${leadDispatch.id}`}
                    src={leadDispatch.videoUrl}
                    poster={leadDispatch.imageUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="absolute inset-0 w-full h-full object-cover opacity-75"
                  />
                ) : (
                  <motion.img
                    key={`live-lead-img-${leadDispatch.id}`}
                    src={leadDispatch.imageUrl}
                    alt={leadDispatch.title}
                    referrerPolicy="no-referrer"
                    initial={{ scale: 1.0, x: 0 }}
                    animate={{ scale: 1.08, x: -8 }}
                    transition={{ duration: 14, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }}
                    className="absolute inset-0 w-full h-full object-cover opacity-70"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-[#080B12] via-[#080B12]/55 to-[#080B12]/25" />

                <div className="relative z-10 p-5 flex items-center justify-between gap-2 text-[11px] font-mono">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-black/65 backdrop-blur-md border border-white/15 text-white font-bold uppercase tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#E1262D] animate-pulse" />
                    {leadDispatch.sourceName || leadDispatch.authorName}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-black/60 backdrop-blur-md text-amber-300 font-bold tabular-nums">
                    {formatRelativeAge(leadDispatch.publishedAt)}
                  </span>
                </div>

                <div className="relative z-10 p-5 sm:p-6 space-y-2.5">
                  <div className="text-[11px] font-mono text-sky-300 uppercase font-bold">
                    {leadDispatch.category} · {leadDispatch.locationName || 'Global Wire'}
                  </div>
                  <button
                    type="button"
                    onClick={() => openArticle(leadDispatch)}
                    className="text-left cursor-pointer block"
                  >
                    <h3 className="font-display text-xl sm:text-3xl font-extrabold leading-tight text-white group-hover:text-neutral-200 transition-colors">
                      {leadDispatch.title}
                    </h3>
                  </button>
                  <p className="text-xs sm:text-sm text-neutral-200/90 line-clamp-2 max-w-2xl">
                    {leadDispatch.excerpt}
                  </p>
                  <div className="pt-1 flex flex-wrap items-center gap-4 text-xs">
                    <button
                      type="button"
                      onClick={() => openArticle(leadDispatch)}
                      className="inline-flex items-center gap-1 font-bold text-white hover:text-[#E1262D] transition-colors cursor-pointer"
                    >
                      <span>Open Full Coverage</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                    {leadDispatch.sourceUrl && (
                      <a
                        href={leadDispatch.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-neutral-300 hover:text-white transition-colors"
                      >
                        <span>Original Dispatch</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </article>

              {subSpotlight.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {subSpotlight.map((sub, idx) => (
                    <article
                      key={sub.id}
                      className="rounded-lg overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-[#E1262D] transition-colors flex flex-col group"
                    >
                      <button
                        type="button"
                        onClick={() => openArticle(sub)}
                        className="relative h-36 overflow-hidden cursor-pointer text-left"
                      >
                        <motion.img
                          src={sub.imageUrl}
                          alt={sub.title}
                          referrerPolicy="no-referrer"
                          animate={{ scale: [1, 1.06] }}
                          transition={{
                            duration: 10 + idx * 2,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                          }}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                        <span className="absolute bottom-2 left-2.5 font-mono text-[10px] font-bold text-white uppercase">
                          {sub.sourceName || sub.authorName} · {formatRelativeAge(sub.publishedAt)}
                        </span>
                      </button>
                      <div className="p-4 flex-1 flex flex-col justify-between">
                        <div>
                          <div className="text-[10px] font-mono uppercase text-[#E1262D] font-bold">
                            {sub.category}
                          </div>
                          <button
                            type="button"
                            onClick={() => openArticle(sub)}
                            className="text-left mt-1 cursor-pointer"
                          >
                            <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#E1262D] transition-colors">
                              {sub.title}
                            </h3>
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            {/* Right 5 Columns: Real-Time Rolling Wire Timeline */}
            <aside className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 sm:p-5 flex flex-col justify-between shadow-sm">
              <div className="flex items-center justify-between gap-2 pb-3 mb-2 border-b border-neutral-200 dark:border-neutral-800">
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                  Rolling Wire Dispatches
                </span>
                <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
                  {filteredLive.length} Active Stories
                </span>
              </div>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 max-h-[465px] overflow-y-auto pr-1">
                {rollingFeed.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => openArticle(item)}
                    className="w-full py-3 first:pt-1.5 last:pb-1.5 text-left flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="relative w-16 h-12 rounded overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800">
                      <img
                        src={item.imageUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      {item.videoUrl && (
                        <span className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <Play className="w-3 h-3 text-white fill-white" />
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                        <span className="truncate font-bold text-[#0D47FF] dark:text-sky-400 uppercase">
                          {item.sourceName || item.authorName}
                        </span>
                        <span className="shrink-0 tabular-nums text-[#E1262D] font-bold">
                          {formatRelativeAge(item.publishedAt)}
                        </span>
                      </div>
                      <h4 className="font-display text-xs sm:text-[13px] font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#E1262D] transition-colors mt-0.5">
                        {item.title}
                      </h4>
                      <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                        {item.category}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </aside>
          </div>
        )}
      </section>
    </div>
  );
}
