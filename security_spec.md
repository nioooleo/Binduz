# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Strict PII Isolation**: Email addresses live solely in `/users_private/{userId}` and `/subscribers/{subscriberId}`. Non-owners (except verified Super Admin / Admin) cannot read `/users_private` or `/subscribers`.
2. **No Self-Assigned Privileged Roles**: A newly registered user creating `/users_public/{uid}` or `/users_private/{uid}` can only set `role: "Registered User"`, unless the caller is the verified bootstrapped Super Admin (`nioooleo@gmail.com` with `email_verified == true`).
3. **Immutable Audit & Creation Timestamps**: `createdAt` and `authorId` / `ownerId` cannot be altered after creation. All `createdAt` / `updatedAt` fields must equal `request.time`.
4. **Published Article Visibility Gate**: Unauthenticated guests and standard readers can only read or list articles where `status == "published"`. Draft, review, proofread, scheduled, and archived articles are isolated to their author or verified editorial/admin staff.
5. **Bounded Payloads & IDs**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), all strings enforce explicit `.size()` bounds, and all arrays (`focusKeywords`, `topics`) enforce `<= 10` elements.
6. **Master Gate on Subcollections**: Comments under `/articles/{articleId}/comments/{commentId}` verify the parent article exists via `exists()` / `get()` and disallow comments on unpublished/archived articles.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Role Self-Escalation on Signup**: `POST /users_private/attacker1` with `{ role: "Super Admin", email: "a@x.com" }` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on Article**: `POST /articles/art1` with `{ ..., isVerifiedAdminHack: true }` -> `PERMISSION_DENIED` (`hasOnly` blocks unknown fields).
3. **Spoofed Unverified Admin Email**: Auth token with `email: "nioooleo@gmail.com", email_verified: false` -> `PERMISSION_DENIED`.
4. **Cross-User PII Scraping**: Authenticated reader requests `GET /users_private/otherUser` -> `PERMISSION_DENIED`.
5. **Client-Side Timestamp Forgery**: `POST /articles/art2` with `{ createdAt: "2020-01-01T00:00:00Z" }` instead of `request.time` -> `PERMISSION_DENIED`.
6. **Immutable Author Swap on Update**: `PATCH /articles/art1` attempting `{ authorId: "victimUid" }` -> `PERMISSION_DENIED`.
7. **List Query Scraping Drafts**: Unauthenticated or non-author `LIST /articles` without `where('status', '==', 'published')` -> `PERMISSION_DENIED`.
8. **1.5KB Junk ID Poisoning**: `PUT /articles/AAAA...(1500 chars)` -> `PERMISSION_DENIED` (`isValidId` fails).
9. **Unbounded Array Exhaustion**: `POST /articles/art3` with `focusKeywords` array of 25 strings -> `PERMISSION_DENIED` (`size() <= 10`).
10. **Comment on Draft Article**: `POST /articles/draft1/comments/c1` where parent article `status == "draft"` -> `PERMISSION_DENIED`.
11. **Non-Author Tampering With Audit Logs**: Standard user attempts `DELETE /audit_logs/log1` or `UPDATE /audit_logs/log1` -> `PERMISSION_DENIED` (audit logs are append-only/immutable).
12. **Bookmark Cross-Tenant Write**: User A attempts `PUT /users_private/userB/bookmarks/art1` -> `PERMISSION_DENIED`.
