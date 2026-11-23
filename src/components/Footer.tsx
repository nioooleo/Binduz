import { ArrowUp, Check, Headphones, Mail, MapPin, Video } from 'lucide-react';
import React, { useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { CATEGORIES } from '../data/seedArticles';
import { ActiveView, CategoryName, NavigationItem } from '../types/newspaper';

export function Footer() {
  const {
    setActiveView,
    setSelectedCategory,
    setSearchQuery,
    openCustomPage,
    isStaffAuthenticated,
    siteSettings,
    navigationItems,
    publishedPages,
    bureaus,
    setSelectedBureauId,
    subscribeNewsletter,
    bookmarks,
    setBookmarksDrawerOpen,
  } = useNewspaper();

  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const primaryColor = siteSettings.primaryColor || '#E1262D';

  const footerLinks: NavigationItem[] = [
    ...navigationItems
      .filter((n) => n.location === 'footer' && n.visible)
      .filter((n) => n.targetType !== 'view' || isStaffAuthenticated),
    ...publishedPages
      .filter((p) => p.showInFooter)
      .filter((p) => !navigationItems.some((n) => n.targetType === 'page' && n.targetValue === p.slug))
      .map((p, idx) => ({
        id: `footer-page-${p.id}`,
        label: p.title,
        location: 'footer' as const,
        targetType: 'page' as const,
        targetValue: p.slug,
        orderIndex: 100 + idx,
        visible: true,
      })),
  ];

  const handleLinkClick = (item: NavigationItem) => {
    if (item.targetType === 'view' && isStaffAuthenticated) {
      setActiveView(item.targetValue as ActiveView);
    } else if (item.targetType === 'page') {
      openCustomPage(item.targetValue);
    } else if (item.targetType === 'category') {
      setSearchQuery('');
      setSelectedCategory(item.targetValue as CategoryName);
      setActiveView('frontpage');
    } else if (item.targetType === 'url' && /^https?:\/\//i.test(item.targetValue)) {
      window.open(item.targetValue, '_blank', 'noopener,noreferrer');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToHomeSection = (sectionId: string) => {
    setSearchQuery('');
    setSelectedCategory('All');
    setActiveView('frontpage');
    setTimeout(() => {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleQuickSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;
    setSubmitting(true);
    const ok = await subscribeNewsletter(email.trim(), 'daily');
    setSubmitting(false);
    if (ok) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer
      style={siteSettings.footerBgColor ? { backgroundColor: siteSettings.footerBgColor } : undefined}
      className="bg-[#0B0F17] text-neutral-300 border-t border-neutral-800/90 mt-14"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 md:grid-cols-12 gap-10 text-xs">
        {/* Column 1: Publication Identity & Broadcast Links */}
        <div className="md:col-span-4 space-y-4">
          <div className="flex items-center gap-3">
            <span
              style={{ backgroundColor: primaryColor }}
              className="w-9 h-9 text-white font-display font-black text-lg flex items-center justify-center rounded-sm shrink-0"
            >
              {siteSettings.brandMarkText || 'B'}
            </span>
            <div className="min-w-0">
              <div className="font-display font-bold text-lg text-white tracking-tight truncate">
                {siteSettings.siteName}
              </div>
              <div className="font-mono text-[10px] text-neutral-400 tracking-[0.14em] uppercase truncate">
                {siteSettings.tagline || 'Bangladesh & International Broadsheet'}
              </div>
            </div>
          </div>

          <p className="text-neutral-400 leading-relaxed max-w-sm">
            {siteSettings.footerBio ||
              'Independent digital newspaper covering Bangladesh national news, politics, economy, business, technology, sports, entertainment, education, and international affairs.'}
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => scrollToHomeSection('section-video-news')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Video className="w-3.5 h-3.5 text-[#E1262D]" />
              <span>Video News</span>
            </button>
            <button
              type="button"
              onClick={() => scrollToHomeSection('section-audio-news')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Headphones className="w-3.5 h-3.5 text-sky-400" />
              <span>Listen to News</span>
            </button>
          </div>
        </div>

        {/* Column 2: Editorial Desks & Published Pages */}
        <div className="md:col-span-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white pb-2 border-b border-neutral-800/80">
            {footerLinks.length > 0 ? 'Editorial Desks & Pages' : 'Editorial Desks'}
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(cat);
                  setActiveView('frontpage');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-left text-neutral-400 hover:text-white transition-colors cursor-pointer truncate"
              >
                {cat}
              </button>
            ))}
            {footerLinks.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleLinkClick(item)}
                className="text-left text-neutral-300 hover:text-white font-medium transition-colors cursor-pointer truncate"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Column 3: News Bureaus & Daily Morning Brief */}
        <div className="md:col-span-4 space-y-4">
          <div className="text-xs font-bold uppercase tracking-wider text-white pb-2 border-b border-neutral-800/80">
            News Bureaus &amp; Daily Brief
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
            {bureaus.slice(0, 6).map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setSelectedBureauId(b.id);
                  setSelectedCategory('All');
                  setActiveView('frontpage');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="flex items-center justify-between gap-2 text-left text-neutral-400 hover:text-white py-0.5 transition-colors cursor-pointer"
              >
                <span className="inline-flex items-center gap-1 truncate">
                  <MapPin className="w-3 h-3 text-[#E1262D] shrink-0" />
                  <span className="truncate">{b.city}</span>
                </span>
                <span className="font-mono text-neutral-500 tabular-nums shrink-0">
                  {b.weatherTempC || ''}
                </span>
              </button>
            ))}
          </div>

          <form onSubmit={handleQuickSubscribe} className="pt-2 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-neutral-300">
              <Mail className="w-3.5 h-3.5 text-[#E1262D]" />
              <span>Morning Dispatch Briefing</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reader@domain.com"
                aria-label="Email address for daily briefing"
                className="flex-1 min-w-0 px-3 py-2 rounded bg-white/5 border border-neutral-800 text-xs text-white placeholder:text-neutral-500 focus:outline-none focus:border-[#E1262D]"
              />
              <button
                type="submit"
                disabled={submitting}
                style={{ backgroundColor: primaryColor }}
                className="inline-flex items-center gap-1 px-3.5 py-2 rounded text-white text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                {subscribed ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Subscribed</span>
                  </>
                ) : (
                  <span>{submitting ? 'Saving...' : 'Subscribe'}</span>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom Legal & Navigation Strip */}
      <div className="border-t border-neutral-800/80 bg-[#080B12]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-neutral-500">
          <div className="text-center sm:text-left">
            {siteSettings.footerCopyright ||
              `© ${new Date().getFullYear()} ${siteSettings.siteName} · Bangladesh & International Edition`}
          </div>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setBookmarksDrawerOpen(true)}
              className="hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              Saved Reading List ({bookmarks.length})
            </button>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-1 hover:text-white transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Back to Top</span>
              <ArrowUp className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}
