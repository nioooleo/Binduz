import {
  Bookmark,
  Check,
  Globe2,
  Heart,
  MessageSquare,
  Play,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { CommentItem, LanguageCode } from '../types/newspaper';

export function ArticleReaderModal() {
  const {
    activeArticle,
    closeArticle,
    isBookmarked,
    toggleBookmark,
    likedArticleIds,
    toggleLikeArticle,
    fetchArticleComments,
    postComment,
    moderateComment,
    permissions,
    user,
    pushToast,
    siteSettings,
  } = useNewspaper();

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const [aiBriefing, setAiBriefing] = useState<{
    summary: string;
    keyTakeaways: string[];
    entities: string[];
    citationLine: string;
  } | null>(null);
  const [loadingBriefing, setLoadingBriefing] = useState(false);

  const [translated, setTranslated] = useState<{
    lang: LanguageCode;
    title: string;
    excerpt: string;
    content: string;
  } | null>(null);
  const [translating, setTranslating] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    setShowVideo(false);
    setAiBriefing(null);
    setTranslated(null);
    setIsSpeaking(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (!activeArticle) return;

    fetchArticleComments(activeArticle.id).then(setComments).catch(() => setComments([]));

    // Inject NewsArticle JSON-LD for Google News / AI Search crawlers
    const scriptId = 'binduz-article-jsonld';
    let scriptEl = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (!scriptEl) {
      scriptEl = document.createElement('script');
      scriptEl.id = scriptId;
      scriptEl.type = 'application/ld+json';
      document.head.appendChild(scriptEl);
    }
    const baseUrl = window.location.origin;
    scriptEl.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: activeArticle.seoTitle || activeArticle.title,
      description: activeArticle.seoDescription || activeArticle.excerpt,
      image: [new URL(activeArticle.imageUrl, baseUrl).toString()],
      datePublished: activeArticle.publishedAt || new Date().toISOString(),
      dateModified: activeArticle.publishedAt || new Date().toISOString(),
      author: [{ '@type': 'Person', name: activeArticle.authorName }],
      publisher: {
        '@type': 'NewsMediaOrganization',
        name: 'Binduz Newspaper',
      },
      mainEntityOfPage: `${baseUrl}/?article=${activeArticle.slug}`,
      articleSection: activeArticle.category,
      keywords: activeArticle.focusKeywords?.join(', '),
    });

    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      const existing = document.getElementById(scriptId);
      if (existing) existing.remove();
    };
  }, [activeArticle, fetchArticleComments]);

  if (!activeArticle) return null;

  const displayTitle = translated ? translated.title : activeArticle.title;
  const displayExcerpt = translated ? translated.excerpt : activeArticle.excerpt;
  const displayContent = translated ? translated.content : activeArticle.content;
  const paragraphs = displayContent.split(/\n\s*\n/).filter(Boolean);
  const liked = likedArticleIds.includes(activeArticle.id);
  const bookmarked = isBookmarked(activeArticle.id);

  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) {
      pushToast('Audio Notice', 'Speech narration is not supported in this browser.');
      return;
    }
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }
    const utter = new SpeechSynthesisUtterance(`${displayTitle}. ${displayExcerpt}. ${displayContent}`);
    utter.rate = 1.0;
    utter.onend = () => setIsSpeaking(false);
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
    setIsSpeaking(true);
  };

  const handleGenerateBriefing = async () => {
    setLoadingBriefing(true);
    try {
      const resp = await fetch('/api/ai/briefing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeArticle.title,
          content: activeArticle.content,
          category: activeArticle.category,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Briefing failed.');
      setAiBriefing(data);
    } catch (err) {
      pushToast('AI Briefing Notice', err instanceof Error ? err.message : 'Unable to fetch AI briefing.');
    } finally {
      setLoadingBriefing(false);
    }
  };

  const handleTranslate = async (lang: LanguageCode) => {
    if (lang === 'en') {
      setTranslated(null);
      return;
    }
    setTranslating(true);
    try {
      const resp = await fetch('/api/ai/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: activeArticle.title,
          excerpt: activeArticle.excerpt,
          content: activeArticle.content,
          targetLanguage: lang,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Translation unavailable.');
      setTranslated({ lang, ...data });
    } catch (err) {
      pushToast('Translation Notice', err instanceof Error ? err.message : 'Unable to translate article.');
    } finally {
      setTranslating(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/?article=${activeArticle.slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: activeArticle.title, url: shareUrl });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopiedShare(true);
        setTimeout(() => setCopiedShare(false), 2000);
        pushToast('Link Copied', 'Canonical dispatch URL copied to clipboard.');
      }
    } catch {
      // cancelled
    }
  };

  const handleCommentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPostingComment(true);
    const ok = await postComment(activeArticle.id, commentText);
    if (ok) {
      setCommentText('');
      const refreshed = await fetchArticleComments(activeArticle.id);
      setComments(refreshed);
    }
    setPostingComment(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={displayTitle}
      className="fixed inset-0 z-50 bg-black/75 overflow-y-auto flex justify-center p-3 sm:p-6"
    >
      <div className="relative w-full max-w-4xl bg-[#FDFBF7] dark:bg-[#0B0F17] text-neutral-900 dark:text-neutral-100 rounded-md shadow-2xl border border-neutral-200 dark:border-neutral-800 my-auto overflow-hidden">
        {/* Top Modal Action Bar */}
        <div className="sticky top-0 z-20 bg-white/95 dark:bg-[#0f1623]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-5 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2 py-0.5 bg-[#E1262D] text-white font-bold uppercase rounded-sm">
              {activeArticle.category}
            </span>
            <span className="font-mono text-neutral-500">{activeArticle.displayDate}</span>
            <span className="text-neutral-400">·</span>
            <span className="font-mono text-neutral-500">{activeArticle.readMinutes || 4} min read</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Language Translation Selector */}
            <label className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-neutral-200 dark:border-neutral-700 rounded bg-neutral-50 dark:bg-neutral-900">
              <Globe2 className="w-3.5 h-3.5 text-neutral-500" />
              <select
                aria-label="Translate article"
                disabled={translating}
                value={translated?.lang || 'en'}
                onChange={(e) => void handleTranslate(e.target.value as LanguageCode)}
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
              onClick={handleToggleSpeech}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded border cursor-pointer ${
                isSpeaking
                  ? 'border-[#E1262D] bg-[#E1262D]/10 text-[#E1262D]'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-[#E1262D]'
              }`}
            >
              {isSpeaking ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isSpeaking ? 'Stop Audio' : 'Listen'}</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleBookmark(activeArticle)}
              className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:border-[#E1262D] cursor-pointer"
              title="Bookmark story"
            >
              <Bookmark className={`w-4 h-4 ${bookmarked ? 'fill-[#E1262D] text-[#E1262D]' : ''}`} />
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              className="p-1.5 rounded border border-neutral-200 dark:border-neutral-700 hover:border-[#E1262D] cursor-pointer"
              title="Share canonical URL"
            >
              {copiedShare ? <Check className="w-4 h-4 text-emerald-500" /> : <Share2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={closeArticle}
              aria-label="Close article reader"
              className="p-1.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-[#E1262D] hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Article Body */}
        <article className="p-6 sm:p-10 max-w-3xl mx-auto">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold leading-tight text-neutral-950 dark:text-white">
            {displayTitle}
          </h1>

          {activeArticle.subtitle && (
            <p className="mt-3 text-lg text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {activeArticle.subtitle}
            </p>
          )}

          <div className="mt-5 pb-5 border-b border-neutral-200 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs text-neutral-600 dark:text-neutral-400">
            <div>
              By <strong className="text-neutral-900 dark:text-white">{activeArticle.authorName}</strong>
              {activeArticle.locationName && <> · {activeArticle.locationName}</>}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => void toggleLikeArticle(activeArticle)}
                className={`inline-flex items-center gap-1.5 font-semibold cursor-pointer ${
                  liked ? 'text-[#E1262D]' : 'hover:text-[#E1262D]'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked ? 'fill-[#E1262D]' : ''}`} />
                <span>{activeArticle.likesCount + (liked ? 1 : 0)}</span>
              </button>

              <button
                type="button"
                onClick={() => void handleGenerateBriefing()}
                disabled={loadingBriefing}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#0D47FF] hover:bg-[#0a38cc] text-white font-semibold rounded cursor-pointer disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{loadingBriefing ? 'Synthesizing...' : 'AI Citation Brief'}</span>
              </button>
            </div>
          </div>

          {/* Lead Visual or Video News Player */}
          <div className="my-6 relative rounded-md overflow-hidden bg-neutral-900">
            {showVideo && activeArticle.videoUrl ? (
              <video
                src={activeArticle.videoUrl}
                controls
                autoPlay
                className="w-full max-h-[420px] bg-black"
              />
            ) : (
              <>
                <img
                  src={activeArticle.imageUrl}
                  alt={displayTitle}
                  referrerPolicy="no-referrer"
                  className="w-full max-h-[420px] object-cover"
                />
                {activeArticle.videoUrl && (
                  <button
                    type="button"
                    onClick={() => setShowVideo(true)}
                    className="absolute bottom-4 left-4 inline-flex items-center gap-2 px-4 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white text-xs font-bold rounded shadow-lg cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-white" />
                    <span>Play Video Dispatch</span>
                  </button>
                )}
              </>
            )}
          </div>

          {/* Generative AI Citation Summary (Always available from article metadata or live Gemini call) */}
          {(aiBriefing || activeArticle.aiSummary) && (
            <div className="my-6 p-5 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0D47FF] dark:text-sky-400 mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Citation & Executive Summary</span>
              </div>
              <p className="text-sm text-neutral-700 dark:text-neutral-200 leading-relaxed">
                {aiBriefing?.summary || activeArticle.aiSummary}
              </p>
              {aiBriefing?.keyTakeaways && aiBriefing.keyTakeaways.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300 list-disc pl-5">
                  {aiBriefing.keyTakeaways.map((point, idx) => (
                    <li key={idx}>{point}</li>
                  ))}
                </ul>
              )}
              {aiBriefing?.citationLine && (
                <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800 font-mono text-[11px] text-neutral-500">
                  Citation: {aiBriefing.citationLine}
                </div>
              )}
            </div>
          )}

          {/* Editorial Copy with Drop Cap */}
          <div className="space-y-5 text-[16px] leading-[1.8] text-neutral-800 dark:text-neutral-200">
            {paragraphs.map((para, idx) => (
              <p key={idx} className={idx === 0 ? 'drop-cap' : ''}>
                {para}
              </p>
            ))}
          </div>

          {/* Keywords & Canonical SEO Metadata */}
          {activeArticle.focusKeywords && activeArticle.focusKeywords.length > 0 && (
            <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400">
              <span className="font-semibold text-neutral-700 dark:text-neutral-200 mr-2">
                Indexed Entities:
              </span>
              {activeArticle.focusKeywords.join(' · ')}
            </div>
          )}

          {/* Comments Section */}
          {siteSettings.enableComments && (
            <section className="mt-10 pt-8 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-[#E1262D]" />
                <h3 className="font-display text-xl font-bold">
                  Reader Commentary ({comments.length})
                </h3>
              </div>

              {user ? (
                <form onSubmit={handleCommentSubmit} className="mb-6">
                  <textarea
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Contribute an informed perspective to this dispatch..."
                    className="w-full p-3 text-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded focus:outline-none focus:border-[#E1262D]"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={postingComment || commentText.trim().length < 2}
                      className="px-4 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white text-xs font-bold rounded disabled:opacity-50 cursor-pointer"
                    >
                      {postingComment ? 'Posting...' : 'Post Comment'}
                    </button>
                  </div>
                </form>
              ) : (
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
                  Sign in with Google from the top bar to join the editorial discussion.
                </p>
              )}

              <div className="space-y-3">
                {comments.length === 0 ? (
                  <p className="text-xs text-neutral-500">No comments on this dispatch yet.</p>
                ) : (
                  comments.map((cmt) => (
                    <div
                      key={cmt.id}
                      className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded"
                    >
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {cmt.authorName}
                        </span>
                        <span className="font-mono text-[11px] uppercase text-neutral-400">
                          {cmt.status}
                        </span>
                      </div>
                      <p className="text-sm text-neutral-700 dark:text-neutral-300">{cmt.content}</p>
                      {permissions.canModerateComments && (
                        <div className="mt-2.5 flex items-center gap-3 text-[11px] font-semibold">
                          <button
                            type="button"
                            onClick={() => void moderateComment(activeArticle.id, cmt.id, 'approved')}
                            className="text-emerald-600 hover:underline cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => void moderateComment(activeArticle.id, cmt.id, 'flagged')}
                            className="text-amber-600 hover:underline cursor-pointer"
                          >
                            Flag
                          </button>
                          <button
                            type="button"
                            onClick={() => void moderateComment(activeArticle.id, cmt.id, 'removed')}
                            className="text-[#E1262D] hover:underline cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          )}
        </article>
      </div>
    </div>
  );
}
