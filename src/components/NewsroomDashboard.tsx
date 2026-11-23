import {
  Activity,
  ArrowDown,
  ArrowUp,
  Database,
  Download,
  Edit3,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  History,
  Image as ImageIcon,
  Layers,
  Layout,
  Lock,
  Megaphone,
  Palette,
  Plus,
  RefreshCw,
  RotateCcw,
  Rss,
  Save,
  Settings,
  Shield,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNewspaper } from '../contexts/NewspaperContext';
import { CATEGORIES, NEWS_BUREAUS } from '../data/seedArticles';
import {
  ALL_ROLES,
  Article,
  ArticleRevision,
  ArticleStatus,
  CategoryName,
  CmsPage,
  HomepageSection,
  HomepageSectionType,
  LanguageCode,
  NavigationItem,
  RoleName,
  RolePermissionConfig,
  RolePermissionSet,
  RssFeedSource,
} from '../types/newspaper';
import { AdminLoginView } from './AdminLoginView';
import { PageBuilderModal } from './PageBuilderModal';

type CmsTab = 'desk' | 'pages' | 'sections' | 'appearance' | 'media' | 'governance';

const WORKFLOW_STATUSES: ArticleStatus[] = [
  'draft',
  'in_review',
  'proofread',
  'approved',
  'scheduled',
  'published',
  'archived',
];

const PERMISSION_KEYS: Array<{ key: keyof RolePermissionSet; label: string }> = [
  { key: 'canAccessNewsroom', label: 'CMS Desk' },
  { key: 'canWriteDraft', label: 'Write' },
  { key: 'canEditAll', label: 'Edit All' },
  { key: 'canProofread', label: 'Proofread' },
  { key: 'canPublish', label: 'Publish' },
  { key: 'canManagePages', label: 'Pages' },
  { key: 'canCustomizeSite', label: 'Theme' },
  { key: 'canManageSeo', label: 'SEO' },
  { key: 'canManageMedia', label: 'Media' },
  { key: 'canManageAds', label: 'Ads' },
  { key: 'canModerateComments', label: 'Moderate' },
  { key: 'canViewAuditLogs', label: 'Audits' },
  { key: 'canManageRoles', label: 'Roles' },
  { key: 'canConfigureSettings', label: 'Settings' },
];

export function NewsroomDashboard() {
  const {
    user,
    adminToken,
    effectiveRole,
    permissions,
    rolePermissionMatrix,
    saveRolePermissions,
    isStaffAuthenticated,
    articles,
    saveArticle,
    transitionArticleStatus,
    deleteArticle,
    fetchArticleRevisions,
    openArticle,
    pages,
    deletePage,
    openCustomPage,
    homepageSections,
    saveHomepageSections,
    navigationItems,
    saveNavigationItems,
    siteSettings,
    saveSiteSettings,
    visualEditMode,
    setVisualEditMode,
    mediaAssets,
    saveMediaAsset,
    deleteMediaAsset,
    campaigns,
    saveCampaign,
    auditLogs,
    privateUsers,
    staffProfiles,
    updateUserRole,
    rssFeeds,
    saveRssFeeds,
    refreshLiveNews,
    liveNewsLoading,
    webVitals,
    pushToast,
  } = useNewspaper();

  const [activeTab, setActiveTab] = useState<CmsTab>('desk');

  // --- Tab 1: Editorial Articles State ---
  const [editingArticle, setEditingArticle] = useState<Partial<Article> | null>(null);
  const [isNewArticle, setIsNewArticle] = useState(false);
  const [articleAutosavedAt, setArticleAutosavedAt] = useState<string | null>(null);
  const [articleRevisions, setArticleRevisions] = useState<ArticleRevision[]>([]);
  const [showArticleRevisions, setShowArticleRevisions] = useState(false);

  // RSS Feed addition form
  const [newFeedName, setNewFeedName] = useState('');
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [newFeedCat, setNewFeedCat] = useState<CategoryName>('Bangladesh National');

  // --- Tab 2: Unlimited Pages & Builder Modal State ---
  const [builderPage, setBuilderPage] = useState<{ page: Partial<CmsPage>; isNew: boolean } | null>(null);

  // --- Tab 3: Homepage Section Customizer State ---
  const [localSections, setLocalSections] = useState<HomepageSection[]>(homepageSections);
  const [dragSecIdx, setDragSecIdx] = useState<number | null>(null);
  const [selectedSecId, setSelectedSecId] = useState<string>(homepageSections[0]?.id || '');

  useEffect(() => {
    setLocalSections(homepageSections);
  }, [homepageSections]);

  // --- Tab 4: Site Appearance & Menus State ---
  const [localSettings, setLocalSettings] = useState(siteSettings);
  const [localNav, setLocalNav] = useState<NavigationItem[]>(navigationItems);
  const [newNavLabel, setNewNavLabel] = useState('');
  const [newNavLocation, setNewNavLocation] = useState<'header' | 'footer'>('header');
  const [newNavType, setNewNavType] = useState<'view' | 'page' | 'category' | 'url'>('page');
  const [newNavTarget, setNewNavTarget] = useState('');

  useEffect(() => {
    setLocalSettings(siteSettings);
  }, [siteSettings]);

  useEffect(() => {
    setLocalNav(navigationItems);
  }, [navigationItems]);

  // --- Tab 5: Media & Brand Promotions State ---
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaUrl, setMediaUrl] = useState('/src/assets/images/tech_science_screen_1795430986363.jpg');
  const [mediaAlt, setMediaAlt] = useState('');
  const [mediaRatio, setMediaRatio] = useState<'16:9' | '4:3' | '1:1' | '3:4'>('4:3');

  const [campTitle, setCampTitle] = useState('');
  const [campSponsor, setCampSponsor] = useState('');
  const [campTargetUrl, setCampTargetUrl] = useState('scroll:newsletter');
  const [campPlacement, setCampPlacement] = useState<
    'sidebar_featured' | 'hero_ribbon' | 'article_inline' | 'newsletter_sponsor'
  >('sidebar_featured');

  // --- Tab 6: Granular Role Permissions State ---
  const [localMatrix, setLocalMatrix] = useState<RolePermissionConfig[]>(rolePermissionMatrix);
  useEffect(() => {
    setLocalMatrix(rolePermissionMatrix);
  }, [rolePermissionMatrix]);

  // 15s Debounced Article Autosave
  useEffect(() => {
    if (!editingArticle || isNewArticle || !editingArticle.id || !editingArticle.title) return;
    const timer = setTimeout(async () => {
      const saved = await saveArticle(editingArticle, false, 'Background autosave');
      if (saved) {
        setArticleAutosavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [editingArticle, isNewArticle, saveArticle]);

  // Require real Staff or Admin Authentication
  if (!isStaffAuthenticated) {
    return (
      <div className="space-y-4">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-xs flex items-center gap-2 text-amber-900 dark:text-amber-200">
            <Lock className="w-4 h-4 shrink-0 text-[#E1262D]" />
            <span>
              The Binduz WordPress CMS Desk is restricted to authenticated staff and administrators. Sign in below to unlock full publishing and site design tools.
            </span>
          </div>
        </div>
        <AdminLoginView />
      </div>
    );
  }

  // --- Article Composer Handlers ---
  const openNewComposer = () => {
    setIsNewArticle(true);
    setArticleAutosavedAt(null);
    setShowArticleRevisions(false);
    setEditingArticle({
      title: '',
      subtitle: '',
      excerpt: '',
      content: '',
      category: 'Bangladesh National',
      status: 'draft',
      imageUrl: '/src/assets/images/hero_climate_desk_1795430987467.jpg',
      videoUrl: '',
      audioUrl: '',
      locationName: 'Dhaka, Bangladesh',
      lat: 23.8103,
      lng: 90.4125,
      isBreaking: false,
      isTrending: true,
      isFeatured: false,
      isEditorsPick: false,
      isSpecialReport: false,
      language: 'en',
    });
  };

  const handleEditExistingArticle = async (art: Article) => {
    const isWire = art.id.startsWith('live-') || art.id.startsWith('newsapi-');
    setIsNewArticle(isWire);
    setArticleAutosavedAt(null);
    setShowArticleRevisions(false);
    setEditingArticle({
      ...art,
      id: isWire ? `cms-${art.slug.slice(0, 48)}` : art.id,
    });
    if (!isWire) {
      const revs = await fetchArticleRevisions(art.id);
      setArticleRevisions(revs);
    } else {
      setArticleRevisions([]);
    }
  };

  const handleSaveComposer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArticle) return;
    const saved = await saveArticle(editingArticle, isNewArticle, 'Manual CMS save');
    if (saved) {
      setEditingArticle(null);
      setIsNewArticle(false);
    }
  };

  const handleAddRssFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;
    const next: RssFeedSource[] = [
      ...rssFeeds,
      {
        id: `rss-${Date.now()}`,
        name: newFeedName.trim(),
        url: newFeedUrl.trim(),
        category: newFeedCat,
        enabled: true,
      },
    ];
    await saveRssFeeds(next);
    setNewFeedName('');
    setNewFeedUrl('');
  };

  // --- Homepage Section Customizer Handlers ---
  const moveSection = (from: number, to: number) => {
    if (to < 0 || to >= localSections.length || from === to) return;
    const copy = [...localSections];
    const [moved] = copy.splice(from, 1);
    copy.splice(to, 0, moved);
    setLocalSections(copy.map((s, idx) => ({ ...s, orderIndex: idx })));
  };

  const addHomepageSection = (sectionType: HomepageSectionType) => {
    const id = `sec-${Date.now()}`;
    const newSec: HomepageSection = {
      id,
      sectionType,
      title:
        sectionType === 'custom_banner'
          ? 'Custom Promotion Banner'
          : sectionType === 'live_news'
            ? 'Live News Wires'
            : `New ${sectionType.replace(/_/g, ' ')}`,
      subtitle:
        sectionType === 'live_news'
          ? 'Auto-updating verified National Press, National TV, BBC, CNN, Reuters & Global Wires'
          : 'Configured from CMS Section Customizer',
      visible: true,
      orderIndex: localSections.length,
      itemCount: sectionType === 'live_news' ? 12 : 4,
      accentColor: '#E1262D',
      promoHeadline: sectionType === 'custom_banner' ? 'Special Edition Briefing' : undefined,
      promoBody: sectionType === 'custom_banner' ? 'Highlight important coverage, brand partnerships, or subscriber drives.' : undefined,
      promoButtonText: sectionType === 'custom_banner' ? 'Learn More' : undefined,
      promoButtonUrl: sectionType === 'custom_banner' ? 'scroll:newsletter' : undefined,
    };
    setLocalSections([...localSections, newSec]);
    setSelectedSecId(id);
  };

  const updateSelectedSection = (patch: Partial<HomepageSection>) => {
    setLocalSections((prev) =>
      prev.map((s) => (s.id === selectedSecId ? { ...s, ...patch } : s))
    );
  };

  const removeHomepageSection = (id: string) => {
    setLocalSections((prev) => prev.filter((s) => s.id !== id));
  };

  const selectedSec = localSections.find((s) => s.id === selectedSecId) || localSections[0];

  // --- Navigation Menu Handlers ---
  const handleAddNavItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNavLabel.trim() || !newNavTarget.trim()) return;
    const item: NavigationItem = {
      id: `nav-${Date.now()}`,
      label: newNavLabel.trim(),
      location: newNavLocation,
      targetType: newNavType,
      targetValue: newNavTarget.trim(),
      orderIndex: localNav.length,
      visible: true,
    };
    setLocalNav([...localNav, item]);
    setNewNavLabel('');
    setNewNavTarget('');
  };

  const moveNav = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= localNav.length) return;
    const copy = [...localNav];
    const [m] = copy.splice(idx, 1);
    copy.splice(target, 0, m);
    setLocalNav(copy.map((n, i) => ({ ...n, orderIndex: i })));
  };

  // --- Media File Upload Handler (Canvas Resize to Safe JPEG Data URL) ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) {
      pushToast('File Notice', 'Select an image file (JPG, PNG, WebP) or paste a video/media URL.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const maxW = 1280;
        const scale = img.width > maxW ? maxW / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
        await saveMediaAsset({
          id: `upload-${Date.now()}`,
          url: dataUrl,
          mediaType: 'image',
          title: mediaTitle.trim() || file.name.replace(/\.[^.]+$/, ''),
          altText: mediaAlt.trim() || file.name,
          aspectRatio: mediaRatio,
          uploadedBy: user?.uid || 'admin-desk',
        });
        setMediaTitle('');
        setMediaAlt('');
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleAddMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mediaTitle.trim() || !mediaUrl.trim()) return;
    await saveMediaAsset({
      id: `media-${Date.now()}`,
      url: mediaUrl.trim(),
      mediaType,
      title: mediaTitle.trim(),
      altText: mediaAlt.trim() || mediaTitle.trim(),
      aspectRatio: mediaRatio,
      uploadedBy: user?.uid || 'admin-desk',
    });
    setMediaTitle('');
    setMediaAlt('');
  };

  const handleAddCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campTitle.trim() || !campSponsor.trim()) return;
    await saveCampaign({
      id: `camp-${Date.now()}`,
      title: campTitle.trim(),
      sponsor: campSponsor.trim(),
      placement: campPlacement,
      targetUrl: campTargetUrl.trim() || 'scroll:newsletter',
      status: 'active',
      impressions: 0,
      clicks: 0,
      ownerId: user?.uid || 'admin-desk',
    });
    setCampTitle('');
    setCampSponsor('');
  };

  const toggleRolePermission = (roleName: RoleName, permKey: keyof RolePermissionSet) => {
    setLocalMatrix((prev) =>
      prev.map((row) =>
        row.roleName === roleName ? { ...row, [permKey]: !row[permKey] } : row
      )
    );
  };

  const handleExportBackup = () => {
    const bundle = {
      exportedAt: new Date().toISOString(),
      exportedBy: adminToken ? 'admin-passcode' : user?.email,
      siteSettings,
      homepageSections,
      navigationItems,
      rolePermissionMatrix,
      articles,
      pages,
      mediaAssets,
      campaigns,
      rssFeeds,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `binduz-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast('CMS Backup Downloaded', 'Full database JSON snapshot exported.');
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top CMS Command Header */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-widest text-[#E1262D] font-bold">
            WordPress-Grade Publishing · Visual Builder · Live Controls
          </span>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-white mt-0.5">
            Newsroom &amp; CMS Workstation
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Active Role: <strong className="text-neutral-900 dark:text-white">{effectiveRole}</strong>{' '}
            {adminToken ? '· Private Admin Session' : user?.email ? `· ${user.email}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {permissions.canCustomizeSite && (
            <button
              type="button"
              onClick={() => setVisualEditMode(!visualEditMode)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded font-bold border cursor-pointer ${
                visualEditMode
                  ? 'bg-[#E1262D] border-[#E1262D] text-white'
                  : 'border-neutral-300 dark:border-neutral-700 hover:border-[#E1262D]'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>{visualEditMode ? 'Visual Edit: ON' : 'Visual Edit Mode'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => void refreshLiveNews()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:border-[#0D47FF] font-semibold cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${liveNewsLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Live Wires</span>
          </button>
          <button
            type="button"
            onClick={handleExportBackup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON Backup</span>
          </button>
        </div>
      </div>

      {/* CMS Workspace Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800 pb-2 overflow-x-auto text-xs font-semibold">
        {(
          [
            { id: 'desk', label: 'Articles & Live Wires', icon: FileText },
            { id: 'pages', label: 'Pages & Drag Builder', icon: Layout },
            { id: 'sections', label: 'Homepage Sections', icon: Layers },
            { id: 'appearance', label: 'Theme, Header, Footer & Menus', icon: Palette },
            { id: 'media', label: 'Media & Brand Promotions', icon: ImageIcon },
            { id: 'governance', label: 'Roles, Analytics & Backups', icon: Shield },
          ] as Array<{ id: CmsTab; label: string; icon: React.ComponentType<{ className?: string }> }>
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded whitespace-nowrap cursor-pointer transition-colors ${
                active
                  ? 'bg-[#E1262D] text-white'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: EDITORIAL ARTICLES, AUTOSAVE, REVISIONS, SCHEDULING & LIVE RSS */}
      {activeTab === 'desk' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-xl font-bold">
              Editorial Dispatches &amp; Live Wire Feed ({articles.length})
            </h3>
            {permissions.canWriteDraft && (
              <button
                type="button"
                onClick={openNewComposer}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white text-xs font-bold rounded cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Compose New Dispatch</span>
              </button>
            )}
          </div>

          {editingArticle && (
            <form
              onSubmit={handleSaveComposer}
              className="bg-white dark:bg-neutral-900 border border-[#E1262D]/50 rounded-md p-6 space-y-4 text-xs shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold">
                    {isNewArticle ? 'New Dispatch Composer' : `Editing: ${editingArticle.title}`}
                  </span>
                  {articleAutosavedAt && (
                    <span className="font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
                      Autosaved {articleAutosavedAt}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {articleRevisions.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowArticleRevisions((v) => !v)}
                      className="inline-flex items-center gap-1 text-[#0D47FF] font-semibold hover:underline cursor-pointer"
                    >
                      <History className="w-3.5 h-3.5" />
                      <span>Revisions ({articleRevisions.length})</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditingArticle(null)}
                    className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>

              {showArticleRevisions && (
                <div className="p-3 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 space-y-2 max-h-48 overflow-y-auto">
                  <div className="font-bold uppercase tracking-wider text-[10px] text-neutral-500">
                    Article Revision History
                  </div>
                  {articleRevisions.map((rev) => (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between gap-2 pb-2 border-b last:border-b-0 border-neutral-200 dark:border-neutral-800"
                    >
                      <div>
                        <span className="font-semibold">{rev.title}</span> ·{' '}
                        <span className="text-neutral-500">{rev.editorName} ({rev.status})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingArticle((prev) => ({
                            ...prev,
                            title: rev.title,
                            excerpt: rev.excerpt || prev?.excerpt,
                            content: rev.content,
                          }));
                          setShowArticleRevisions(false);
                          pushToast('Revision Loaded', 'Historical article copy restored into editor.');
                        }}
                        className="inline-flex items-center gap-1 text-[#E1262D] font-bold hover:underline cursor-pointer shrink-0"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Headline</label>
                  <input
                    type="text"
                    required
                    value={editingArticle.title || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Section Category</label>
                  <select
                    value={editingArticle.category || 'Bangladesh National'}
                    onChange={(e) =>
                      setEditingArticle({ ...editingArticle, category: e.target.value as CategoryName })
                    }
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Workflow Status</label>
                  <select
                    value={editingArticle.status || 'draft'}
                    onChange={(e) =>
                      setEditingArticle({ ...editingArticle, status: e.target.value as ArticleStatus })
                    }
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  >
                    {WORKFLOW_STATUSES.map((st) => (
                      <option key={st} value={st} disabled={st === 'published' && !permissions.canPublish}>
                        {st.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Scheduled Publish Date</label>
                  <input
                    type="datetime-local"
                    value={editingArticle.scheduledAt || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, scheduledAt: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Lead Image (Pick or URL)</label>
                  <select
                    value={editingArticle.imageUrl || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, imageUrl: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  >
                    {mediaAssets.map((m) => (
                      <option key={m.id} value={m.url}>
                        {m.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Bureau Location</label>
                  <select
                    value={editingArticle.locationName || 'Dhaka, Bangladesh'}
                    onChange={(e) => {
                      const b = NEWS_BUREAUS.find((item) => e.target.value.startsWith(item.city));
                      setEditingArticle({
                        ...editingArticle,
                        locationName: e.target.value,
                        lat: b?.lat,
                        lng: b?.lng,
                      });
                    }}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  >
                    {NEWS_BUREAUS.map((b) => (
                      <option key={b.id} value={`${b.city}, ${b.country}`}>
                        {b.city}, {b.country}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold mb-1">Lead Image Custom URL</label>
                  <input
                    type="text"
                    value={editingArticle.imageUrl || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, imageUrl: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Video Dispatch URL (Optional MP4)</label>
                  <input
                    type="url"
                    placeholder="https://.../dispatch-video.mp4"
                    value={editingArticle.videoUrl || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, videoUrl: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Audio Briefing URL (Optional MP3/OGG)</label>
                  <input
                    type="url"
                    placeholder="https://.../audio-briefing.mp3"
                    value={editingArticle.audioUrl || ''}
                    onChange={(e) => setEditingArticle({ ...editingArticle, audioUrl: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Executive Summary / Excerpt</label>
                <textarea
                  rows={2}
                  required
                  value={editingArticle.excerpt || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, excerpt: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">Full Dispatch Copy (separate paragraphs with blank line)</label>
                <textarea
                  rows={6}
                  required
                  value={editingArticle.content || ''}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-sans"
                />
              </div>

              <div className="flex flex-wrap items-center gap-5 pt-2">
                {(
                  [
                    { key: 'isBreaking', label: 'Breaking News' },
                    { key: 'isTrending', label: 'Trending Now' },
                    { key: 'isFeatured', label: 'Hero Slider Featured' },
                    { key: 'isEditorsPick', label: "Editor's Pick" },
                    { key: 'isSpecialReport', label: 'Special Report' },
                  ] as const
                ).map((flag) => (
                  <label key={flag.key} className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(editingArticle[flag.key])}
                      onChange={(e) =>
                        setEditingArticle({ ...editingArticle, [flag.key]: e.target.checked })
                      }
                    />
                    <span>{flag.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white font-bold rounded cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Dispatch</span>
                </button>
              </div>
            </form>
          )}

          {/* Articles Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 font-mono uppercase text-[10px] text-neutral-500">
                <tr>
                  <th className="p-3.5">Headline</th>
                  <th className="p-3.5">Section</th>
                  <th className="p-3.5">Source</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {articles.slice(0, 35).map((art) => {
                  const isLiveWire = art.id.startsWith('live-') || art.id.startsWith('newsapi-');
                  return (
                    <tr key={art.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="p-3.5 max-w-md">
                        <button
                          type="button"
                          onClick={() => openArticle(art)}
                          className="font-bold text-neutral-900 dark:text-white hover:text-[#E1262D] text-left cursor-pointer line-clamp-1"
                        >
                          {art.title}
                        </button>
                      </td>
                      <td className="p-3.5 font-mono text-[11px]">{art.category}</td>
                      <td className="p-3.5 text-[11px] text-neutral-500">
                        {isLiveWire ? `Live Wire · ${art.sourceName || art.authorName}` : art.authorName}
                      </td>
                      <td className="p-3.5 font-mono text-[11px] uppercase font-bold text-[#0D47FF] dark:text-sky-400">
                        {art.status.replace('_', ' ')}
                      </td>
                      <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                        {permissions.canWriteDraft && (
                          <button
                            type="button"
                            onClick={() => void handleEditExistingArticle(art)}
                            className="text-neutral-700 dark:text-neutral-200 hover:text-[#E1262D] font-semibold cursor-pointer"
                          >
                            {isLiveWire ? 'Import & Edit' : 'Edit'}
                          </button>
                        )}
                        {!isLiveWire && permissions.canPublish && art.status !== 'published' && (
                          <button
                            type="button"
                            onClick={() => void transitionArticleStatus(art, 'published')}
                            className="text-emerald-600 font-bold hover:underline cursor-pointer"
                          >
                            Publish
                          </button>
                        )}
                        {!isLiveWire && permissions.canEditAll && (
                          <button
                            type="button"
                            onClick={() => void deleteArticle(art.id)}
                            aria-label={`Delete ${art.title}`}
                            className="text-neutral-400 hover:text-[#E1262D] cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Authorized RSS Feeds & Wire Sources */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Rss className="w-4 h-4 text-[#E1262D]" />
                <span>Authorized Journalism RSS &amp; Wire Feeds ({rssFeeds.length})</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {rssFeeds.map((feed) => (
                <div
                  key={feed.id}
                  className="p-3 rounded border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-bold truncate">{feed.name}</div>
                    <div className="text-[10px] font-mono text-neutral-500 truncate">{feed.category}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      void saveRssFeeds(
                        rssFeeds.map((f) => (f.id === feed.id ? { ...f, enabled: !f.enabled } : f))
                      )
                    }
                    className={`px-2 py-1 rounded text-[10px] font-bold cursor-pointer ${
                      feed.enabled ? 'bg-emerald-600 text-white' : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-500'
                    }`}
                  >
                    {feed.enabled ? 'LIVE' : 'OFF'}
                  </button>
                </div>
              ))}
            </div>

            {permissions.canConfigureSettings && (
              <form onSubmit={handleAddRssFeed} className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <input
                  type="text"
                  placeholder="Feed Source Name"
                  value={newFeedName}
                  onChange={(e) => setNewFeedName(e.target.value)}
                  className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                />
                <input
                  type="url"
                  placeholder="https://feeds.bbci.co.uk/news/..."
                  value={newFeedUrl}
                  onChange={(e) => setNewFeedUrl(e.target.value)}
                  className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 sm:col-span-2"
                />
                <div className="flex gap-2">
                  <select
                    value={newFeedCat}
                    onChange={(e) => setNewFeedCat(e.target.value as CategoryName)}
                    className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex-1"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="px-3 py-2 bg-[#0D47FF] text-white font-bold rounded cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: UNLIMITED PAGES & VISUAL DRAG-AND-DROP BUILDER */}
      {activeTab === 'pages' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-bold">
                Unlimited WordPress Pages ({pages.length})
              </h3>
              <p className="text-xs text-neutral-500">
                Create unlimited custom pages with Drag &amp; Drop layout blocks, scheduling, autosave, and revision history.
              </p>
            </div>
            {permissions.canManagePages && (
              <button
                type="button"
                onClick={() =>
                  setBuilderPage({
                    isNew: true,
                    page: {
                      id: `page-${Date.now()}`,
                      title: 'Special Edition Page',
                      slug: `page-${Date.now().toString().slice(-5)}`,
                      status: 'published',
                      showInHeader: true,
                      showInFooter: true,
                      blocks: [],
                    },
                  })
                }
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white text-xs font-bold rounded cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Page in Drag &amp; Drop Builder</span>
              </button>
            )}
          </div>

          {pages.length === 0 ? (
            <div className="p-10 text-center bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md space-y-3">
              <Layout className="w-8 h-8 text-neutral-400 mx-auto" />
              <p className="text-sm font-semibold">No custom pages built yet</p>
              <p className="text-xs text-neutral-500">
                Click &ldquo;Create Page in Drag &amp; Drop Builder&rdquo; to launch About, Contact, Special Coverage, or Partner pages.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {pages.map((p) => (
                <div
                  key={p.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 flex flex-col justify-between gap-4 text-xs"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[10px] uppercase font-bold text-[#0D47FF] dark:text-sky-400">
                        {p.status} · {p.blocks.length} blocks
                      </span>
                      <span className="font-mono text-[10px] text-neutral-400">/?page={p.slug}</span>
                    </div>
                    <h4 className="font-display text-lg font-bold mt-1">{p.title}</h4>
                    <p className="text-neutral-500 mt-1 line-clamp-2">
                      {p.description || 'Custom block-built WordPress page.'}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openCustomPage(p.slug)}
                        className="px-2.5 py-1 rounded bg-neutral-100 dark:bg-neutral-800 font-semibold hover:text-[#E1262D] cursor-pointer"
                      >
                        View Live
                      </button>
                      {permissions.canManagePages && (
                        <button
                          type="button"
                          onClick={() => setBuilderPage({ page: p, isNew: false })}
                          className="px-2.5 py-1 rounded bg-[#0D47FF] text-white font-bold cursor-pointer"
                        >
                          Edit Blocks
                        </button>
                      )}
                    </div>
                    {permissions.canManagePages && (
                      <button
                        type="button"
                        onClick={() => void deletePage(p.id)}
                        aria-label={`Delete ${p.title}`}
                        className="text-neutral-400 hover:text-[#E1262D] cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: HOMEPAGE SECTION CUSTOMIZER (ADD / REMOVE / REORDER / HIDE / EDIT) */}
      {activeTab === 'sections' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-xl font-bold">
                Homepage Section Stack (Drag &amp; Drop)
              </h3>
              <button
                type="button"
                onClick={() => void saveHomepageSections(localSections)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#E1262D] hover:bg-[#c51e24] text-white font-bold rounded cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Homepage Layout</span>
              </button>
            </div>

            <div className="space-y-2">
              {localSections.map((sec, idx) => (
                <div
                  key={sec.id}
                  draggable
                  onDragStart={() => setDragSecIdx(idx)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (dragSecIdx !== null) moveSection(dragSecIdx, idx);
                    setDragSecIdx(null);
                  }}
                  onClick={() => setSelectedSecId(sec.id)}
                  className={`p-3.5 rounded-md bg-white dark:bg-neutral-900 border flex items-center justify-between gap-3 cursor-pointer ${
                    selectedSec?.id === sec.id
                      ? 'border-[#E1262D] ring-2 ring-[#E1262D]/20'
                      : 'border-neutral-200 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <GripVertical className="w-4 h-4 text-neutral-400 cursor-grab shrink-0" />
                    <div className="min-w-0">
                      <div className="font-bold truncate">{sec.title}</div>
                      <div className="text-[10px] font-mono text-neutral-400">
                        {sec.sectionType} · {sec.visible ? 'Visible' : 'Hidden'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() =>
                        setLocalSections((prev) =>
                          prev.map((s) => (s.id === sec.id ? { ...s, visible: !s.visible } : s))
                        )
                      }
                      aria-label={sec.visible ? 'Hide section' : 'Show section'}
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      {sec.visible ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, idx - 1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(idx, idx + 1)}
                      disabled={idx === localSections.length - 1}
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeHomepageSection(sec.id)}
                      className="p-1.5 rounded text-neutral-400 hover:text-[#E1262D] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="font-bold">Add Homepage Section</div>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { type: 'live_news', label: '+ Live News' },
                    { type: 'trending_now', label: '+ Trending Now' },
                    { type: 'breaking_news', label: '+ Breaking News' },
                    { type: 'latest_news', label: '+ Latest News' },
                    { type: 'video_news', label: '+ Video News' },
                    { type: 'audio_news', label: '+ Audio News' },
                    { type: 'brand_promotions', label: '+ Brand Promotion' },
                    { type: 'editors_picks', label: "+ Editor's Picks" },
                    { type: 'most_read', label: '+ Most Read' },
                    { type: 'categories_bento', label: '+ Categories Bento' },
                    { type: 'special_reports', label: '+ Special Reports' },
                    { type: 'custom_banner', label: '+ Custom Banner' },
                  ] as Array<{ type: HomepageSectionType; label: string }>
                ).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => addHomepageSection(item.type)}
                    className="px-2.5 py-1.5 rounded bg-neutral-100 dark:bg-neutral-800 hover:bg-[#0D47FF] hover:text-white font-semibold cursor-pointer"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 space-y-4">
            {selectedSec ? (
              <>
                <div className="font-bold uppercase tracking-wider text-[11px] text-[#E1262D]">
                  Customize Section · {selectedSec.sectionType}
                </div>
                <div>
                  <label className="block font-semibold mb-1">Section Title</label>
                  <input
                    type="text"
                    value={selectedSec.title}
                    onChange={(e) => updateSelectedSection({ title: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Subtitle / Description</label>
                  <input
                    type="text"
                    value={selectedSec.subtitle || ''}
                    onChange={(e) => updateSelectedSection({ subtitle: e.target.value })}
                    className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold mb-1">Stories Count</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={selectedSec.itemCount || 5}
                      onChange={(e) => updateSelectedSection({ itemCount: Number(e.target.value) || 5 })}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-1">Category Filter</label>
                    <select
                      value={selectedSec.categoryFilter || 'All'}
                      onChange={(e) => updateSelectedSection({ categoryFilter: e.target.value })}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                    >
                      <option value="All">All Sections</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedSec.sectionType === 'hero_slider_trending' && (
                  <div>
                    <label className="block font-semibold mb-1">Slider Auto-Advance Interval (ms)</label>
                    <input
                      type="number"
                      min={2000}
                      max={20000}
                      step={500}
                      value={selectedSec.autoPlayMs || 6000}
                      onChange={(e) => updateSelectedSection({ autoPlayMs: Number(e.target.value) || 6000 })}
                      className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                    />
                  </div>
                )}

                {(selectedSec.sectionType === 'brand_promotions' ||
                  selectedSec.sectionType === 'custom_banner') && (
                  <div className="space-y-3 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                    <div>
                      <label className="block font-semibold mb-1">Promo Headline</label>
                      <input
                        type="text"
                        value={selectedSec.promoHeadline || ''}
                        onChange={(e) => updateSelectedSection({ promoHeadline: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Promo Body</label>
                      <textarea
                        rows={3}
                        value={selectedSec.promoBody || ''}
                        onChange={(e) => updateSelectedSection({ promoBody: e.target.value })}
                        className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-semibold mb-1">Button Text</label>
                        <input
                          type="text"
                          value={selectedSec.promoButtonText || ''}
                          onChange={(e) => updateSelectedSection({ promoButtonText: e.target.value })}
                          className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700"
                        />
                      </div>
                      <div>
                        <label className="block font-semibold mb-1">Button Target</label>
                        <input
                          type="text"
                          value={selectedSec.promoButtonUrl || ''}
                          onChange={(e) => updateSelectedSection({ promoButtonUrl: e.target.value })}
                          className="w-full p-2 rounded bg-neutral-50 dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-700 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block font-semibold mb-1">Accent Color</label>
                      <input
                        type="color"
                        value={selectedSec.accentColor || '#E1262D'}
                        onChange={(e) => updateSelectedSection({ accentColor: e.target.value })}
                        className="w-full h-9 rounded cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-neutral-500">Select a section on the left to customize it.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SITE APPEARANCE, COLORS, FONTS, HEADER, FOOTER & MENUS */}
      {activeTab === 'appearance' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void saveSiteSettings(localSettings);
            }}
            className="lg:col-span-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6 space-y-4"
          >
            <div className="font-display text-lg font-bold">
              Site Identity, Header, Footer &amp; Colors
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block font-semibold mb-1">Masthead Name</label>
                <input
                  type="text"
                  value={localSettings.siteName}
                  onChange={(e) => setLocalSettings({ ...localSettings, siteName: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Monogram</label>
                <input
                  type="text"
                  maxLength={3}
                  value={localSettings.brandMarkText || 'B'}
                  onChange={(e) => setLocalSettings({ ...localSettings, brandMarkText: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Header Sub-Tagline</label>
              <input
                type="text"
                value={localSettings.tagline || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, tagline: e.target.value })}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Header CTA Button Text</label>
                <input
                  type="text"
                  value={localSettings.headerCtaLabel || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerCtaLabel: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Header CTA Target</label>
                <input
                  type="text"
                  value={localSettings.headerCtaUrl || ''}
                  onChange={(e) => setLocalSettings({ ...localSettings, headerCtaUrl: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold mb-1">Primary Accent</label>
                <input
                  type="color"
                  value={localSettings.primaryColor || '#E1262D'}
                  onChange={(e) => setLocalSettings({ ...localSettings, primaryColor: e.target.value })}
                  className="w-full h-9 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Secondary Accent</label>
                <input
                  type="color"
                  value={localSettings.secondaryColor || '#0D47FF'}
                  onChange={(e) => setLocalSettings({ ...localSettings, secondaryColor: e.target.value })}
                  className="w-full h-9 rounded cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Footer Bg Color</label>
                <input
                  type="color"
                  value={localSettings.footerBgColor || '#0B0F17'}
                  onChange={(e) => setLocalSettings({ ...localSettings, footerBgColor: e.target.value })}
                  className="w-full h-9 rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold mb-1">Display Font</label>
                <select
                  value={localSettings.displayFont || 'Playfair Display'}
                  onChange={(e) => setLocalSettings({ ...localSettings, displayFont: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Fraunces">Fraunces</option>
                  <option value="Georgia">Georgia Serif</option>
                  <option value="Merriweather">Merriweather</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold mb-1">Body Font</label>
                <select
                  value={localSettings.bodyFont || 'Plus Jakarta Sans'}
                  onChange={(e) => setLocalSettings({ ...localSettings, bodyFont: e.target.value })}
                  className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <option value="Plus Jakarta Sans">Plus Jakarta Sans</option>
                  <option value="DM Sans">DM Sans</option>
                  <option value="Inter">Inter</option>
                  <option value="system-ui">System Sans</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1">Footer Editorial Bio</label>
              <textarea
                rows={2}
                value={localSettings.footerBio || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, footerBio: e.target.value })}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
            </div>

            <div>
              <label className="block font-semibold mb-1">Footer Copyright Text</label>
              <input
                type="text"
                value={localSettings.footerCopyright || ''}
                onChange={(e) => setLocalSettings({ ...localSettings, footerCopyright: e.target.value })}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
            </div>

            <div className="flex flex-wrap gap-4 pt-1">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.showBreakingBar !== false}
                  onChange={(e) => setLocalSettings({ ...localSettings, showBreakingBar: e.target.checked })}
                />
                <span>Show Breaking Bar</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableComments}
                  onChange={(e) => setLocalSettings({ ...localSettings, enableComments: e.target.checked })}
                />
                <span>Enable Comments</span>
              </label>
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={localSettings.enableAiGeo}
                  onChange={(e) => setLocalSettings({ ...localSettings, enableAiGeo: e.target.checked })}
                />
                <span>Enable AI &amp; GEO Schema</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#E1262D] hover:bg-[#c51e24] text-white font-bold rounded cursor-pointer"
            >
              Save Live Site Appearance &amp; Theme
            </button>
          </form>

          {/* Header & Footer Navigation Menu Editor */}
          <div className="lg:col-span-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="font-display text-lg font-bold">
                Header &amp; Footer Navigation Menus
              </div>
              <button
                type="button"
                onClick={() => void saveNavigationItems(localNav)}
                className="px-4 py-1.5 bg-[#0D47FF] text-white font-bold rounded cursor-pointer"
              >
                Save Menus
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {localNav.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-bold">
                      {item.label}{' '}
                      <span className="font-mono text-[10px] uppercase text-[#E1262D]">
                        [{item.location}]
                      </span>
                    </div>
                    <div className="font-mono text-[10px] text-neutral-500">
                      {item.targetType} &rarr; {item.targetValue}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setLocalNav((prev) =>
                          prev.map((n) => (n.id === item.id ? { ...n, visible: !n.visible } : n))
                        )
                      }
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                    >
                      {item.visible ? (
                        <Eye className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <EyeOff className="w-3.5 h-3.5 text-neutral-400" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNav(idx, -1)}
                      disabled={idx === 0}
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveNav(idx, 1)}
                      disabled={idx === localNav.length - 1}
                      className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLocalNav((prev) => prev.filter((n) => n.id !== item.id))}
                      className="p-1.5 rounded text-neutral-400 hover:text-[#E1262D] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form
              onSubmit={handleAddNavItem}
              className="pt-4 border-t border-neutral-100 dark:border-neutral-800 space-y-2.5"
            >
              <div className="font-bold">Add Menu Link</div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Label (e.g. About)"
                  value={newNavLabel}
                  onChange={(e) => setNewNavLabel(e.target.value)}
                  className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                />
                <select
                  value={newNavLocation}
                  onChange={(e) => setNewNavLocation(e.target.value as 'header' | 'footer')}
                  className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <option value="header">Header Menu</option>
                  <option value="footer">Footer Menu</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={newNavType}
                  onChange={(e) =>
                    setNewNavType(e.target.value as 'view' | 'page' | 'category' | 'url')
                  }
                  className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <option value="page">Custom Page Slug</option>
                  <option value="view">Built-in View</option>
                  <option value="category">News Category</option>
                  <option value="url">External HTTPS URL</option>
                </select>
                <input
                  type="text"
                  required
                  placeholder="Target slug, view, or https://..."
                  value={newNavTarget}
                  onChange={(e) => setNewNavTarget(e.target.value)}
                  className="p-2 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-bold rounded cursor-pointer"
              >
                Add to Navigation List
              </button>
            </form>
          </div>
        </div>
      )}

      {/* TAB 5: MEDIA LIBRARY (IMAGES & VIDEO) & BRAND PROMOTIONS */}
      {activeTab === 'media' && (
        <div className="space-y-8 text-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <form
              onSubmit={handleAddMedia}
              className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 space-y-3"
            >
              <h3 className="font-display text-lg font-bold">Media Library Upload</h3>
              <label className="flex items-center justify-center gap-2 p-3 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded hover:border-[#E1262D] cursor-pointer">
                <Upload className="w-4 h-4 text-[#E1262D]" />
                <span className="font-semibold">Upload Image from Computer</span>
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
              <div className="text-center font-mono text-[10px] text-neutral-400">OR REGISTER URL</div>
              <input
                type="text"
                required
                placeholder="Media Title"
                value={mediaTitle}
                onChange={(e) => setMediaTitle(e.target.value)}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={mediaType}
                  onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                  className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
                <select
                  value={mediaRatio}
                  onChange={(e) => setMediaRatio(e.target.value as '16:9' | '4:3' | '1:1' | '3:4')}
                  className="p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                >
                  <option value="16:9">16:9</option>
                  <option value="4:3">4:3</option>
                  <option value="1:1">1:1</option>
                  <option value="3:4">3:4</option>
                </select>
              </div>
              <input
                type="text"
                required
                placeholder="Image / MP4 Video URL"
                value={mediaUrl}
                onChange={(e) => setMediaUrl(e.target.value)}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
              <input
                type="text"
                placeholder="Accessible SEO Alt Text"
                value={mediaAlt}
                onChange={(e) => setMediaAlt(e.target.value)}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
              <button
                type="submit"
                disabled={!permissions.canManageMedia}
                className="w-full py-2 bg-[#E1262D] text-white font-bold rounded disabled:opacity-50 cursor-pointer"
              >
                Save to Media Library
              </button>
            </form>

            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {mediaAssets.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-hidden flex flex-col"
                >
                  <img src={m.url} alt={m.altText} referrerPolicy="no-referrer" className="w-full h-36 object-cover bg-neutral-900" />
                  <div className="p-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="font-bold truncate">{m.title}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">{m.altText}</div>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[10px] font-mono text-neutral-400">
                      <span>{m.mediaType || 'image'} · {m.aspectRatio}</span>
                      {permissions.canManageMedia && !m.id.startsWith('media-editorial') && (
                        <button
                          type="button"
                          onClick={() => void deleteMediaAsset(m.id)}
                          className="text-neutral-400 hover:text-[#E1262D] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Brand Promotions & Sponsorships */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
            <form
              onSubmit={handleAddCampaign}
              className="lg:col-span-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 space-y-3"
            >
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <Megaphone className="w-4 h-4 text-[#E1262D]" />
                <span>Create Brand Promotion</span>
              </div>
              <input
                type="text"
                required
                placeholder="Campaign Headline"
                value={campTitle}
                onChange={(e) => setCampTitle(e.target.value)}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
              <input
                type="text"
                required
                placeholder="Sponsor / Brand Name"
                value={campSponsor}
                onChange={(e) => setCampSponsor(e.target.value)}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              />
              <input
                type="text"
                placeholder="Destination URL or scroll:newsletter"
                value={campTargetUrl}
                onChange={(e) => setCampTargetUrl(e.target.value)}
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 font-mono"
              />
              <select
                value={campPlacement}
                onChange={(e) =>
                  setCampPlacement(
                    e.target.value as
                      | 'sidebar_featured'
                      | 'hero_ribbon'
                      | 'article_inline'
                      | 'newsletter_sponsor'
                  )
                }
                className="w-full p-2.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
              >
                <option value="sidebar_featured">Brand Promotion Slot</option>
                <option value="hero_ribbon">Hero Ribbon</option>
                <option value="article_inline">Article Inline</option>
                <option value="newsletter_sponsor">Newsletter Sponsor</option>
              </select>
              <button
                type="submit"
                disabled={!permissions.canManageAds}
                className="w-full py-2 bg-[#0D47FF] text-white font-bold rounded disabled:opacity-50 cursor-pointer"
              >
                Launch Promotion
              </button>
            </form>

            <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-neutral-50 dark:bg-neutral-950 border-b border-neutral-200 dark:border-neutral-800 font-mono uppercase text-[10px] text-neutral-500">
                  <tr>
                    <th className="p-3.5">Campaign</th>
                    <th className="p-3.5">Sponsor</th>
                    <th className="p-3.5">Placement</th>
                    <th className="p-3.5">Clicks</th>
                    <th className="p-3.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-neutral-500">
                        No brand promotion campaigns created yet.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((c) => (
                      <tr key={c.id}>
                        <td className="p-3.5 font-bold">{c.title}</td>
                        <td className="p-3.5">{c.sponsor}</td>
                        <td className="p-3.5 font-mono text-[11px]">{c.placement}</td>
                        <td className="p-3.5 font-mono font-bold tabular-nums">{c.clicks}</td>
                        <td className="p-3.5 text-right">
                          <button
                            type="button"
                            disabled={!permissions.canManageAds}
                            onClick={() =>
                              void saveCampaign({
                                ...c,
                                status: c.status === 'active' ? 'paused' : 'active',
                              })
                            }
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase cursor-pointer ${
                              c.status === 'active'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-200 dark:bg-neutral-800 text-neutral-600'
                            }`}
                          >
                            {c.status}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: GRANULAR 14-ROLE PERMISSIONS, USERS, ANALYTICS & BACKUPS */}
      {activeTab === 'governance' && (
        <div className="space-y-8 text-xs">
          {/* Live Telemetry Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4">
              <div className="text-[11px] font-mono uppercase text-neutral-400">Live Stories</div>
              <div className="font-display text-3xl font-bold mt-1">{articles.length}</div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4">
              <div className="text-[11px] font-mono uppercase text-neutral-400">Custom Pages</div>
              <div className="font-display text-3xl font-bold mt-1">{pages.length}</div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4">
              <div className="text-[11px] font-mono uppercase text-neutral-400">LCP Speed</div>
              <div className="font-display text-3xl font-bold text-emerald-600 mt-1">
                {webVitals.lcpMs !== null ? `${webVitals.lcpMs}ms` : 'Live'}
              </div>
            </div>
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-4">
              <div className="text-[11px] font-mono uppercase text-neutral-400">Audit Events</div>
              <div className="font-display text-3xl font-bold text-[#0D47FF] dark:text-sky-400 mt-1">
                {auditLogs.length}
              </div>
            </div>
          </div>

          {/* Editable Granular 14-Role Permission Matrix */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 font-display text-lg font-bold">
                <Shield className="w-4 h-4 text-[#E1262D]" />
                <span>Granular Role-Based Access Control (14 Roles)</span>
              </div>
              {permissions.canManageRoles && (
                <button
                  type="button"
                  onClick={() => void saveRolePermissions(localMatrix)}
                  className="px-4 py-1.5 bg-[#E1262D] text-white font-bold rounded cursor-pointer"
                >
                  Save Role Permissions
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-neutral-50 dark:bg-neutral-950 font-mono text-[10px] uppercase text-neutral-500 border-b border-neutral-200 dark:border-neutral-800">
                  <tr>
                    <th className="p-2.5">Role</th>
                    {PERMISSION_KEYS.map((pk) => (
                      <th key={pk.key} className="p-2 text-center">
                        {pk.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {localMatrix.map((row) => (
                    <tr key={row.roleName} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="p-2.5 font-bold whitespace-nowrap">{row.roleName}</td>
                      {PERMISSION_KEYS.map((pk) => (
                        <td key={pk.key} className="p-2 text-center">
                          <input
                            type="checkbox"
                            disabled={!permissions.canManageRoles || row.roleName === 'Super Admin'}
                            checked={Boolean(row[pk.key])}
                            onChange={() => toggleRolePermission(row.roleName, pk.key)}
                            aria-label={`${row.roleName} ${pk.label}`}
                            className="cursor-pointer disabled:opacity-60"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Registered Users & Audit Trail */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Users className="w-4 h-4 text-[#0D47FF]" />
                <span>Registered Accounts &amp; Role Assignment</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {(privateUsers.length > 0 ? privateUsers : staffProfiles).map((u) => {
                  const emailStr = 'email' in u ? u.email : u.displayName;
                  return (
                    <div
                      key={u.uid}
                      className="flex items-center justify-between gap-2 pb-2 border-b last:border-b-0 border-neutral-100 dark:border-neutral-800"
                    >
                      <div className="truncate font-semibold">{emailStr}</div>
                      <select
                        disabled={!permissions.canManageRoles}
                        value={u.role}
                        onChange={(e) => void updateUserRole(u.uid, e.target.value as RoleName)}
                        className="p-1.5 rounded bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
                {privateUsers.length === 0 && staffProfiles.length === 0 && (
                  <p className="text-neutral-500">
                    Google accounts appear here automatically after signing in so Super Admins can assign editorial roles.
                  </p>
                )}
              </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-md p-5 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Database className="w-4 h-4 text-[#E1262D]" />
                <span>Security &amp; Publishing Audit Trail</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-[11px]">
                {auditLogs.map((log) => (
                  <div key={log.id} className="pb-2 border-b last:border-b-0 border-neutral-100 dark:border-neutral-800">
                    <span className="text-[#E1262D] font-bold">{log.action}</span> ·{' '}
                    <span className="text-neutral-400">{log.actorRole}</span>
                    <div className="text-neutral-600 dark:text-neutral-300 mt-0.5">{log.details}</div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-neutral-500 font-sans">Audit events appear here automatically on every CMS change.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drag-and-Drop Page Builder Modal */}
      {builderPage && (
        <PageBuilderModal
          initialPage={builderPage.page}
          isNew={builderPage.isNew}
          onClose={() => setBuilderPage(null)}
        />
      )}
    </section>
  );
}
