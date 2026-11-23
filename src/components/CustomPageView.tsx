import { ArrowRight, Edit3, ExternalLink, FileWarning } from 'lucide-react';
import { useEffect } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { ActiveView, CategoryName, PageBlock } from '../types/newspaper';

function toSafeVideoEmbed(url: string): { kind: 'video' | 'iframe'; src: string } | null {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
    if (u.hostname.includes('youtube.com') || u.hostname.includes('youtu.be')) {
      let vidId = u.searchParams.get('v');
      if (!vidId && u.hostname.includes('youtu.be')) vidId = u.pathname.slice(1);
      if (!vidId && u.pathname.includes('/embed/')) vidId = u.pathname.split('/embed/')[1];
      if (vidId && /^[a-zA-Z0-9_-]{6,20}$/.test(vidId)) {
        return { kind: 'iframe', src: `https://www.youtube.com/embed/${vidId}` };
      }
    }
    if (u.hostname.includes('vimeo.com')) {
      const idMatch = u.pathname.match(/(\d{5,14})/);
      if (idMatch) {
        return { kind: 'iframe', src: `https://player.vimeo.com/video/${idMatch[1]}` };
      }
    }
    if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(u.pathname)) {
      return { kind: 'video', src: u.toString() };
    }
    return null;
  } catch {
    if (url.startsWith('/') && /\.(mp4|webm|ogg)$/i.test(url)) {
      return { kind: 'video', src: url };
    }
    return null;
  }
}

export function CustomPageView() {
  const {
    pages,
    publishedPages,
    activePageSlug,
    isStaffAuthenticated,
    permissions,
    publishedArticles,
    openArticle,
    setActiveView,
    setSelectedCategory,
    openCustomPage,
  } = useNewspaper();

  const pool = isStaffAuthenticated ? pages : publishedPages;
  const page = pool.find((p) => p.slug === activePageSlug) || pool[0];

  useEffect(() => {
    if (page?.seoTitle || page?.title) {
      document.title = `${page.seoTitle || page.title} · BINDUZ`;
    }
    return () => {
      document.title = 'Binduz — Global Digital Broadsheet & AI-Ready Newsroom';
    };
  }, [page]);

  const handleActionLink = (rawUrl?: string) => {
    if (!rawUrl) return;
    if (rawUrl.startsWith('view:') && isStaffAuthenticated) {
      const target = rawUrl.slice(5) as ActiveView;
      setActiveView(target);
      return;
    }
    if (rawUrl.startsWith('page:')) {
      openCustomPage(rawUrl.slice(5));
      return;
    }
    if (rawUrl.startsWith('category:')) {
      setSelectedCategory(rawUrl.slice(9) as CategoryName);
      setActiveView('frontpage');
      return;
    }
    if (/^https?:\/\//i.test(rawUrl)) {
      window.open(rawUrl, '_blank', 'noopener,noreferrer');
    }
  };

  if (!page) {
    return (
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 text-center">
        <FileWarning className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
        <h1 className="font-display text-2xl font-bold text-neutral-900 dark:text-white">
          Page Not Available
        </h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
          The requested edition page is not currently published.
        </p>
        <div className="mt-5 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setActiveView('frontpage')}
            className="px-4 py-2 bg-[#E1262D] text-white text-xs font-bold rounded cursor-pointer"
          >
            Return to Homepage
          </button>
          {isStaffAuthenticated && permissions.canManagePages && (
            <button
              type="button"
              onClick={() => setActiveView('newsroom')}
              className="px-4 py-2 border border-neutral-300 dark:border-neutral-700 text-xs font-semibold rounded cursor-pointer"
            >
              Open Page Builder
            </button>
          )}
        </div>
      </section>
    );
  }

  const renderBlock = (block: PageBlock) => {
    const alignCenter = block.align === 'center';
    const customStyle = {
      ...(block.backgroundColor ? { backgroundColor: block.backgroundColor } : {}),
      ...(block.textColor ? { color: block.textColor } : {}),
    };

    switch (block.type) {
      case 'hero_banner':
        return (
          <div
            key={block.id}
            style={customStyle}
            className="relative rounded-md overflow-hidden min-h-[320px] flex flex-col justify-center px-6 sm:px-12 py-12 bg-[#0B0F17] text-white"
          >
            {block.imageUrl && (
              <>
                <img
                  src={block.imageUrl}
                  alt={block.heading || page.title}
                  referrerPolicy="no-referrer"
                  className="absolute inset-0 w-full h-full object-cover opacity-50"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/55 to-black/30" />
              </>
            )}
            <div className={`relative z-10 max-w-3xl ${alignCenter ? 'mx-auto text-center' : ''}`}>
              {block.subheading && (
                <div className="font-mono text-[11px] uppercase tracking-widest text-amber-300 font-bold mb-2">
                  {block.subheading}
                </div>
              )}
              <h2 className="font-display text-3xl sm:text-5xl font-extrabold leading-tight">
                {block.heading || page.title}
              </h2>
              {block.body && (
                <p className="mt-4 text-sm sm:text-base text-neutral-200 leading-relaxed">
                  {block.body}
                </p>
              )}
              {block.buttonText && block.buttonUrl && (
                <button
                  type="button"
                  onClick={() => handleActionLink(block.buttonUrl)}
                  style={block.accentColor ? { backgroundColor: block.accentColor } : undefined}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-[#E1262D] hover:opacity-90 text-white text-xs font-bold rounded cursor-pointer"
                >
                  <span>{block.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        );

      case 'rich_text':
        return (
          <div
            key={block.id}
            style={customStyle}
            className={`rounded-md p-6 sm:p-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 ${
              alignCenter ? 'text-center' : ''
            }`}
          >
            {block.subheading && (
              <div className="font-mono text-[11px] uppercase tracking-widest text-[#E1262D] font-bold mb-1">
                {block.subheading}
              </div>
            )}
            {block.heading && (
              <h2 className="font-display text-2xl sm:text-3xl font-bold mb-4">
                {block.heading}
              </h2>
            )}
            <div className={`space-y-4 text-sm sm:text-base leading-relaxed opacity-90 ${alignCenter ? 'max-w-2xl mx-auto' : 'max-w-3xl'}`}>
              {(block.body || '').split(/\n\s*\n/).filter(Boolean).map((p, idx) => (
                <p key={idx}>{p}</p>
              ))}
            </div>
            {block.buttonText && block.buttonUrl && (
              <button
                type="button"
                onClick={() => handleActionLink(block.buttonUrl)}
                style={block.accentColor ? { backgroundColor: block.accentColor } : undefined}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-[#0D47FF] text-white text-xs font-bold rounded cursor-pointer"
              >
                <span>{block.buttonText}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );

      case 'media_spotlight':
        return (
          <div
            key={block.id}
            style={customStyle}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden p-5 sm:p-7"
          >
            <div className="md:col-span-6 overflow-hidden rounded">
              <img
                src={block.imageUrl || '/src/assets/images/world_summit_urban_1795430987551.jpg'}
                alt={block.heading || 'Editorial Spotlight'}
                referrerPolicy="no-referrer"
                className="w-full h-64 sm:h-72 object-cover"
              />
            </div>
            <div className="md:col-span-6 space-y-3">
              {block.subheading && (
                <div className="font-mono text-[11px] uppercase tracking-wider text-[#E1262D] font-bold">
                  {block.subheading}
                </div>
              )}
              {block.heading && (
                <h2 className="font-display text-2xl font-bold">{block.heading}</h2>
              )}
              {block.body && <p className="text-sm leading-relaxed opacity-85">{block.body}</p>}
              {block.buttonText && block.buttonUrl && (
                <button
                  type="button"
                  onClick={() => handleActionLink(block.buttonUrl)}
                  style={block.accentColor ? { backgroundColor: block.accentColor } : undefined}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E1262D] text-white text-xs font-bold rounded cursor-pointer"
                >
                  <span>{block.buttonText}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        );

      case 'video_embed': {
        const media = block.videoUrl ? toSafeVideoEmbed(block.videoUrl) : null;
        return (
          <div
            key={block.id}
            style={customStyle}
            className="rounded-md p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4"
          >
            {block.heading && (
              <div className={alignCenter ? 'text-center' : ''}>
                <h2 className="font-display text-2xl font-bold">{block.heading}</h2>
                {block.subheading && (
                  <p className="text-xs opacity-75 mt-1">{block.subheading}</p>
                )}
              </div>
            )}
            {media ? (
              <div className="aspect-video w-full rounded overflow-hidden bg-black">
                {media.kind === 'iframe' ? (
                  <iframe
                    src={media.src}
                    title={block.heading || 'Embedded Video'}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <video src={media.src} controls className="w-full h-full" />
                )}
              </div>
            ) : (
              <div className="p-8 rounded bg-neutral-100 dark:bg-neutral-800 text-center text-xs text-neutral-500">
                Add a valid HTTPS YouTube, Vimeo, or MP4 video URL in Page Builder.
              </div>
            )}
          </div>
        );
      }

      case 'news_feed_grid': {
        const cat = block.categoryFilter || 'All';
        const limit = block.itemLimit || 6;
        const list = publishedArticles
          .filter((a) => cat === 'All' || a.category === cat)
          .slice(0, limit);
        return (
          <div key={block.id} className="space-y-5">
            <div className="flex items-center gap-3">
              <h2 className="font-display text-2xl font-bold text-neutral-900 dark:text-white whitespace-nowrap">
                {block.heading || `${cat === 'All' ? 'Latest' : cat} Dispatches`}
              </h2>
              <span className="h-[2px] flex-1 bg-gradient-to-r from-[#E1262D] via-[#E1262D]/30 to-transparent" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {list.map((art) => (
                <article
                  key={art.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden flex flex-col group"
                >
                  <button
                    type="button"
                    onClick={() => openArticle(art)}
                    className="cursor-pointer overflow-hidden"
                  >
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </button>
                  <div className="p-4 flex-1 flex flex-col">
                    <div className="text-[11px] font-mono text-neutral-500">
                      <span className="text-[#E1262D] font-bold">{art.category}</span> ·{' '}
                      {art.displayDate}
                    </div>
                    <button
                      type="button"
                      onClick={() => openArticle(art)}
                      className="text-left mt-1.5 cursor-pointer"
                    >
                      <h3 className="font-display text-base font-bold text-neutral-900 dark:text-white leading-snug group-hover:text-[#E1262D]">
                        {art.title}
                      </h3>
                    </button>
                    <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-2 line-clamp-2 flex-1">
                      {art.excerpt}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        );
      }

      case 'cta_promotion':
        return (
          <div
            key={block.id}
            style={{
              backgroundColor: block.backgroundColor || '#0D47FF',
              color: block.textColor || '#ffffff',
            }}
            className="rounded-md p-7 sm:p-10 flex flex-wrap items-center justify-between gap-6"
          >
            <div className="max-w-2xl">
              {block.subheading && (
                <div className="font-mono text-[11px] uppercase tracking-widest opacity-80 mb-1">
                  {block.subheading}
                </div>
              )}
              <h2 className="font-display text-2xl sm:text-3xl font-bold">
                {block.heading || 'Special Edition Promotion'}
              </h2>
              {block.body && <p className="text-sm opacity-90 mt-2">{block.body}</p>}
            </div>
            {block.buttonText && block.buttonUrl && (
              <button
                type="button"
                onClick={() => handleActionLink(block.buttonUrl)}
                style={block.accentColor ? { backgroundColor: block.accentColor } : undefined}
                className="px-5 py-2.5 bg-white text-neutral-900 font-bold text-xs rounded hover:opacity-90 cursor-pointer shrink-0"
              >
                {block.buttonText}
              </button>
            )}
          </div>
        );

      case 'spacer_divider':
        return (
          <div key={block.id} className="py-4 flex items-center gap-4">
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
            {block.heading && (
              <span className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                {block.heading}
              </span>
            )}
            <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-800" />
          </div>
        );
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      {isStaffAuthenticated && permissions.canManagePages && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded bg-neutral-900 text-white text-xs">
          <span>
            Viewing CMS Page: <strong>{page.title}</strong> ({page.status}) · <code>?page={page.slug}</code>
          </span>
          <button
            type="button"
            onClick={() => setActiveView('newsroom')}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#E1262D] rounded font-bold cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit in Page Builder</span>
          </button>
        </div>
      )}

      {page.blocks.length === 0 ? (
        <div className="p-10 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md">
          <h1 className="font-display text-3xl font-bold">{page.title}</h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-300 mt-3">
            {page.description || 'This custom page is published. Add layout blocks in the Drag-and-Drop Page Builder.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">{page.blocks.map(renderBlock)}</div>
      )}
    </section>
  );
}
