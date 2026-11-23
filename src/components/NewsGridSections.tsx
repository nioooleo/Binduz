import {
  ArrowRight,
  Award,
  Bookmark,
  Check,
  Edit3,
  ExternalLink,
  EyeOff,
  FileText,
  Flame,
  Mail,
  Pause,
  Play,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { motion } from 'motion/react';
import React, { useMemo, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { CATEGORIES } from '../data/seedArticles';
import { ActiveView, Article, CategoryName, HomepageSection } from '../types/newspaper';
import { HeroEditorial } from './HeroEditorial';
import { LiveNewsSection } from './LiveNewsSection';
import { AudioNewsSection, VideoNewsSection } from './MediaShowcaseSections';

export function NewsGridSections() {
  const {
    publishedArticles,
    liveNewsLoading,
    homepageSections,
    saveHomepageSections,
    openArticle,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    followedTopics,
    toggleFollowedTopic,
    isBookmarked,
    toggleBookmark,
    campaigns,
    trackCampaignClick,
    subscribeNewsletter,
    setActiveView,
    openCustomPage,
    isStaffAuthenticated,
    bureaus,
    rssFeeds,
    visualEditMode,
    permissions,
    siteSettings,
    t,
  } = useNewspaper();

  const [latestTab, setLatestTab] = useState<'All' | CategoryName>('All');
  const [trendingTab, setTrendingTab] = useState<'All' | CategoryName>('All');
  const [marqueePaused, setMarqueePaused] = useState(false);
  const [bentoTab, setBentoTab] = useState<'All' | CategoryName>('All');
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterFreq, setNewsletterFreq] = useState<'daily' | 'weekly' | 'breaking'>('daily');
  const [subscribedOk, setSubscribedOk] = useState(false);

  const primaryColor = siteSettings.primaryColor || '#E1262D';

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    CATEGORIES.forEach((c) => {
      counts[c] = 0;
    });
    publishedArticles.forEach((a) => {
      counts[a.category] = (counts[a.category] || 0) + 1;
    });
    return counts;
  }, [publishedArticles]);

  // Search / Selected Category Mode
  const searchFiltered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return publishedArticles.filter((art) => {
      const catOk = selectedCategory === 'All' || art.category === selectedCategory;
      const qOk =
        !q ||
        art.title.toLowerCase().includes(q) ||
        art.excerpt.toLowerCase().includes(q) ||
        art.authorName.toLowerCase().includes(q) ||
        (art.sourceName || '').toLowerCase().includes(q) ||
        art.category.toLowerCase().includes(q);
      return catOk && qOk;
    });
  }, [publishedArticles, selectedCategory, searchQuery]);

  const scrollToDomTarget = (slug: string) => {
    const normalized = slug.replace(/_/g, '-');
    const el =
      document.getElementById(`section-${normalized}`) ||
      document.getElementById(normalized);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePromoAction = (rawUrl?: string) => {
    if (!rawUrl || rawUrl.startsWith('scroll:') || rawUrl.startsWith('section:')) {
      const slug = rawUrl?.includes(':') ? rawUrl.split(':')[1] : 'newsletter';
      scrollToDomTarget(slug);
      return;
    }
    if (rawUrl.startsWith('view:') && isStaffAuthenticated) {
      setActiveView(rawUrl.slice(5) as ActiveView);
    } else if (rawUrl.startsWith('page:')) {
      openCustomPage(rawUrl.slice(5));
    } else if (rawUrl.startsWith('category:')) {
      setSearchQuery('');
      setSelectedCategory(rawUrl.slice(9) as CategoryName);
    } else if (/^https?:\/\//i.test(rawUrl)) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
    } else {
      scrollToDomTarget('newsletter');
    }
  };

  const handleHideSection = async (secId: string) => {
    const next = homepageSections.map((s) => (s.id === secId ? { ...s, visible: false } : s));
    await saveHomepageSections(next);
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await subscribeNewsletter(newsletterEmail, newsletterFreq);
    if (ok) {
      setSubscribedOk(true);
      setNewsletterEmail('');
    }
  };

  const renderSectionEditBar = (sec: HomepageSection) => {
    if (!visualEditMode || !permissions.canCustomizeSite) return null;
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mb-2 flex items-center justify-between gap-2 text-xs">
        <div className="w-full px-3 py-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 flex items-center justify-between gap-3">
          <span className="font-semibold text-amber-900 dark:text-amber-200">
            Editable Section: <strong>{sec.title}</strong> ({sec.sectionType})
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleHideSection(sec.id)}
              className="inline-flex items-center gap-1 text-neutral-700 dark:text-neutral-200 hover:text-[#E1262D] font-semibold cursor-pointer"
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>Hide</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveView('newsroom')}
              className="inline-flex items-center gap-1 font-bold text-[#E1262D] hover:underline cursor-pointer"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Customize in CMS</span>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Search / Category Filter View
  if (searchQuery.trim() || selectedCategory !== 'All') {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800 mb-8">
          <div>
            <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
              {selectedCategory !== 'All' ? `${selectedCategory} Desk` : 'Search Dispatches'}
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              {searchFiltered.length} verified dispatches
              {searchQuery.trim() ? ` matching "${searchQuery.trim()}"` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedCategory('All');
              setSearchQuery('');
            }}
            className="text-xs font-semibold text-[#E1262D] hover:underline cursor-pointer"
          >
            Reset Filter
          </button>
        </div>

        {searchFiltered.length === 0 ? (
          <div className="p-10 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              No dispatches matched your current criteria.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {searchFiltered.map((article) => (
              <article
                key={article.id}
                className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden flex flex-col group"
              >
                <button
                  type="button"
                  onClick={() => openArticle(article)}
                  className="text-left cursor-pointer"
                >
                  <img
                    src={article.imageUrl}
                    alt={article.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-48 object-cover group-hover:scale-[1.02] transition-transform duration-300"
                  />
                </button>
                <div className="p-5 flex-1 flex flex-col">
                  <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                    <span style={{ color: primaryColor }} className="font-bold uppercase">
                      {article.category}
                    </span>{' '}
                    · {article.displayDate}
                  </div>
                  <button
                    type="button"
                    onClick={() => openArticle(article)}
                    className="text-left mt-2 cursor-pointer"
                  >
                    <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-white group-hover:text-[#E1262D] transition-colors leading-snug">
                      {article.title}
                    </h3>
                  </button>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-2 line-clamp-2 flex-1">
                    {article.excerpt}
                  </p>
                  <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
                    <span>{article.sourceName || article.authorName}</span>
                    <button
                      type="button"
                      onClick={() => void toggleBookmark(article)}
                      aria-label="Bookmark article"
                      className="text-neutral-400 hover:text-[#E1262D] cursor-pointer"
                    >
                      <Bookmark
                        className={`w-4 h-4 ${isBookmarked(article.id) ? 'fill-[#E1262D] text-[#E1262D]' : ''}`}
                      />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  const filterForSection = (sec: HomepageSection, predicate?: (a: Article) => boolean) => {
    let pool = publishedArticles;
    if (sec.categoryFilter && sec.categoryFilter !== 'All') {
      const catPool = pool.filter((a) => a.category === sec.categoryFilter);
      if (catPool.length > 0) pool = catPool;
    }
    if (predicate) {
      const matching = pool.filter(predicate);
      if (matching.length > 0) pool = matching;
    }
    return pool.slice(0, sec.itemCount || 6);
  };

  const renderSection = (sec: HomepageSection) => {
    if (!sec.visible) return null;

    switch (sec.sectionType) {
      case 'hero_slider_trending':
        return <HeroEditorial key={sec.id} sectionConfig={sec} />;

      case 'breaking_news': {
        const items = filterForSection(sec, (a) => Boolean(a.isBreaking));
        if (items.length === 0) return null;
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-3 mb-5">
                <Zap style={{ color: primaryColor }} className="w-5 h-5 shrink-0" />
                <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                  {sec.title}
                </h2>
                <span className="h-[2px] flex-1 bg-gradient-to-r from-[#E1262D] via-[#E1262D]/30 to-transparent" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {items.map((art) => (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => openArticle(art)}
                    className="text-left p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md hover:border-[#E1262D] transition-colors group cursor-pointer"
                  >
                    <div className="text-[11px] font-mono text-neutral-500">
                      <span style={{ color: primaryColor }} className="font-bold uppercase">
                        {art.category}
                      </span>{' '}
                      · {art.displayDate}
                    </div>
                    <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white mt-1.5 group-hover:text-[#E1262D] leading-snug">
                      {art.title}
                    </h3>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1.5 line-clamp-2">
                      {art.excerpt}
                    </p>
                  </button>
                ))}
              </div>
            </section>
          </div>
        );
      }

      case 'latest_news': {
        const filteredLatest = publishedArticles
          .filter((a) => latestTab === 'All' || a.category === latestTab)
          .slice(0, Math.max(6, sec.itemCount || 10));
        const marqueeItems =
          filteredLatest.length >= 2 ? [...filteredLatest, ...filteredLatest] : filteredLatest;
        const personalized = publishedArticles
          .filter((a) => followedTopics.length === 0 || followedTopics.includes(a.category))
          .slice(0, 3);
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section id="section-latest-news" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[#E1262D] animate-pulse shrink-0" />
                  <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                    {sec.title}
                  </h2>
                  <span className="h-[2px] flex-1 bg-gradient-to-r from-[#E1262D] via-[#E1262D]/30 to-transparent" />
                </div>

                <div className="flex items-center gap-3 overflow-x-auto">
                  <div className="flex items-center gap-3.5 text-xs font-semibold overflow-x-auto">
                    {(['All', ...CATEGORIES] as const).slice(0, 8).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setLatestTab(tab)}
                        className={`whitespace-nowrap cursor-pointer transition-colors ${
                          latestTab === tab
                            ? 'text-[#E1262D] underline underline-offset-4'
                            : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setMarqueePaused((p) => !p)}
                    aria-label={marqueePaused ? 'Resume horizontal scroll' : 'Pause horizontal scroll'}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-[11px] font-semibold hover:border-[#E1262D] cursor-pointer shrink-0"
                  >
                    {marqueePaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                    <span>{marqueePaused ? 'Scroll' : 'Pause'}</span>
                  </button>
                </div>
              </div>

              {filteredLatest.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md text-xs text-neutral-500">
                  {liveNewsLoading ? 'Synchronizing live news dispatches...' : 'No dispatches in this desk yet.'}
                </div>
              ) : (
                <div className="binduz-marquee-container relative overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/75 backdrop-blur-md py-4 px-2 shadow-sm">
                  <div className={`binduz-marquee-track gap-4 ${marqueePaused ? 'is-paused' : ''}`}>
                    {marqueeItems.map((item, idx) => (
                      <article
                        key={`${item.id}-${idx}`}
                        className="w-[300px] sm:w-[340px] shrink-0 bg-white dark:bg-neutral-950/90 border border-neutral-200/90 dark:border-neutral-800 rounded-lg overflow-hidden flex items-center gap-3.5 p-3 hover:-translate-y-0.5 hover:border-[#E1262D] hover:shadow-lg transition-all duration-300 group"
                      >
                        <button
                          type="button"
                          onClick={() => openArticle(item)}
                          className="relative w-24 h-20 rounded-md overflow-hidden shrink-0 cursor-pointer"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                        <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                          <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 truncate">
                            <span style={{ color: primaryColor }} className="font-bold uppercase">
                              {item.category}
                            </span>{' '}
                            · {item.displayDate}
                          </div>
                          <button
                            type="button"
                            onClick={() => openArticle(item)}
                            className="text-left mt-1 cursor-pointer"
                          >
                            <h3 className="font-display text-xs sm:text-[13px] font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#E1262D] transition-colors">
                              {item.title}
                            </h3>
                          </button>
                          <div className="mt-1.5 flex items-center justify-between text-[10px] text-neutral-500">
                            <span className="truncate max-w-[130px]">{item.sourceName || item.authorName}</span>
                            <button
                              type="button"
                              onClick={() => void toggleBookmark(item)}
                              aria-label="Save bookmark"
                              className="hover:text-[#E1262D] cursor-pointer"
                            >
                              <Bookmark
                                className={`w-3 h-3 ${
                                  isBookmarked(item.id) ? 'fill-[#E1262D] text-[#E1262D]' : ''
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* Topic Following Personalized Strip */}
              <div className="pt-3 border-t border-neutral-200/80 dark:border-neutral-800">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0D47FF] dark:text-sky-400">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Follow Topics for Your Personal Desk</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {CATEGORIES.slice(0, 7).map((cat) => {
                      const followed = followedTopics.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleFollowedTopic(cat)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold rounded border transition-colors cursor-pointer ${
                            followed
                              ? 'border-[#0D47FF] bg-[#0D47FF]/10 text-[#0D47FF] dark:text-sky-300'
                              : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400'
                          }`}
                        >
                          {followed && <Check className="w-3 h-3" />}
                          <span>{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {personalized.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {personalized.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => openArticle(p)}
                        className="text-left p-3.5 rounded-lg bg-white/85 dark:bg-neutral-900/85 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 hover:border-[#0D47FF] hover:shadow-md transition-all cursor-pointer"
                      >
                        <div className="text-[10px] font-mono text-[#0D47FF] dark:text-sky-400 font-bold uppercase">
                          {p.category} · {p.readMinutes || 3} min read
                        </div>
                        <div className="font-display text-sm font-bold mt-1 line-clamp-2">{p.title}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        );
      }

      case 'live_news':
        return (
          <LiveNewsSection
            key={sec.id}
            section={sec}
            editBar={renderSectionEditBar(sec)}
          />
        );

      case 'trending_now': {
        const flagged = publishedArticles.filter((a) => a.isTrending);
        const basePool = flagged.length >= 4 ? flagged : publishedArticles;
        const trendingCards = basePool
          .filter((a) => trendingTab === 'All' || a.category === trendingTab)
          .slice(0, sec.itemCount || 6);
        const list = trendingCards.length > 0 ? trendingCards : basePool.slice(0, sec.itemCount || 6);
        if (list.length === 0) return null;

        const trendingTabs: Array<{ label: string; value: 'All' | CategoryName }> = [
          { label: 'All', value: 'All' },
          { label: 'National', value: 'Bangladesh National' },
          { label: 'Politics', value: 'Politics' },
          { label: 'Economy', value: 'Economy' },
          { label: 'Technology', value: 'Technology' },
          { label: 'Sports', value: 'Sports' },
          { label: 'Entertainment', value: 'Entertainment' },
          { label: 'International', value: 'International' },
        ];

        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section id="section-trending-now" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <Flame style={{ color: primaryColor }} className="w-5 h-5 shrink-0" />
                  <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                    {sec.title}
                  </h2>
                  <span className="h-[2px] flex-1 bg-gradient-to-r from-[#E1262D] via-[#0D47FF]/30 to-transparent" />
                </div>

                <div className="flex items-center gap-3.5 text-xs font-semibold overflow-x-auto">
                  {trendingTabs.map((tab) => (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setTrendingTab(tab.value)}
                      className={`whitespace-nowrap cursor-pointer transition-colors ${
                        trendingTab === tab.value
                          ? 'text-[#E1262D] underline underline-offset-4'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {list.map((item, idx) => {
                  const hasVideo = Boolean(item.videoUrl) || idx % 2 === 0;
                  return (
                    <motion.article
                      key={item.id}
                      initial={{ opacity: 0, y: 12 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.15 }}
                      transition={{ duration: 0.35, delay: (idx % 3) * 0.06 }}
                      className="rounded-xl overflow-hidden bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 hover:border-[#E1262D] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 flex flex-col group"
                    >
                      <button
                        type="button"
                        onClick={() => openArticle(item)}
                        className="relative h-48 overflow-hidden cursor-pointer text-left bg-neutral-950"
                      >
                        {item.videoUrl ? (
                          <video
                            src={item.videoUrl}
                            poster={item.imageUrl}
                            autoPlay
                            muted
                            loop
                            playsInline
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <motion.img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            animate={{
                              scale: [1, 1.075],
                              x: idx % 2 === 0 ? [0, -8] : [0, 8],
                            }}
                            transition={{
                              duration: 9 + (idx % 3) * 2,
                              repeat: Infinity,
                              repeatType: 'reverse',
                              ease: 'easeInOut',
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-black/75 backdrop-blur-md text-white font-mono text-[10px] font-bold tabular-nums">
                          #0{idx + 1} TRENDING
                        </span>
                        {hasVideo && (
                          <span
                            style={{ backgroundColor: primaryColor }}
                            className="absolute bottom-3 right-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-white text-[10px] font-bold shadow-lg"
                          >
                            <Play className="w-3 h-3 fill-white" />
                            <span>{item.videoUrl ? 'Video Reel' : 'Animated Brief'}</span>
                          </span>
                        )}
                        <motion.span
                          aria-hidden="true"
                          animate={{ scaleX: [0.18, 1] }}
                          transition={{
                            duration: 7 + (idx % 3) * 2,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          style={{ backgroundColor: primaryColor, transformOrigin: 'left' }}
                          className="absolute bottom-0 left-0 right-0 h-[2.5px] opacity-90"
                        />
                      </button>

                      <div className="p-4 sm:p-5 flex-1 flex flex-col">
                        <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                          <span style={{ color: primaryColor }} className="font-bold uppercase">
                            {item.category}
                          </span>{' '}
                          · <span className="tabular-nums">{item.displayDate}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openArticle(item)}
                          className="text-left mt-1.5 cursor-pointer"
                        >
                          <h3 className="font-display text-base sm:text-lg font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#E1262D] transition-colors">
                            {item.title}
                          </h3>
                        </button>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2 flex-1">
                          {item.excerpt}
                        </p>
                        <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-500">
                          <span className="truncate max-w-[180px]">{item.sourceName || item.authorName}</span>
                          <button
                            type="button"
                            onClick={() => void toggleBookmark(item)}
                            aria-label="Save trending story"
                            className="hover:text-[#E1262D] cursor-pointer"
                          >
                            <Bookmark
                              className={`w-3.5 h-3.5 ${
                                isBookmarked(item.id) ? 'fill-[#E1262D] text-[#E1262D]' : ''
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </div>
            </section>
          </div>
        );
      }

      case 'video_news':
        return (
          <VideoNewsSection
            key={sec.id}
            section={sec}
            editBar={renderSectionEditBar(sec)}
          />
        );

      case 'audio_news':
        return (
          <AudioNewsSection
            key={sec.id}
            section={sec}
            editBar={renderSectionEditBar(sec)}
          />
        );

      case 'brand_promotions': {
        const activeCampaigns = campaigns.filter((c) => c.status === 'active');
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Editable Brand Promotion Banner */}
                <div
                  style={sec.accentColor ? { borderColor: sec.accentColor } : undefined}
                  className="lg:col-span-7 relative rounded-md overflow-hidden bg-[#0E1522] text-white p-7 sm:p-9 flex flex-col justify-between min-h-[260px]"
                >
                  {sec.promoImageUrl && (
                    <img
                      src={sec.promoImageUrl}
                      alt={sec.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover opacity-30"
                    />
                  )}
                  <div className="relative z-10 max-w-xl">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-amber-300 font-bold">
                      {sec.subtitle || 'Brand Promotion'}
                    </span>
                    <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1.5 leading-tight">
                      {sec.promoHeadline || sec.title}
                    </h2>
                    {sec.promoBody && (
                      <p className="text-xs sm:text-sm text-neutral-300 mt-3 leading-relaxed">
                        {sec.promoBody}
                      </p>
                    )}
                  </div>
                  <div className="relative z-10 mt-6 flex flex-wrap items-center gap-3">
                    {sec.promoButtonText && (
                      <button
                        type="button"
                        onClick={() => handlePromoAction(sec.promoButtonUrl)}
                        style={{ backgroundColor: sec.accentColor || primaryColor }}
                        className="inline-flex items-center gap-2 px-5 py-2.5 text-white text-xs font-bold rounded hover:opacity-90 cursor-pointer"
                      >
                        <span>{sec.promoButtonText}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {activeCampaigns.slice(0, 1).map((camp) => (
                      <button
                        key={camp.id}
                        type="button"
                        onClick={() => {
                          void trackCampaignClick(camp);
                          handlePromoAction(camp.targetUrl);
                        }}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded cursor-pointer"
                      >
                        <span>
                          {camp.sponsor}: {camp.title}
                        </span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Live Desk Metrics + Working Newsletter Subscription */}
                <div className="lg:col-span-5 flex flex-col gap-4">
                  <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4">
                    <div className="text-xs font-bold uppercase tracking-wider text-[#E1262D] mb-2.5">
                      {t.socialFeed}
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-950">
                        <div className="font-mono text-lg font-extrabold text-neutral-900 dark:text-white tabular-nums">
                          {publishedArticles.length}
                        </div>
                        <div className="text-[10px] text-neutral-500 uppercase">Live Stories</div>
                      </div>
                      <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-950">
                        <div className="font-mono text-lg font-extrabold text-neutral-900 dark:text-white tabular-nums">
                          {bureaus.length}
                        </div>
                        <div className="text-[10px] text-neutral-500 uppercase">Global Bureaus</div>
                      </div>
                      <div className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-950">
                        <div className="font-mono text-lg font-extrabold text-neutral-900 dark:text-white tabular-nums">
                          {rssFeeds.filter((f) => f.enabled).length || 8}
                        </div>
                        <div className="text-[10px] text-neutral-500 uppercase">Verified Wires</div>
                      </div>
                    </div>
                  </div>

                  <form
                    id="section-newsletter"
                    onSubmit={handleNewsletterSubmit}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4 flex-1 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold text-neutral-900 dark:text-white mb-1">
                        <Mail className="w-3.5 h-3.5 text-[#E1262D]" />
                        <span>{t.newsletterTitle}</span>
                      </div>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">
                        Morning editorial briefing &amp; AI-indexed intelligence stored in subscriber database.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="reader@domain.com"
                        className="w-full px-3 py-1.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-white focus:outline-none focus:border-[#E1262D]"
                      />
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Newsletter frequency"
                          value={newsletterFreq}
                          onChange={(e) =>
                            setNewsletterFreq(e.target.value as 'daily' | 'weekly' | 'breaking')
                          }
                          className="px-2 py-1.5 text-[11px] bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded cursor-pointer"
                        >
                          <option value="daily">Daily</option>
                          <option value="breaking">Breaking</option>
                          <option value="weekly">Weekly</option>
                        </select>
                        <button
                          type="submit"
                          style={{ backgroundColor: primaryColor }}
                          className="flex-1 py-1.5 px-3 text-white text-xs font-bold rounded hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          {subscribedOk ? 'Subscribed' : t.newsletterCta}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </section>
          </div>
        );
      }

      case 'editors_picks': {
        const picks = filterForSection(sec, (a) => Boolean(a.isEditorsPick));
        if (picks.length === 0) return null;
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="flex items-center gap-3 mb-5">
                <Award style={{ color: primaryColor }} className="w-5 h-5 shrink-0" />
                <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                  {sec.title}
                </h2>
                <span className="h-[2px] flex-1 bg-gradient-to-r from-[#0D47FF] via-[#0D47FF]/30 to-transparent" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {picks.map((pick) => (
                  <article
                    key={pick.id}
                    className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden flex flex-col group"
                  >
                    <button
                      type="button"
                      onClick={() => openArticle(pick)}
                      className="cursor-pointer overflow-hidden"
                    >
                      <img
                        src={pick.imageUrl}
                        alt={pick.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </button>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="text-[10px] font-mono uppercase text-[#0D47FF] dark:text-sky-400 font-bold">
                        {pick.category}
                      </div>
                      <button
                        type="button"
                        onClick={() => openArticle(pick)}
                        className="text-left mt-1 cursor-pointer"
                      >
                        <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#E1262D]">
                          {pick.title}
                        </h3>
                      </button>
                      <p className="text-[11px] text-neutral-500 mt-auto pt-2">
                        {pick.sourceName || pick.authorName}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </div>
        );
      }

      case 'most_read': {
        const sorted = [...publishedArticles]
          .sort((a, b) => (b.views + b.likesCount * 5) - (a.views + a.likesCount * 5))
          .slice(0, sec.itemCount || 5);
        if (sorted.length === 0) return null;
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6">
                <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-[#E1262D]" />
                    <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
                      {sec.title}
                    </h2>
                  </div>
                  <span className="font-mono text-xs text-neutral-400">{sec.subtitle}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {sorted.map((story, idx) => (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => openArticle(story)}
                      className="text-left p-3 rounded hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer group flex flex-col justify-between border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700"
                    >
                      <div>
                        <div className="font-mono text-2xl font-black text-[#E1262D]/80 tabular-nums">
                          0{idx + 1}
                        </div>
                        <div className="text-[10px] font-mono uppercase text-neutral-500 mt-1">
                          {story.category}
                        </div>
                        <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white leading-snug mt-1 group-hover:text-[#E1262D] line-clamp-3">
                          {story.title}
                        </h3>
                      </div>
                      <div className="mt-3 text-[10px] font-mono text-neutral-400">
                        {story.views > 0 ? `${story.views} views` : story.readMinutes ? `${story.readMinutes} min read` : 'Live'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          </div>
        );
      }

      case 'categories_bento': {
        const pool = publishedArticles.filter((a) => bentoTab === 'All' || a.category === bentoTab);
        const bentoStories = (pool.length >= 5 ? pool : publishedArticles).slice(0, 5);
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section id="section-categories-bento" className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-[200px]">
                  <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                    {sec.title}
                  </h2>
                  <span className="h-[2px] flex-1 bg-gradient-to-r from-[#E1262D] via-[#E1262D]/30 to-transparent" />
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold overflow-x-auto">
                  {(['All', ...CATEGORIES] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setBentoTab(tab)}
                      className={`whitespace-nowrap cursor-pointer transition-colors ${
                        bentoTab === tab
                          ? 'text-[#E1262D] underline underline-offset-4'
                          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic Category Count Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCategory(cat)}
                    className="p-2.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-[#E1262D] text-left transition-colors cursor-pointer"
                  >
                    <div className="text-xs font-bold text-neutral-900 dark:text-white truncate">{cat}</div>
                    <div className="font-mono text-[11px] text-[#E1262D] font-bold mt-0.5 tabular-nums">
                      {String(categoryCounts[cat] || 0).padStart(2, '0')} stories
                    </div>
                  </button>
                ))}
              </div>

              {bentoStories.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  <div className="lg:col-span-3 flex flex-col gap-6">
                    {bentoStories.slice(0, 2).map((item) => (
                      <div
                        key={item.id}
                        className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden flex flex-col group"
                      >
                        <button
                          type="button"
                          onClick={() => openArticle(item)}
                          className="cursor-pointer overflow-hidden"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                        <div className="p-4">
                          <div className="text-[11px] font-mono text-neutral-500">
                            <span className="text-[#E1262D] font-bold">{item.category}</span> ·{' '}
                            {item.displayDate}
                          </div>
                          <button
                            type="button"
                            onClick={() => openArticle(item)}
                            className="text-left mt-1 cursor-pointer"
                          >
                            <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white leading-snug group-hover:text-[#E1262D]">
                              {item.title}
                            </h3>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {bentoStories[2] && (
                    <div className="lg:col-span-6 relative min-h-[360px] rounded-md overflow-hidden flex flex-col justify-end p-6 bg-neutral-900 group">
                      <img
                        src={bentoStories[2].imageUrl}
                        alt={bentoStories[2].title}
                        referrerPolicy="no-referrer"
                        className="absolute inset-0 w-full h-full object-cover opacity-85 group-hover:scale-[1.03] transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                      <div className="relative z-10">
                        <div className="flex items-center gap-2 text-xs text-neutral-300 mb-2">
                          <span className="px-2 py-0.5 bg-[#E1262D] text-white font-bold rounded-sm">
                            {bentoStories[2].category}
                          </span>
                          <span className="font-mono">{bentoStories[2].displayDate}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openArticle(bentoStories[2])}
                          className="text-left cursor-pointer"
                        >
                          <h3 className="font-display text-2xl font-bold text-white leading-snug group-hover:text-neutral-200">
                            {bentoStories[2].title}
                          </h3>
                        </button>
                        <p className="text-xs text-neutral-200/90 mt-2 line-clamp-2 max-w-lg">
                          {bentoStories[2].excerpt}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="lg:col-span-3 flex flex-col gap-6">
                    {bentoStories.slice(3, 5).map((item) => (
                      <div
                        key={item.id}
                        className="flex-1 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden flex flex-col group"
                      >
                        <button
                          type="button"
                          onClick={() => openArticle(item)}
                          className="cursor-pointer overflow-hidden"
                        >
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </button>
                        <div className="p-4">
                          <div className="text-[11px] font-mono text-neutral-500">
                            <span className="text-[#E1262D] font-bold">{item.category}</span> ·{' '}
                            {item.displayDate}
                          </div>
                          <button
                            type="button"
                            onClick={() => openArticle(item)}
                            className="text-left mt-1 cursor-pointer"
                          >
                            <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-white leading-snug group-hover:text-[#E1262D]">
                              {item.title}
                            </h3>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>
        );
      }

      case 'special_reports': {
        const reports = filterForSection(sec, (a) => Boolean(a.isSpecialReport));
        if (reports.length === 0) return null;
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-6">
              <div className="flex items-center gap-3 mb-6">
                <FileText className="w-5 h-5 text-[#0D47FF] shrink-0" />
                <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                  {sec.title}
                </h2>
                <span className="h-[2px] flex-1 bg-gradient-to-r from-[#0D47FF] via-[#0D47FF]/30 to-transparent" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="relative min-h-[270px] rounded-md overflow-hidden flex flex-col justify-end p-6 bg-neutral-950 text-white group"
                  >
                    <img
                      src={rep.imageUrl}
                      alt={rep.title}
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 w-full h-full object-cover opacity-55 group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />
                    <div className="relative z-10">
                      <div className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-300 mb-2">
                        <TrendingUp className="w-3.5 h-3.5" />
                        <span>Special Report · {rep.category}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openArticle(rep)}
                        className="text-left cursor-pointer"
                      >
                        <h3 className="font-display text-lg font-bold leading-snug group-hover:text-neutral-200">
                          {rep.title}
                        </h3>
                      </button>
                      <p className="text-xs text-neutral-300 mt-2 line-clamp-2">{rep.excerpt}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        );
      }

      case 'custom_banner':
        return (
          <div key={sec.id}>
            {renderSectionEditBar(sec)}
            <section className="max-w-7xl mx-auto px-4 sm:px-6">
              <div
                style={{ backgroundColor: sec.accentColor || '#0D47FF' }}
                className="rounded-md p-7 sm:p-10 text-white flex flex-wrap items-center justify-between gap-6"
              >
                <div className="max-w-2xl">
                  {sec.subtitle && (
                    <div className="font-mono text-[11px] uppercase tracking-widest opacity-80 mb-1">
                      {sec.subtitle}
                    </div>
                  )}
                  <h2 className="font-display text-2xl sm:text-3xl font-bold">
                    {sec.promoHeadline || sec.title}
                  </h2>
                  {sec.promoBody && <p className="text-sm opacity-90 mt-2">{sec.promoBody}</p>}
                </div>
                {sec.promoButtonText && (
                  <button
                    type="button"
                    onClick={() => handlePromoAction(sec.promoButtonUrl)}
                    className="px-5 py-2.5 bg-white text-neutral-900 font-bold text-xs rounded hover:opacity-90 cursor-pointer shrink-0"
                  >
                    {sec.promoButtonText}
                  </button>
                )}
              </div>
            </section>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-12 pb-8">
      {[...homepageSections]
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((sec) => renderSection(sec))}
    </div>
  );
}
