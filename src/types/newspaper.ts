export type RoleName =
  | 'Super Admin'
  | 'Admin'
  | 'Editor-in-Chief'
  | 'Editor'
  | 'Journalist'
  | 'Reporter'
  | 'Writer'
  | 'Proofreader'
  | 'SEO Manager'
  | 'Media Manager'
  | 'Advertisement Manager'
  | 'Moderator'
  | 'Registered User'
  | 'Guest';

export const ALL_ROLES: RoleName[] = [
  'Super Admin',
  'Admin',
  'Editor-in-Chief',
  'Editor',
  'Journalist',
  'Reporter',
  'Writer',
  'Proofreader',
  'SEO Manager',
  'Media Manager',
  'Advertisement Manager',
  'Moderator',
  'Registered User',
  'Guest',
];

export type ArticleStatus =
  | 'draft'
  | 'in_review'
  | 'proofread'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'archived';

export type CategoryName =
  | 'Bangladesh National'
  | 'Politics'
  | 'Economy'
  | 'Business'
  | 'Technology'
  | 'Sports'
  | 'Entertainment'
  | 'Education'
  | 'International';

export type LanguageCode = 'en' | 'es' | 'fr' | 'de' | 'ja';

export interface RolePermissionSet {
  canPublish: boolean;
  canEditAll: boolean;
  canWriteDraft: boolean;
  canProofread: boolean;
  canManageSeo: boolean;
  canManageMedia: boolean;
  canManageAds: boolean;
  canModerateComments: boolean;
  canManagePages: boolean;
  canCustomizeSite: boolean;
  canManageRoles: boolean;
  canViewAuditLogs: boolean;
  canConfigureSettings: boolean;
  canComment: boolean;
  canBookmark: boolean;
  canAccessNewsroom: boolean;
}

export const ROLE_PERMISSIONS: Record<RoleName, RolePermissionSet> = {
  'Super Admin': {
    canPublish: true,
    canEditAll: true,
    canWriteDraft: true,
    canProofread: true,
    canManageSeo: true,
    canManageMedia: true,
    canManageAds: true,
    canModerateComments: true,
    canManagePages: true,
    canCustomizeSite: true,
    canManageRoles: true,
    canViewAuditLogs: true,
    canConfigureSettings: true,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  Admin: {
    canPublish: true,
    canEditAll: true,
    canWriteDraft: true,
    canProofread: true,
    canManageSeo: true,
    canManageMedia: true,
    canManageAds: true,
    canModerateComments: true,
    canManagePages: true,
    canCustomizeSite: true,
    canManageRoles: true,
    canViewAuditLogs: true,
    canConfigureSettings: true,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  'Editor-in-Chief': {
    canPublish: true,
    canEditAll: true,
    canWriteDraft: true,
    canProofread: true,
    canManageSeo: true,
    canManageMedia: true,
    canManageAds: false,
    canModerateComments: true,
    canManagePages: true,
    canCustomizeSite: true,
    canManageRoles: false,
    canViewAuditLogs: true,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  Editor: {
    canPublish: true,
    canEditAll: true,
    canWriteDraft: true,
    canProofread: true,
    canManageSeo: false,
    canManageMedia: true,
    canManageAds: false,
    canModerateComments: true,
    canManagePages: true,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  Journalist: {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: true,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  Reporter: {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: true,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  Writer: {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: true,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  Proofreader: {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: false,
    canProofread: true,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  'SEO Manager': {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: false,
    canProofread: false,
    canManageSeo: true,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  'Media Manager': {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: false,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: true,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  'Advertisement Manager': {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: false,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: true,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  Moderator: {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: false,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: true,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: true,
  },
  'Registered User': {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: false,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: true,
    canBookmark: true,
    canAccessNewsroom: false,
  },
  Guest: {
    canPublish: false,
    canEditAll: false,
    canWriteDraft: false,
    canProofread: false,
    canManageSeo: false,
    canManageMedia: false,
    canManageAds: false,
    canModerateComments: false,
    canManagePages: false,
    canCustomizeSite: false,
    canManageRoles: false,
    canViewAuditLogs: false,
    canConfigureSettings: false,
    canComment: false,
    canBookmark: false,
    canAccessNewsroom: false,
  },
};

export interface Article {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  excerpt: string;
  content: string;
  category: CategoryName;
  status: ArticleStatus;
  authorId: string;
  authorName: string;
  imageUrl: string;
  videoUrl?: string;
  audioUrl?: string;
  locationName?: string;
  lat?: number;
  lng?: number;
  isBreaking?: boolean;
  isTrending?: boolean;
  isFeatured?: boolean;
  isEditorsPick?: boolean;
  isSpecialReport?: boolean;
  sourceName?: string;
  sourceUrl?: string;
  views: number;
  likesCount: number;
  commentsCount: number;
  seoTitle?: string;
  seoDescription?: string;
  focusKeywords?: string[];
  aiSummary?: string;
  canonicalUrl?: string;
  language?: LanguageCode;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
  displayDate?: string;
  readMinutes?: number;
}

export interface ArticleRevision {
  id: string;
  articleId: string;
  title: string;
  excerpt?: string;
  content: string;
  status: ArticleStatus;
  editorId: string;
  editorName: string;
  changeSummary?: string;
  createdAt?: unknown;
}

export type PageBlockType =
  | 'hero_banner'
  | 'rich_text'
  | 'media_spotlight'
  | 'video_embed'
  | 'news_feed_grid'
  | 'cta_promotion'
  | 'spacer_divider';

export interface PageBlock {
  id: string;
  type: PageBlockType;
  heading?: string;
  subheading?: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  buttonText?: string;
  buttonUrl?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  categoryFilter?: CategoryName | 'All';
  itemLimit?: number;
  align?: 'left' | 'center';
}

export interface CmsPage {
  id: string;
  slug: string;
  title: string;
  description?: string;
  status: 'draft' | 'scheduled' | 'published' | 'archived';
  showInHeader?: boolean;
  showInFooter?: boolean;
  blocks: PageBlock[];
  seoTitle?: string;
  seoDescription?: string;
  authorId: string;
  authorName: string;
  scheduledAt?: string;
  publishedAt?: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type HomepageSectionType =
  | 'hero_slider_trending'
  | 'trending_now'
  | 'live_news'
  | 'breaking_news'
  | 'latest_news'
  | 'video_news'
  | 'audio_news'
  | 'brand_promotions'
  | 'editors_picks'
  | 'most_read'
  | 'categories_bento'
  | 'special_reports'
  | 'crawler_endpoints'
  | 'custom_banner';

export interface HomepageSection {
  id: string;
  sectionType: HomepageSectionType;
  title: string;
  subtitle?: string;
  visible: boolean;
  orderIndex: number;
  itemCount?: number;
  categoryFilter?: string;
  layoutVariant?: 'default' | 'grid' | 'list' | 'bento' | 'spotlight';
  accentColor?: string;
  promoHeadline?: string;
  promoBody?: string;
  promoImageUrl?: string;
  promoVideoUrl?: string;
  promoButtonText?: string;
  promoButtonUrl?: string;
  autoPlayMs?: number;
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface NavigationItem {
  id: string;
  label: string;
  location: 'header' | 'footer';
  targetType: 'view' | 'page' | 'category' | 'url';
  targetValue: string;
  orderIndex: number;
  visible: boolean;
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface RolePermissionConfig extends RolePermissionSet {
  id: string;
  roleName: RoleName;
  updatedBy?: string;
  updatedAt?: unknown;
}

export interface CommentItem {
  id: string;
  articleId: string;
  authorId: string;
  authorName: string;
  content: string;
  status: 'approved' | 'pending' | 'flagged' | 'removed';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface BookmarkItem {
  articleId: string;
  title: string;
  category: string;
  imageUrl?: string;
  savedAt?: unknown;
}

export interface MediaAsset {
  id: string;
  url: string;
  mediaType?: 'image' | 'video';
  title: string;
  altText: string;
  aspectRatio: '16:9' | '4:3' | '1:1' | '3:4';
  uploadedBy: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AdCampaign {
  id: string;
  title: string;
  sponsor: string;
  placement: 'sidebar_featured' | 'hero_ribbon' | 'article_inline' | 'newsletter_sponsor';
  targetUrl: string;
  imageUrl?: string;
  buttonText?: string;
  status: 'active' | 'paused' | 'ended';
  impressions: number;
  clicks: number;
  ownerId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: string;
  createdAt?: unknown;
}

export interface SiteSettings {
  siteName: string;
  tagline?: string;
  brandMarkText?: string;
  headerCtaLabel?: string;
  headerCtaUrl?: string;
  footerCopyright?: string;
  footerBio?: string;
  primaryColor?: string;
  secondaryColor?: string;
  headerBgColor?: string;
  footerBgColor?: string;
  displayFont?: string;
  bodyFont?: string;
  showBreakingBar?: boolean;
  defaultLanguage: LanguageCode;
  enableComments: boolean;
  enableAiGeo: boolean;
  updatedBy: string;
  updatedAt?: unknown;
}

export interface RssFeedSource {
  id: string;
  name: string;
  url: string;
  category: CategoryName;
  enabled: boolean;
}

export interface UserPublicProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  role: RoleName;
  title?: string;
  bio?: string;
  updatedAt?: unknown;
}

export interface BureauLocation {
  id: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  deskFocus: string;
  weatherTempC?: string;
  weatherTempF?: string;
  timezone: string;
}

export interface WebVitalsSnapshot {
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
}

export type ActiveView = 'frontpage' | 'map' | 'globe' | 'seo' | 'newsroom' | 'page' | 'admin_login';
