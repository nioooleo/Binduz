import {
  Bell,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Moon,
  RefreshCw,
  Search,
  Sun,
  Zap,
} from 'lucide-react';
import { useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { CATEGORIES } from '../data/seedArticles';
import { LanguageCode } from '../types/newspaper';
import { PWAInstallButton } from './PWAControls';

export function UtilityRibbon() {
  const {
    publishedArticles,
    liveNewsLoading,
    refreshLiveNews,
    openArticle,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    setActiveView,
    darkMode,
    toggleDarkMode,
    language,
    setLanguage,
    bookmarks,
    setBookmarksDrawerOpen,
    notifications,
    unreadCount,
    markAllNotificationsRead,
    siteSettings,
    t,
  } = useNewspaper();

  const breakingStories = publishedArticles.filter((a) => a.isBreaking);
  const tickerList = breakingStories.length > 0 ? breakingStories : publishedArticles.slice(0, 6);
  const [tickerIndex, setTickerIndex] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);

  const activeTicker = tickerList[tickerIndex % Math.max(1, tickerList.length)];

  const handleNextTicker = () => {
    setTickerIndex((i) => (i + 1) % Math.max(1, tickerList.length));
  };
  const handlePrevTicker = () => {
    setTickerIndex((i) => (i - 1 + Math.max(1, tickerList.length)) % Math.max(1, tickerList.length));
  };

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-800 bg-[#FDFBF7] dark:bg-[#0f1623]">
      {/* Live Breaking Ticker Ribbon */}
      {siteSettings.showBreakingBar !== false && (
        <div
          style={{
            background: `linear-gradient(90deg, ${siteSettings.secondaryColor || '#0D47FF'}, #0a2d9c)`,
          }}
          className="text-white"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-10 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={handlePrevTicker}
                  aria-label="Previous breaking headline"
                  className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextTicker}
                  aria-label="Next breaking headline"
                  className="w-6 h-6 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className="inline-flex items-center gap-1 font-bold uppercase tracking-wider text-amber-300 shrink-0">
                <Zap className="w-3.5 h-3.5" />
                {t.breakingLabel}
              </span>

              {activeTicker ? (
                <button
                  type="button"
                  onClick={() => openArticle(activeTicker)}
                  className="truncate font-medium text-white/95 hover:underline text-left cursor-pointer"
                >
                  {activeTicker.title}
                </button>
              ) : (
                <span className="text-white/80">
                  {liveNewsLoading ? 'Synchronizing verified international news wires...' : 'Live wire standby'}
                </span>
              )}
            </div>

            <div className="hidden sm:flex items-center gap-3 shrink-0 font-mono text-[11px] text-white/85">
              <span>
                {new Date().toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
              <span>·</span>
              <span>{publishedArticles.length} Live Dispatches</span>
              <button
                type="button"
                onClick={() => void refreshLiveNews()}
                aria-label="Refresh live wire feeds"
                className="p-1 rounded hover:bg-white/15 cursor-pointer"
                title="Refresh live news feeds"
              >
                <RefreshCw className={`w-3 h-3 ${liveNewsLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search, Category, Language, Theme, Bookmarks, Notifications, PWA Strip */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim()) setActiveView('frontpage');
              }}
              placeholder={t.searchPlaceholder}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-[#E1262D]"
            />
          </div>

          <select
            aria-label="Filter by editorial category"
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value as typeof selectedCategory);
              setActiveView('frontpage');
            }}
            className="px-2.5 py-1.5 text-xs font-medium bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded text-neutral-700 dark:text-neutral-200 focus:outline-none focus:border-[#E1262D] cursor-pointer"
          >
            <option value="All">All Sections</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2.5">
          <label className="inline-flex items-center gap-1 text-xs text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1 rounded">
            <Globe2 className="w-3.5 h-3.5 text-neutral-400" />
            <select
              aria-label="Edition language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as LanguageCode)}
              className="bg-transparent text-xs font-semibold uppercase focus:outline-none cursor-pointer"
            >
              <option value="en">EN</option>
              <option value="es">ES</option>
              <option value="fr">FR</option>
              <option value="de">DE</option>
              <option value="ja">JA</option>
            </select>
          </label>

          <button
            type="button"
            onClick={toggleDarkMode}
            aria-label={darkMode ? 'Switch to light reading theme' : 'Switch to dark reading theme'}
            className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:border-[#E1262D] transition-colors cursor-pointer"
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setBookmarksDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 rounded hover:border-[#E1262D] transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#E1262D]" />
            <span className="hidden sm:inline">{t.bookmarks}</span>
            <span className="font-mono text-[11px] text-neutral-500">({bookmarks.length})</span>
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen((v) => !v);
                if (!notifOpen) markAllNotificationsRead();
              }}
              aria-label="Newsroom notifications"
              className="relative p-1.5 rounded border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200 hover:border-[#E1262D] transition-colors cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#E1262D] text-white text-[10px] font-bold flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-md shadow-xl z-50 p-3">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-neutral-100 dark:border-neutral-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 dark:text-white">
                    Dispatch Alerts
                  </span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-2">No new session alerts yet.</p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className="text-xs pb-2 border-b last:border-b-0 border-neutral-100 dark:border-neutral-800"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-neutral-900 dark:text-white">{n.title}</span>
                          <span className="text-[10px] font-mono text-neutral-400">{n.timestamp}</span>
                        </div>
                        <p className="text-neutral-600 dark:text-neutral-300 mt-0.5 leading-snug">{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <PWAInstallButton />
        </div>
      </div>
    </div>
  );
}
