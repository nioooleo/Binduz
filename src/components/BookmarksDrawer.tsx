import { Bookmark, ExternalLink, Trash2, X } from 'lucide-react';
import { useNewspaper } from '../contexts/NewspaperContext';

export function BookmarksDrawer() {
  const {
    bookmarks,
    bookmarksDrawerOpen,
    setBookmarksDrawerOpen,
    articles,
    openArticle,
    toggleBookmark,
  } = useNewspaper();

  if (!bookmarksDrawerOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Saved Reading List"
      className="fixed inset-0 z-50 bg-black/50 flex justify-end"
    >
      <div className="w-full max-w-md bg-white dark:bg-[#0f1623] h-full shadow-2xl border-l border-neutral-200 dark:border-neutral-800 flex flex-col">
        <div className="p-5 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#E1262D]" />
            <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-white">
              Saved Reading List ({bookmarks.length})
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setBookmarksDrawerOpen(false)}
            aria-label="Close saved stories"
            className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {bookmarks.length === 0 ? (
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              No saved stories yet. Click the bookmark icon on any dispatch to save it for offline or cross-device reading.
            </p>
          ) : (
            bookmarks.map((bm) => {
              const matched = articles.find((a) => a.id === bm.articleId);
              return (
                <div
                  key={bm.articleId}
                  className="p-3 rounded-md border border-neutral-200 dark:border-neutral-800 flex items-start gap-3"
                >
                  {bm.imageUrl && (
                    <img
                      src={bm.imageUrl}
                      alt={bm.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-14 object-cover rounded-sm shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-mono uppercase text-[#E1262D] font-bold">
                      {bm.category}
                    </div>
                    <h4 className="font-display text-sm font-bold text-neutral-900 dark:text-white leading-snug line-clamp-2 mt-0.5">
                      {bm.title}
                    </h4>
                    <div className="mt-2 flex items-center gap-3 text-[11px]">
                      {matched && (
                        <button
                          type="button"
                          onClick={() => {
                            setBookmarksDrawerOpen(false);
                            openArticle(matched);
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-[#0D47FF] dark:text-sky-400 hover:underline cursor-pointer"
                        >
                          <span>Read</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                      {matched && (
                        <button
                          type="button"
                          onClick={() => void toggleBookmark(matched)}
                          className="inline-flex items-center gap-1 text-neutral-400 hover:text-[#E1262D] cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
