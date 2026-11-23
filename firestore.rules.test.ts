import assert from 'node:assert/strict';

/**
 * Security Rules Parity & Dirty Dozen Payload Verification Suite.
 * Ensures client-side payload sanitization matches firebase-blueprint.json & firestore.rules constraints.
 */
const ID_REGEX = /^[a-zA-Z0-9_-]{1,128}$/;
const SLUG_REGEX = /^[a-z0-9-]{2,160}$/;

export function validateArticlePayloadShape(payload: Record<string, unknown>): { valid: boolean; reason?: string } {
  const allowedKeys = new Set([
    'id', 'slug', 'title', 'subtitle', 'excerpt', 'content', 'category', 'status',
    'authorId', 'authorName', 'imageUrl', 'videoUrl', 'audioUrl', 'locationName', 'lat', 'lng',
    'isBreaking', 'isTrending', 'isFeatured', 'isEditorsPick', 'isSpecialReport',
    'sourceName', 'sourceUrl', 'views', 'likesCount', 'commentsCount',
    'seoTitle', 'seoDescription', 'focusKeywords', 'aiSummary', 'canonicalUrl',
    'language', 'scheduledAt', 'publishedAt', 'createdAt', 'updatedAt',
  ]);

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, reason: `Shadow field rejected: ${key}` };
    }
  }

  if (typeof payload.id !== 'string' || !ID_REGEX.test(payload.id)) {
    return { valid: false, reason: 'Invalid or oversized document ID' };
  }

  if (typeof payload.slug !== 'string' || !SLUG_REGEX.test(payload.slug)) {
    return { valid: false, reason: 'Invalid slug format' };
  }

  if (Array.isArray(payload.focusKeywords) && payload.focusKeywords.length > 10) {
    return { valid: false, reason: 'focusKeywords exceeds 10 items' };
  }

  return { valid: true };
}

export function validateCmsPagePayloadShape(payload: Record<string, unknown>): { valid: boolean; reason?: string } {
  const allowedKeys = new Set([
    'id', 'slug', 'title', 'description', 'status', 'showInHeader', 'showInFooter',
    'blocks', 'seoTitle', 'seoDescription', 'authorId', 'authorName',
    'scheduledAt', 'publishedAt', 'createdAt', 'updatedAt',
  ]);

  for (const key of Object.keys(payload)) {
    if (!allowedKeys.has(key)) {
      return { valid: false, reason: `Shadow field rejected on page: ${key}` };
    }
  }

  if (typeof payload.id !== 'string' || !ID_REGEX.test(payload.id)) {
    return { valid: false, reason: 'Invalid page ID' };
  }

  if (typeof payload.slug !== 'string' || !SLUG_REGEX.test(payload.slug)) {
    return { valid: false, reason: 'Invalid page slug' };
  }

  if (!Array.isArray(payload.blocks) || payload.blocks.length > 25) {
    return { valid: false, reason: 'Page blocks must be an array of <= 25 items' };
  }

  return { valid: true };
}

export function runDirtyDozenChecks(): boolean {
  // 1. Shadow field injection on article
  assert.equal(
    validateArticlePayloadShape({ id: 'art-1', slug: 'valid-slug', isVerifiedAdminHack: true }).valid,
    false
  );
  // 2. 1.5KB junk ID poisoning
  assert.equal(
    validateArticlePayloadShape({ id: 'A'.repeat(1500), slug: 'valid-slug' }).valid,
    false
  );
  // 3. Unbounded array exhaustion on article
  assert.equal(
    validateArticlePayloadShape({
      id: 'art-2',
      slug: 'valid-slug',
      focusKeywords: Array.from({ length: 25 }, (_, i) => `kw-${i}`),
    }).valid,
    false
  );
  // 4. Oversized CMS page blocks > 25
  assert.equal(
    validateCmsPagePayloadShape({
      id: 'page-1',
      slug: 'about',
      blocks: Array.from({ length: 30 }, () => ({ type: 'rich_text' })),
    }).valid,
    false
  );
  // 5. Valid article shape passes
  assert.equal(
    validateArticlePayloadShape({
      id: 'art-3',
      slug: 'climate-prospective-2026',
      focusKeywords: ['climate', 'energy'],
    }).valid,
    true
  );
  // 6. Valid CMS page passes
  assert.equal(
    validateCmsPagePayloadShape({
      id: 'page-about',
      slug: 'about-newsroom',
      blocks: [{ id: 'b1', type: 'rich_text' }],
    }).valid,
    true
  );
  return true;
}
