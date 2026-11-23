import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  CloudSun,
  Edit3,
  Flame,
  Headphones,
  LayoutGrid,
  Pause,
  Play,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useMemo, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { HomepageSection } from '../types/newspaper';

export function HeroEditorial({ sectionConfig }: { sectionConfig?: HomepageSection }) {
  const {
    publishedArticles,
    liveNewsLoading,
    openArticle,
    bureaus,
    selectedBureauId,
    setSelectedBureauId,
    setActiveView,
    visualEditMode,
    permissions,
    t,
  } = useNewspaper();

  const sliderCount = sectionConfig?.itemCount || 5;
  const autoPlayMs = sectionConfig?.autoPlayMs || 6000;

  const featuredSlides = useMemo(() => {
    const flagged = publishedArticles.filter((a) => a.isFeatured);
    const pool = flagged.length >= 3 ? flagged : publishedArticles;
    return pool.slice(0, sliderCount);
  }, [publishedArticles, sliderCount]);

  const trendingSidebar = useMemo(() => {
    const flagged = publishedArticles.filter((a) => a.isTrending);
    const pool = flagged.length >= 4 ? flagged : publishedArticles;
    return pool.slice(0, 5);
  }, [publishedArticles]);

  const [slideIdx, setSlideIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || featuredSlides.length <= 1) return;
    const timer = setInterval(() => {
      setSlideIdx((i) => (i + 1) % featuredSlides.length);
    }, autoPlayMs);
    return () => clearInterval(timer);
  }, [paused, featuredSlides.length, autoPlayMs]);

  const activeSlide = featuredSlides[slideIdx % Math.max(1, featuredSlides.length)];
  const activeBureau = bureaus.find((b) => b.id === selectedBureauId) || bureaus[0];

  if (sectionConfig && !sectionConfig.visible) return null;

  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section aria-label="Featured News & Trending Now" className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-4">
      {visualEditMode && permissions.canCustomizeSite && (
        <div className="mb-3 flex items-center justify-between px-3 py-1.5 rounded bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 text-xs">
          <span className="font-semibold text-amber-900 dark:text-amber-200">
            Section: {sectionConfig?.title || '70% Featured News Slider + 25% Trending Now Sidebar'}
          </span>
          <button
            type="button"
            onClick={() => setActiveView('newsroom')}
            className="inline-flex items-center gap-1 font-bold text-[#E1262D] hover:underline cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Customize Section</span>
          </button>
        </div>
      )}

      {/* 70% Automatic Featured News Slider + 25% Trending Now Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,70fr)_minmax(0,25fr)] gap-6 items-stretch">
        {/* LEFT 70%: Automatic Featured News Slider */}
        <div
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          className="relative min-h-[430px] sm:min-h-[500px] rounded-lg overflow-hidden bg-[#0B0F17] text-white flex flex-col justify-between shadow-xl border border-white/10"
        >
          {activeSlide ? (
            <>
              {activeSlide.videoUrl ? (
                <video
                  key={`hero-vid-${activeSlide.id}`}
                  src={activeSlide.videoUrl}
                  poster={activeSlide.imageUrl}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
              ) : (
                <motion.img
                  key={`hero-img-${activeSlide.id}`}
                  src={activeSlide.imageUrl}
                  alt={activeSlide.title}
                  referrerPolicy="no-referrer"
                  initial={{ scale: 1.0, opacity: 0.6 }}
                  animate={{ scale: 1.07, opacity: 0.78 }}
                  transition={{ duration: 12, ease: 'linear' }}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b12] via-[#080b12]/55 to-[#080b12]/25" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b12]/85 via-[#080b12]/35 to-transparent" />

              {/* Top Bar inside Slider: Bureau Real Weather + Slider Controls */}
              <div className="relative z-10 p-4 sm:p-6 flex flex-wrap items-start justify-between gap-3">
                <div className="inline-flex items-center gap-2 bg-black/55 backdrop-blur-md border border-white/15 rounded px-3 py-1.5 text-xs">
                  <CloudSun className="w-4 h-4 text-sky-300 shrink-0" />
                  <select
                    aria-label="Select bureau city weather"
                    value={activeBureau.id}
                    onChange={(e) => setSelectedBureauId(e.target.value)}
                    className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer"
                  >
                    {bureaus.map((b) => (
                      <option key={b.id} value={b.id} className="text-neutral-900">
                        {b.city}
                      </option>
                    ))}
                  </select>
                  <span className="text-white/40">·</span>
                  <span className="font-mono font-bold tabular-nums">
                    {activeBureau.weatherTempC || 'Live'}
                  </span>
                  {activeBureau.weatherTempF && (
                    <span className="hidden sm:inline font-mono text-white/75 tabular-nums">
                      ({activeBureau.weatherTempF})
                    </span>
                  )}
                </div>

                {/* Auto-Slider Controls */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPaused((p) => !p)}
                    aria-label={paused ? 'Resume auto slider' : 'Pause auto slider'}
                    className="w-8 h-8 rounded bg-black/55 backdrop-blur-md hover:bg-black/80 border border-white/15 flex items-center justify-center cursor-pointer"
                  >
                    {paused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIdx((i) => (i - 1 + featuredSlides.length) % Math.max(1, featuredSlides.length))
                    }
                    aria-label="Previous featured story"
                    className="w-8 h-8 rounded bg-black/55 backdrop-blur-md hover:bg-[#E1262D] border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSlideIdx((i) => (i + 1) % Math.max(1, featuredSlides.length))
                    }
                    aria-label="Next featured story"
                    className="w-8 h-8 rounded bg-black/55 backdrop-blur-md hover:bg-[#E1262D] border border-white/15 flex items-center justify-center transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Bottom Lead Headline & Slide Indicators */}
              <motion.div
                key={`hero-copy-${activeSlide.id}`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
                className="relative z-10 p-5 sm:p-8 space-y-3"
              >
                <div className="flex flex-wrap items-center gap-2.5 text-xs">
                  <span className="px-2.5 py-0.5 bg-[#E1262D] text-white font-bold uppercase tracking-wider rounded-sm">
                    {activeSlide.category}
                  </span>
                  <span className="font-mono text-neutral-300">{activeSlide.displayDate}</span>
                  {activeSlide.sourceName && (
                    <>
                      <span className="text-neutral-500">·</span>
                      <span className="font-mono text-amber-300">{activeSlide.sourceName}</span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => openArticle(activeSlide)}
                  className="text-left group cursor-pointer block"
                >
                  <h1 className="font-display text-2xl sm:text-4xl lg:text-[40px] font-extrabold leading-[1.12] tracking-tight text-white group-hover:text-neutral-200 transition-colors">
                    {activeSlide.title}
                  </h1>
                </button>

                <p className="text-xs sm:text-sm text-neutral-200/90 leading-relaxed max-w-2xl line-clamp-2">
                  {activeSlide.excerpt}
                </p>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-xs text-neutral-300">
                    <span className="font-semibold text-white">By {activeSlide.authorName}</span>
                    <span className="text-neutral-500">·</span>
                    <button
                      type="button"
                      onClick={() => openArticle(activeSlide)}
                      className="inline-flex items-center gap-1 font-bold text-white hover:text-[#E1262D] transition-colors cursor-pointer"
                    >
                      <span>Read Full Dispatch</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Slide Bars */}
                  <div className="flex items-center gap-1.5">
                    {featuredSlides.map((s, idx) => (
                      <button
                        key={s.id}
                        type="button"
                        aria-label={`Show slide ${idx + 1}`}
                        onClick={() => setSlideIdx(idx)}
                        className={`h-1.5 rounded-full transition-all cursor-pointer ${
                          idx === slideIdx % featuredSlides.length
                            ? 'w-7 bg-[#E1262D]'
                            : 'w-2.5 bg-white/35 hover:bg-white/60'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
              <p className="font-display text-xl font-bold">
                {liveNewsLoading ? 'Loading Verified Global Dispatches...' : 'No Published Featured Dispatches'}
              </p>
              <p className="text-xs text-neutral-400 mt-2">
                Refreshing live Bangladesh and international news wires...
              </p>
            </div>
          )}
        </div>

        {/* RIGHT 25%: Trending Now Sidebar */}
        <aside className="bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border border-neutral-200 dark:border-neutral-800 rounded-lg p-4 sm:p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#E1262D]" />
                <h2 className="font-display text-base font-bold text-neutral-900 dark:text-white uppercase tracking-tight">
                  {t.trending}
                </h2>
              </div>
              <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                Top {trendingSidebar.length}
              </span>
            </div>

            {trendingSidebar.length === 0 ? (
              <p className="text-xs text-neutral-500 py-6">
                {liveNewsLoading ? 'Fetching trending wire dispatches...' : 'No trending dispatches right now.'}
              </p>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {trendingSidebar.map((story, idx) => (
                  <button
                    key={story.id}
                    type="button"
                    onClick={() => openArticle(story)}
                    className="w-full py-2.5 first:pt-1 last:pb-1 text-left flex items-center gap-2.5 group cursor-pointer"
                  >
                    <span className="font-mono text-sm font-extrabold text-[#E1262D]/85 leading-none tabular-nums w-5 shrink-0">
                      0{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400 uppercase truncate">
                        <span className="text-[#0D47FF] dark:text-sky-400 font-bold">{story.category}</span> ·{' '}
                        {story.sourceName || `${story.readMinutes || 3}m`}
                      </div>
                      <h3 className="text-xs sm:text-[13px] font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 group-hover:text-[#E1262D] transition-colors mt-0.5">
                        {story.title}
                      </h3>
                    </div>
                    <div className="relative w-16 h-12 rounded-md overflow-hidden shrink-0 bg-neutral-100 dark:bg-neutral-800 border border-neutral-200/70 dark:border-neutral-700/70">
                      {story.videoUrl ? (
                        <video
                          src={story.videoUrl}
                          poster={story.imageUrl}
                          autoPlay
                          muted
                          loop
                          playsInline
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <motion.img
                          src={story.imageUrl}
                          alt={story.title}
                          referrerPolicy="no-referrer"
                          animate={{ scale: [1, 1.09], x: idx % 2 === 0 ? [0, -3] : [0, 3] }}
                          transition={{
                            duration: 8 + idx * 1.5,
                            repeat: Infinity,
                            repeatType: 'reverse',
                            ease: 'easeInOut',
                          }}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      )}
                      {(story.videoUrl || idx % 2 === 0) && (
                        <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center">
                          <Play className="w-2.5 h-2.5 fill-white ml-0.5" />
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Editorial Quick Jump Strip at Sidebar Footer */}
          <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => scrollToSection('section-audio-news')}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-[#0D47FF] hover:text-white font-semibold transition-colors cursor-pointer"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span>Audio News</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToSection('section-categories-bento')}
              className="flex items-center justify-center gap-1.5 py-2 px-2 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-[#E1262D] hover:text-white font-semibold transition-colors cursor-pointer"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>All Desks</span>
            </button>
          </div>
        </aside>
      </div>
    </section>
  );
}
