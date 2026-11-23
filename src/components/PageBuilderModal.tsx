import {
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  GripVertical,
  History,
  Image as ImageIcon,
  Layout,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Type,
  Video,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { CATEGORIES } from '../data/seedArticles';
import { CategoryName, CmsPage, PageBlock, PageBlockType } from '../types/newspaper';

const BLOCK_TEMPLATES: Array<{
  type: PageBlockType;
  label: string;
  desc: string;
  defaults: Partial<PageBlock>;
}> = [
  {
    type: 'hero_banner',
    label: 'Hero Banner',
    desc: 'Full-width headline, imagery & CTA',
    defaults: {
      subheading: 'Special Section',
      heading: 'Editorial Feature Headline',
      body: 'Introduce this custom section with authoritative reporting context and clear reader calls to action.',
      imageUrl: '/src/assets/images/hero_climate_desk_1795430987467.jpg',
      buttonText: 'Explore Dispatches',
      buttonUrl: 'view:frontpage',
      align: 'left',
    },
  },
  {
    type: 'rich_text',
    label: 'Rich Text',
    desc: 'Multi-paragraph prose & column layout',
    defaults: {
      subheading: 'Editorial Essay',
      heading: 'Long-Form Report & Context',
      body: 'Write detailed editorial copy, policy statements, masthead profiles, or reader methodology notes here.',
      align: 'left',
    },
  },
  {
    type: 'media_spotlight',
    label: 'Media Spotlight',
    desc: 'Split photo feature + copy',
    defaults: {
      subheading: 'Photojournalism',
      heading: 'Visual Bureau Feature',
      body: 'Pair high-resolution newsroom photography with narrative commentary and outbound actions.',
      imageUrl: '/src/assets/images/world_summit_urban_1795430987551.jpg',
      buttonText: 'View Bureau Map',
      buttonUrl: 'view:map',
    },
  },
  {
    type: 'video_embed',
    label: 'Video News Block',
    desc: 'YouTube, Vimeo, or MP4 player',
    defaults: {
      heading: 'Correspondent Broadcast',
      subheading: 'Watch the latest desk briefing',
      videoUrl: '',
      align: 'center',
    },
  },
  {
    type: 'news_feed_grid',
    label: 'Live News Feed Grid',
    desc: 'Dynamic article stream by category',
    defaults: {
      heading: 'Selected Coverage',
      categoryFilter: 'All',
      itemLimit: 6,
    },
  },
  {
    type: 'cta_promotion',
    label: 'Brand Promotion / CTA',
    desc: 'Colored banner for sponsors or campaigns',
    defaults: {
      subheading: 'Sponsored Spotlight',
      heading: 'Partner With Binduz Global Newsroom',
      body: 'Reach international decision-makers across our live digital broadsheet and syndicated AI index.',
      buttonText: 'Contact Desk',
      buttonUrl: 'view:seo',
      backgroundColor: '#0D47FF',
      textColor: '#ffffff',
    },
  },
  {
    type: 'spacer_divider',
    label: 'Divider / Section Rule',
    desc: 'Visual section break with label',
    defaults: {
      heading: 'Editorial Break',
    },
  },
];

export function PageBuilderModal({
  initialPage,
  isNew,
  onClose,
}: {
  initialPage: Partial<CmsPage>;
  isNew: boolean;
  onClose: () => void;
}) {
  const { savePage, mediaAssets, fetchPageRevisions, openCustomPage, pushToast } = useNewspaper();

  const [draft, setDraft] = useState<Partial<CmsPage>>({
    id: initialPage.id || `page-${Date.now()}`,
    title: initialPage.title || 'New Editorial Page',
    slug: initialPage.slug || '',
    description: initialPage.description || '',
    status: initialPage.status || 'draft',
    showInHeader: Boolean(initialPage.showInHeader),
    showInFooter: Boolean(initialPage.showInFooter),
    blocks: Array.isArray(initialPage.blocks) ? initialPage.blocks : [],
    seoTitle: initialPage.seoTitle || '',
    seoDescription: initialPage.seoDescription || '',
    scheduledAt: initialPage.scheduledAt || '',
  });

  const blocks = draft.blocks || [];
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(blocks[0]?.id || null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastAutosaved, setLastAutosaved] = useState<string | null>(null);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisions, setRevisions] = useState<Array<Record<string, unknown>>>([]);

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || blocks[0] || null;

  // 15s Debounced Autosave for existing pages
  useEffect(() => {
    if (isNew || !draft.id || !draft.title) return;
    const timer = setTimeout(async () => {
      const saved = await savePage(draft, false);
      if (saved) {
        setLastAutosaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [draft, isNew, savePage]);

  const setBlocks = (next: PageBlock[]) => {
    setDraft((prev) => ({ ...prev, blocks: next }));
  };

  const addBlock = (type: PageBlockType) => {
    const tpl = BLOCK_TEMPLATES.find((t) => t.type === type);
    const id = `blk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newBlock: PageBlock = {
      id,
      type,
      ...(tpl?.defaults || {}),
    };
    setBlocks([...blocks, newBlock]);
    setSelectedBlockId(id);
  };

  const updateSelectedBlock = (patch: Partial<PageBlock>) => {
    if (!selectedBlock) return;
    setBlocks(blocks.map((b) => (b.id === selectedBlock.id ? { ...b, ...patch } : b)));
  };

  const moveBlock = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= blocks.length || fromIdx === toIdx) return;
    const copy = [...blocks];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    setBlocks(copy);
  };

  const duplicateBlock = (idx: number) => {
    const orig = blocks[idx];
    const clone: PageBlock = {
      ...orig,
      id: `blk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    };
    const copy = [...blocks];
    copy.splice(idx + 1, 0, clone);
    setBlocks(copy);
    setSelectedBlockId(clone.id);
  };

  const deleteBlock = (id: string) => {
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    if (selectedBlockId === id) setSelectedBlockId(next[0]?.id || null);
  };

  const handleManualSave = async (previewAfter = false) => {
    setSaving(true);
    const saved = await savePage(draft, isNew);
    setSaving(false);
    if (saved) {
      setDraft(saved);
      setLastAutosaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      if (previewAfter) {
        onClose();
        openCustomPage(saved.slug);
      }
    }
  };

  const handleLoadRevisions = async () => {
    if (!draft.id) return;
    const list = await fetchPageRevisions(draft.id);
    setRevisions(list);
    setShowRevisions(true);
  };

  const restoreRevision = (rev: Record<string, unknown>) => {
    setDraft((prev) => ({
      ...prev,
      title: String(rev.title || prev.title),
      status: (rev.status as CmsPage['status']) || prev.status,
      blocks: Array.isArray(rev.blocks) ? (rev.blocks as PageBlock[]) : prev.blocks,
    }));
    setShowRevisions(false);
    pushToast('Revision Restored', 'Loaded historical page blocks into the builder canvas. Click Save Page to publish.');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Drag-and-Drop WordPress Page Builder"
      className="fixed inset-0 z-50 bg-black/75 flex flex-col p-2 sm:p-4"
    >
      <div className="bg-[#FDFBF7] dark:bg-[#0B0F17] text-neutral-900 dark:text-neutral-100 rounded-md border border-neutral-300 dark:border-neutral-800 flex-1 flex flex-col overflow-hidden shadow-2xl">
        {/* Top Builder Toolbar */}
        <div className="bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 font-display font-bold text-base">
              <Layout className="w-4 h-4 text-[#E1262D]" />
              <span>Visual Drag &amp; Drop Page Builder</span>
            </span>
            {lastAutosaved && (
              <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                Autosaved {lastAutosaved}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => void handleLoadRevisions()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded hover:border-[#0D47FF] cursor-pointer"
            >
              <History className="w-3.5 h-3.5" />
              <span>Revisions</span>
            </button>
            <button
              type="button"
              onClick={() => void handleManualSave(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-[#0D47FF] text-[#0D47FF] dark:text-sky-400 font-semibold rounded hover:bg-[#0D47FF]/10 cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Save &amp; Preview</span>
            </button>
            <button
              type="button"
              onClick={() => void handleManualSave(false)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#E1262D] hover:bg-[#c51e24] text-white font-bold rounded cursor-pointer disabled:opacity-60"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Page'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close builder"
              className="p-1.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Page Settings Bar */}
        <div className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 px-4 py-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 text-xs">
          <input
            type="text"
            placeholder="Page Title"
            value={draft.title || ''}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            className="px-2.5 py-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-semibold"
          />
          <input
            type="text"
            placeholder="slug-url"
            value={draft.slug || ''}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            className="px-2.5 py-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 font-mono"
          />
          <select
            aria-label="Page publication status"
            value={draft.status || 'draft'}
            onChange={(e) => setDraft({ ...draft, status: e.target.value as CmsPage['status'] })}
            className="px-2.5 py-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
          >
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <input
            type="datetime-local"
            aria-label="Scheduled publish date"
            value={draft.scheduledAt || ''}
            onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })}
            className="px-2.5 py-1.5 rounded bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700"
          />
          <label className="inline-flex items-center gap-2 px-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(draft.showInHeader)}
              onChange={(e) => setDraft({ ...draft, showInHeader: e.target.checked })}
            />
            <span>Add to Header Menu</span>
          </label>
          <label className="inline-flex items-center gap-2 px-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(draft.showInFooter)}
              onChange={(e) => setDraft({ ...draft, showInFooter: e.target.checked })}
            />
            <span>Add to Footer Menu</span>
          </label>
        </div>

        {/* 3-Column WordPress Workspace: Block Palette | Drag & Drop Canvas | Inspector */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Left Palette */}
          <aside className="lg:col-span-3 border-r border-neutral-200 dark:border-neutral-800 p-4 overflow-y-auto bg-white dark:bg-neutral-900">
            <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3">
              Insert Content Block
            </div>
            <div className="space-y-2">
              {BLOCK_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.type}
                  type="button"
                  onClick={() => addBlock(tpl.type)}
                  className="w-full text-left p-3 rounded border border-neutral-200 dark:border-neutral-800 hover:border-[#E1262D] hover:bg-[#E1262D]/5 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{tpl.label}</span>
                    <Plus className="w-3.5 h-3.5 text-[#E1262D]" />
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">{tpl.desc}</p>
                </button>
              ))}
            </div>
          </aside>

          {/* Center Drag-and-Drop Canvas */}
          <div className="lg:col-span-5 p-4 overflow-y-auto space-y-3 bg-neutral-100/70 dark:bg-[#080c13]">
            <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
              <span>Page Canvas ({blocks.length} blocks)</span>
              <span>Drag handles or use arrows to reorder</span>
            </div>

            {blocks.length === 0 ? (
              <div className="p-10 rounded-md border-2 border-dashed border-neutral-300 dark:border-neutral-700 text-center text-xs text-neutral-500">
                Click any block from the left palette to start designing this page.
              </div>
            ) : (
              blocks.map((blk, idx) => {
                const isSelected = selectedBlock?.id === blk.id;
                return (
                  <div
                    key={blk.id}
                    draggable
                    onDragStart={() => setDragIndex(idx)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (dragIndex !== null) moveBlock(dragIndex, idx);
                      setDragIndex(null);
                    }}
                    onClick={() => setSelectedBlockId(blk.id)}
                    className={`rounded-md p-3.5 bg-white dark:bg-neutral-900 border transition-colors cursor-pointer ${
                      isSelected
                        ? 'border-[#E1262D] ring-2 ring-[#E1262D]/20'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 text-xs font-bold">
                        <GripVertical className="w-4 h-4 text-neutral-400 cursor-grab" />
                        <span className="uppercase font-mono text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-[#0D47FF] dark:text-sky-400">
                          {blk.type.replace('_', ' ')}
                        </span>
                        <span className="truncate max-w-[160px]">{blk.heading || '(No heading)'}</span>
                      </div>
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, idx - 1)}
                          disabled={idx === 0}
                          aria-label="Move block up"
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveBlock(idx, idx + 1)}
                          disabled={idx === blocks.length - 1}
                          aria-label="Move block down"
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateBlock(idx)}
                          aria-label="Duplicate block"
                          className="p-1 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteBlock(blk.id)}
                          aria-label="Remove block"
                          className="p-1 rounded hover:text-[#E1262D] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {blk.body && <p className="text-[11px] text-neutral-500 line-clamp-2">{blk.body}</p>}
                  </div>
                );
              })
            )}
          </div>

          {/* Right Block & SEO Inspector */}
          <aside className="lg:col-span-4 border-l border-neutral-200 dark:border-neutral-800 p-4 overflow-y-auto bg-white dark:bg-neutral-900 space-y-4 text-xs">
            {showRevisions ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold uppercase tracking-wider text-[11px]">
                    Revision History ({revisions.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowRevisions(false)}
                    className="text-[#0D47FF] font-semibold cursor-pointer"
                  >
                    Back to Inspector
                  </button>
                </div>
                {revisions.length === 0 ? (
                  <p className="text-neutral-500">Save changes to start recording revision snapshots.</p>
                ) : (
                  revisions.map((rev, i) => (
                    <div
                      key={String(rev.id || i)}
                      className="p-3 rounded border border-neutral-200 dark:border-neutral-800 space-y-1.5"
                    >
                      <div className="font-bold">{String(rev.title || 'Snapshot')}</div>
                      <div className="text-[11px] text-neutral-500">
                        By {String(rev.editorName || 'Editor')} · {String(rev.createdAt || '').slice(0, 19)}
                      </div>
                      <button
                        type="button"
                        onClick={() => restoreRevision(rev)}
                        className="inline-flex items-center gap-1 text-[#E1262D] font-bold hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore This Snapshot</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : selectedBlock ? (
              <div className="space-y-3.5">
                <div className="font-bold uppercase tracking-wider text-[11px] text-[#E1262D]">
                  Inspect Block · {selectedBlock.type.replace('_', ' ')}
                </div>

                <div>
                  <label className="block font-semibold mb-1">Heading / Title</label>
                  <input
                    type="text"
                    value={selectedBlock.heading || ''}
                    onChange={(e) => updateSelectedBlock({ heading: e.target.value })}
                    className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>

                {selectedBlock.type !== 'spacer_divider' && selectedBlock.type !== 'news_feed_grid' && (
                  <>
                    <div>
                      <label className="block font-semibold mb-1">Kicker / Subheading</label>
                      <input
                        type="text"
                        value={selectedBlock.subheading || ''}
                        onChange={(e) => updateSelectedBlock({ subheading: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Body Copy</label>
                      <textarea
                        rows={4}
                        value={selectedBlock.body || ''}
                        onChange={(e) => updateSelectedBlock({ body: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                      />
                    </div>
                  </>
                )}

                {(selectedBlock.type === 'hero_banner' || selectedBlock.type === 'media_spotlight') && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-1.5 font-semibold">
                      <ImageIcon className="w-3.5 h-3.5 text-[#0D47FF]" />
                      <span>Image URL or Pick from Media Library</span>
                    </label>
                    <input
                      type="text"
                      value={selectedBlock.imageUrl || ''}
                      onChange={(e) => updateSelectedBlock({ imageUrl: e.target.value })}
                      className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                    />
                    <select
                      aria-label="Select media library image"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) updateSelectedBlock({ imageUrl: e.target.value });
                      }}
                      className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                    >
                      <option value="">Pick image from Media Library...</option>
                      {mediaAssets.map((m) => (
                        <option key={m.id} value={m.url}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedBlock.type === 'video_embed' && (
                  <div className="space-y-1">
                    <label className="flex items-center gap-1.5 font-semibold">
                      <Video className="w-3.5 h-3.5 text-[#E1262D]" />
                      <span>Video URL (YouTube, Vimeo, or MP4)</span>
                    </label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=... or https://.../clip.mp4"
                      value={selectedBlock.videoUrl || ''}
                      onChange={(e) => updateSelectedBlock({ videoUrl: e.target.value })}
                      className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                    />
                  </div>
                )}

                {selectedBlock.type === 'news_feed_grid' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold mb-1">Category Filter</label>
                      <select
                        value={selectedBlock.categoryFilter || 'All'}
                        onChange={(e) =>
                          updateSelectedBlock({ categoryFilter: e.target.value as CategoryName | 'All' })
                        }
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                      >
                        <option value="All">All Categories</option>
                        {CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Story Limit</label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={selectedBlock.itemLimit || 6}
                        onChange={(e) => updateSelectedBlock({ itemLimit: Number(e.target.value) || 6 })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                      />
                    </div>
                  </div>
                )}

                {(selectedBlock.type === 'hero_banner' ||
                  selectedBlock.type === 'rich_text' ||
                  selectedBlock.type === 'media_spotlight' ||
                  selectedBlock.type === 'cta_promotion') && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div>
                      <label className="block font-semibold mb-1">Button Label</label>
                      <input
                        type="text"
                        value={selectedBlock.buttonText || ''}
                        onChange={(e) => updateSelectedBlock({ buttonText: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Button Link</label>
                      <input
                        type="text"
                        placeholder="view:frontpage or https://..."
                        value={selectedBlock.buttonUrl || ''}
                        onChange={(e) => updateSelectedBlock({ buttonUrl: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 font-mono text-[11px]"
                      />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  <div>
                    <label className="block font-semibold mb-1">Bg Color</label>
                    <input
                      type="color"
                      value={selectedBlock.backgroundColor || '#ffffff'}
                      onChange={(e) => updateSelectedBlock({ backgroundColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Text Color</label>
                    <input
                      type="color"
                      value={selectedBlock.textColor || '#111827'}
                      onChange={(e) => updateSelectedBlock({ textColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Align</label>
                    <select
                      value={selectedBlock.align || 'left'}
                      onChange={(e) =>
                        updateSelectedBlock({ align: e.target.value as 'left' | 'center' })
                      }
                      className="w-full h-8 px-1.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                    >
                      <option value="left">Left</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-neutral-500 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-neutral-700 dark:text-neutral-300">
                  <Type className="w-4 h-4" />
                  <span>Page SEO &amp; Meta</span>
                </div>
                <div>
                  <label className="block font-semibold mb-1">SEO Title</label>
                  <input
                    type="text"
                    value={draft.seoTitle || ''}
                    onChange={(e) => setDraft({ ...draft, seoTitle: e.target.value })}
                    className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">SEO Meta Description</label>
                  <textarea
                    rows={3}
                    value={draft.seoDescription || ''}
                    onChange={(e) => setDraft({ ...draft, seoDescription: e.target.value })}
                    className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
