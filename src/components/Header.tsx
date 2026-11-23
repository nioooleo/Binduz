import { ArrowUpRight, Edit3, Headphones, LogOut, ShieldCheck } from 'lucide-react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { ActiveView, CategoryName, NavigationItem } from '../types/newspaper';

export function Header() {
  const {
    activeView,
    setActiveView,
    activePageSlug,
    openCustomPage,
    selectedCategory,
    setSelectedCategory,
    setSearchQuery,
    user,
    adminToken,
    effectiveRole,
    isStaffAuthenticated,
    permissions,
    visualEditMode,
    setVisualEditMode,
    signOut,
    siteSettings,
    navigationItems,
    publishedPages,
  } = useNewspaper();

  const headerNavItems: NavigationItem[] = [
    ...navigationItems
      .filter((n) => n.location === 'header' && n.visible)
      .filter(
        (n) =>
          n.targetType !== 'view' ||
          isStaffAuthenticated
      ),
    ...publishedPages
      .filter((p) => p.showInHeader)
      .filter((p) => !navigationItems.some((n) => n.targetType === 'page' && n.targetValue === p.slug))
      .map((p, idx) => ({
        id: `page-nav-${p.id}`,
        label: p.title,
        location: 'header' as const,
        targetType: 'page' as const,
        targetValue: p.slug,
        orderIndex: 100 + idx,
        visible: true,
      })),
  ];

  const scrollToDomSection = (slug: string) => {
    setActiveView('frontpage');
    setSelectedCategory('All');
    setSearchQuery('');
    const normalized = slug.replace(/_/g, '-');
    setTimeout(() => {
      const el =
        document.getElementById(`section-${normalized}`) ||
        document.getElementById(normalized);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  const handleNavClick = (item: NavigationItem) => {
    if (item.targetType === 'view' && isStaffAuthenticated) {
      setActiveView(item.targetValue as ActiveView);
    } else if (item.targetType === 'page') {
      openCustomPage(item.targetValue);
    } else if (item.targetType === 'category') {
      setSearchQuery('');
      setSelectedCategory(item.targetValue as CategoryName);
      setActiveView('frontpage');
      if (item.targetValue === 'All') {
        setTimeout(() => {
          const el =
            document.getElementById('section-live-news') ||
            document.getElementById('section-latest-news');
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          else window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 60);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } else if (item.targetType === 'url' && /^https?:\/\//i.test(item.targetValue)) {
      window.open(item.targetValue, '_blank', 'noopener,noreferrer');
    }
  };

  const isNavItemActive = (item: NavigationItem) => {
    if (item.targetType === 'view') return activeView === item.targetValue;
    if (item.targetType === 'page') return activeView === 'page' && activePageSlug === item.targetValue;
    if (item.targetType === 'category') {
      return activeView === 'frontpage' && selectedCategory === item.targetValue;
    }
    return false;
  };

  const handleHeaderCta = () => {
    const rawTarget = siteSettings.headerCtaUrl || 'section:audio_news';
    if (rawTarget.startsWith('section:')) {
      scrollToDomSection(rawTarget.slice(8));
    } else if (rawTarget.startsWith('scroll:')) {
      scrollToDomSection(rawTarget.slice(7));
    } else if (rawTarget.startsWith('page:')) {
      openCustomPage(rawTarget.slice(5));
    } else if (rawTarget.startsWith('category:')) {
      setSearchQuery('');
      setSelectedCategory(rawTarget.slice(9) as CategoryName);
      setActiveView('frontpage');
    } else if (/^https?:\/\//i.test(rawTarget)) {
      window.open(rawTarget, '_blank', 'noopener,noreferrer');
    } else if (rawTarget.startsWith('view:') && isStaffAuthenticated) {
      setActiveView(rawTarget.slice(5) as ActiveView);
    } else {
      scrollToDomSection('audio-news');
    }
  };

  const brandColor = siteSettings.primaryColor || '#E1262D';
  const ctaTarget = siteSettings.headerCtaUrl || 'section:audio_news';
  const isAudioCta = ctaTarget === 'section:audio_news' || /listen/i.test(siteSettings.headerCtaLabel || '');

  return (
    <header
      style={siteSettings.headerBgColor ? { backgroundColor: siteSettings.headerBgColor } : undefined}
      className="sticky top-0 z-40 bg-white/90 dark:bg-[#0B0F17]/90 backdrop-blur-xl border-b border-neutral-200/80 dark:border-neutral-800/80 shadow-xs"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Editable Brand Wordmark */}
        <button
          type="button"
          onClick={() => {
            setSearchQuery('');
            setSelectedCategory('All');
            setActiveView('frontpage');
          }}
          className="flex items-center gap-3 shrink-0 cursor-pointer text-left group"
        >
          <span
            style={{ backgroundColor: brandColor }}
            className="w-9 h-9 text-white font-display font-black text-xl flex items-center justify-center rounded-sm shadow-sm transition-transform group-hover:scale-105"
          >
            {siteSettings.brandMarkText || 'B'}
          </span>
          <span className="flex flex-col leading-none">
            <span className="font-display font-extrabold text-lg tracking-tight text-neutral-900 dark:text-white whitespace-nowrap">
              {siteSettings.siteName || 'BINDUZ'}
            </span>
            <span className="font-mono text-[10px] tracking-[0.18em] text-neutral-500 dark:text-neutral-400 uppercase whitespace-nowrap mt-0.5 max-w-[230px] truncate">
              {siteSettings.tagline || 'Bangladesh & International Broadsheet'}
            </span>
          </span>
        </button>

        {/* Zone 2: Clean Editorial Navigation */}
        <nav aria-label="Primary Editorial Navigation" className="hidden md:flex items-center gap-5 lg:gap-6 overflow-x-auto">
          {headerNavItems.slice(0, 8).map((item) => {
            const active = isNavItemActive(item);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item)}
                style={active ? { color: brandColor } : undefined}
                className={`relative py-5 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? 'text-[#E1262D]'
                    : 'text-neutral-700 dark:text-neutral-300 hover:text-neutral-950 dark:hover:text-white'
                }`}
              >
                {item.label}
                {active && (
                  <span
                    style={{ backgroundColor: brandColor }}
                    className="absolute inset-x-0 bottom-0 h-0.5"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Reader Listen Live CTA (Private CMS controls shown only when authenticated) */}
        <div className="flex items-center gap-2.5 shrink-0">
          {isStaffAuthenticated || user ? (
            <div className="flex items-center gap-2.5">
              {permissions.canCustomizeSite && (
                <button
                  type="button"
                  onClick={() => setVisualEditMode(!visualEditMode)}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-bold border transition-colors cursor-pointer ${
                    visualEditMode
                      ? 'bg-[#E1262D] border-[#E1262D] text-white'
                      : 'border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:border-[#E1262D]'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{visualEditMode ? 'Editing Live' : 'Edit Site'}</span>
                </button>
              )}

              {permissions.canAccessNewsroom && (
                <button
                  type="button"
                  onClick={() => setActiveView('newsroom')}
                  className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200 hover:text-[#E1262D] cursor-pointer whitespace-nowrap"
                  title={`Active role: ${effectiveRole}`}
                >
                  <ShieldCheck className="w-4 h-4 text-[#E1262D]" />
                  <span>{adminToken ? 'Admin Desk' : user?.displayName?.split(' ')[0] || 'Account'}</span>
                  <span className="text-neutral-400">·</span>
                  <span className="text-neutral-500 dark:text-neutral-400">{effectiveRole}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => void signOut()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 rounded hover:opacity-90 transition-opacity cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleHeaderCta}
              style={{ backgroundColor: siteSettings.secondaryColor || '#0D47FF' }}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white rounded transition-all hover:opacity-95 hover:shadow-md cursor-pointer whitespace-nowrap shadow-sm"
            >
              {isAudioCta ? (
                <Headphones className="w-3.5 h-3.5" />
              ) : (
                <ArrowUpRight className="w-3.5 h-3.5" />
              )}
              <span>{siteSettings.headerCtaLabel || 'Listen Live'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Mobile Nav Bar */}
      <div className="md:hidden border-t border-neutral-200 dark:border-neutral-800 px-3 py-2 flex items-center gap-4 overflow-x-auto">
        {headerNavItems.map((item) => {
          const active = isNavItemActive(item);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavClick(item)}
              className={`text-xs font-semibold whitespace-nowrap py-1 cursor-pointer ${
                active
                  ? 'text-[#E1262D] border-b-2 border-[#E1262D]'
                  : 'text-neutral-600 dark:text-neutral-400'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
