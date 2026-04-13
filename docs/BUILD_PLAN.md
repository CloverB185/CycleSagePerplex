# ONSITEPRO — MASTER BUILD PLAN
## Aligned to Documents 0–5 | Optimized for Next.js 14 + Prisma + SQLite

Generated: 2026-04-13
Branch: claude/onsitepro-phase-0-KYw7S

---

## PHASE 1 — ROLE & SCHEMA FOUNDATIONS
_Close the structural gaps between docs and codebase_

### 1.1 Add OWNER Role
- [ ] Update `SessionUser` type in `src/lib/auth.ts` to include `'owner'`
- [ ] Add `isManagementClass()` helper (`true` for admin + owner)
- [ ] Add `requireManagementClass()` helper for override paths
- [ ] Update seed: add Owner test account (`owner@buildright.co.za / password123`)
- [ ] Update login page test accounts display
- [ ] Update NavBar role-based routing to handle `owner` role
- [ ] Add owner dashboard page at `/owner` (mirrors admin with full visibility)
- [ ] Verify: all `requireRole()` calls still work (owner gets admin-level access)

### 1.2 Extend Evidence Entity (replaces PendingEvidence)
- [ ] Add `status` field to Evidence model (`pending | uploading | uploaded | failed`)
- [ ] Add `localBlobRef` field (string, nullable — for future offline blob tracking)
- [ ] Add `uploadError` field (string, nullable — last failure reason)
- [ ] Add `uploadAttempts` field (int, default 0)
- [ ] Run migration
- [ ] Update Evidence API routes to set `status: 'uploaded'` on successful upload
- [ ] Update EvidenceUpload component to handle status display

### 1.3 Extend SyncAction Entity (replaces OfflineAction)
- [ ] Add `queueStatus` field (`queued | processing | completed | failed`)
- [ ] Add `retryAfter` field (DateTime, nullable)
- [ ] Add `source` field (`online | offline` — tracks where action originated)
- [ ] Add `siteId` field (string, nullable — for queue filtering)
- [ ] Run migration
- [ ] Update `checkSyncDedup()` and `recordSyncAction()` helpers

### 1.4 Add GuardrailsConfig Entity
- [ ] Create `GuardrailsConfig` model in schema:
  - siteId (unique per site)
  - requireEvidenceOnReportSubmit (boolean, default false)
  - requireEvidenceOnSnagClose (boolean, default true)
  - allowOverrideOnEvidenceGate (boolean, default true)
  - maxDraftAgeDays (int, nullable)
- [ ] Run migration
- [ ] Seed default config for existing sites
- [ ] Create `/api/guardrails/[siteId]` GET route
- [ ] Wire snag close API to check GuardrailsConfig instead of hardcoded rule
- [ ] Wire report submit API to check GuardrailsConfig for evidence requirement

### 1.5 Add ActionOverride Entity
- [ ] Create `ActionOverride` model in schema:
  - id, entityType, entityId, action, overrideReason
  - performedById, performedAt
  - siteId
- [ ] Run migration
- [ ] Update snag close API: if management-class user + evidence missing → allow close, create ActionOverride record + audit log
- [ ] Update report submit API: if management-class + evidence missing → allow submit with override logged

### 1.6 Run Full Migration & Verify
- [ ] `npx prisma migrate dev --name phase1-role-schema`
- [ ] `npx prisma db seed` (re-seed with owner account)
- [ ] `npm run build` — verify clean
- [ ] Commit + push

---

## PHASE 2 — CONNECTIVITY & OFFLINE FOUNDATIONS
_Doc-required offline awareness without full offline system_

### 2.1 Connectivity Detection Hook
- [ ] Create `src/hooks/useConnectivity.ts`:
  - Track `navigator.onLine`
  - Listen to `online`/`offline` window events
  - Optional: periodic ping to `/api/auth/me` (every 30s when online)
  - Export `{ isOnline, isOffline, lastCheckedAt }`
- [ ] Wire into layout/provider so all pages can access

### 2.2 Connection Status Banner
- [ ] Create `src/components/ConnectionBanner.tsx`:
  - Shows "You are offline — changes will queue" when offline
  - Shows "Back online" briefly when reconnecting
  - Uses `safety-amber` for offline, `safety-green` for reconnect
  - Fixed position, non-blocking
- [ ] Add to root layout

### 2.3 Offline Workspace Screen
- [ ] Create `/foreman/workspace/page.tsx` (canonical: Offline Workspace):
  - Connection status (online/offline indicator)
  - Quick-launch buttons: New Report, New Snag, Plan Tomorrow
  - Pending queue count (from SyncAction where queueStatus = 'queued')
  - Failed queue count
  - Recent drafts list
  - Recent open snags list
- [ ] Add to NavBar as tab option for foreman

### 2.4 Sync Queue Screen
- [ ] Create `/foreman/sync-queue/page.tsx` (canonical: Sync Queue):
  - List SyncAction items with status badges (QUEUED/PROCESSING/FAILED/COMPLETED)
  - Show last error for failed items
  - Retry button per failed item
  - "Sync All" button
  - Empty state when queue is clear
- [ ] Add API route `/api/sync-queue` GET (list user's queue items)
- [ ] Add API route `/api/sync-queue/[id]/retry` POST (reset failed → queued)

### 2.5 Verify & Ship
- [ ] `npm run build` — verify clean
- [ ] Commit + push

---

## PHASE 3 — AUDIT & GOVERNANCE HARDENING
_Close remaining doc compliance gaps_

### 3.1 Audit Action Coverage
- [ ] Add audit actions: `close`, `override`, `reassign`, `membership_add`, `membership_remove`, `role_change`
- [ ] Verify ALL API write routes log audit events:
  - [ ] POST /api/daily-reports (create)
  - [ ] PATCH /api/daily-reports/[id] (update + submit)
  - [ ] POST /api/daily-reports/[id]/annotations (annotate)
  - [ ] POST /api/snags (create)
  - [ ] PATCH /api/snags/[id] (update + close + reassign)
  - [ ] POST /api/snags/[id]/comments (comment)
  - [ ] POST /api/tomorrow-plans (create)
  - [ ] PATCH /api/tomorrow-plans/[id] (update)
  - [ ] POST /api/evidence (upload)
  - [ ] POST /api/auth/login (login/login_failed)
  - [ ] POST /api/auth/logout (logout)

### 3.2 Management-Class Override Flows
- [ ] Snag close without evidence: management-class can override → ActionOverride created → audit logged → snag closed with `overrideReason`
- [ ] Report submit without evidence: management-class can override → ActionOverride created → audit logged → report submitted with warning suppressed
- [ ] UI: show override confirmation modal for management-class users when evidence gate triggers

### 3.3 Admin Dashboard Improvements
- [ ] Add GuardrailsConfig editor per site (toggle evidence requirements)
- [ ] Add ActionOverride log view (who overrode what, when, why)
- [ ] Add user role change to include `owner` option
- [ ] Improve audit log display with action type filters

### 3.4 Verify & Ship
- [ ] `npm run build` — verify clean
- [ ] Commit + push

---

## PHASE 4 — UI/UX DOC COMPLIANCE
_Align screens to Doc 3 wireframes_

### 4.1 Site Selector Reliability
- [ ] Audit current site selector in SiteProvider/NavBar
- [ ] Ensure native `<select>` fallback if custom selector fails (Doc 3 §6.1)
- [ ] Test selector opens reliably on mobile
- [ ] Preserve selected state across navigation

### 4.2 Form Field Compliance
- [ ] Verify all forms have labels above fields (Doc 3 §3)
- [ ] Verify one primary action per section
- [ ] Verify visible save/submit state distinction (draft vs submitted)
- [ ] Verify no hidden dependency on hover actions
- [ ] Add severity field to snag form if missing (Doc 3 §5.3)

### 4.3 Status Banners
- [ ] Test mode banner when on test site (Doc 3 §6.3)
- [ ] Rate-limit/cooldown banner (Doc 3 §6.3)
- [ ] Offline banner (from Phase 2)
- [ ] Guardrail failure banner when action blocked

### 4.4 Evidence List Improvements
- [ ] Show pending/offline indicator on evidence items
- [ ] Show uploaded state confirmation
- [ ] Remove action only allowed before finalization

### 4.5 Verify & Ship
- [ ] `npm run build` — verify clean
- [ ] Commit + push

---

## PHASE 5 — TESTING & RUNTIME HARDENING
_Doc 0 Rule 6: nothing done without proof_

### 5.1 Core Test Suite
- [ ] Set up test framework (Jest or Vitest)
- [ ] Test: login success + failure + audit logging
- [ ] Test: daily report create → update → submit → immutable
- [ ] Test: snag create → evidence attach → close → evidence gate
- [ ] Test: snag close WITHOUT evidence → blocked (foreman) / override (management-class)
- [ ] Test: tomorrow plan create → update → date-lock
- [ ] Test: PM annotation on submitted report
- [ ] Test: PM snag reassignment
- [ ] Test: syncActionId idempotency (duplicate blocked)
- [ ] Test: role enforcement (foreman can't access admin routes)
- [ ] Test: HMAC session token creation + verification + tamper detection

### 5.2 Runtime Verification
- [ ] Manual test on actual phone browser (pull code, run dev server on LAN)
- [ ] Verify all pages load correctly
- [ ] Verify touch targets are usable
- [ ] Verify site selector works on mobile
- [ ] Verify forms submit correctly

### 5.3 Verify & Ship
- [ ] All tests passing
- [ ] `npm run build` — clean
- [ ] Commit + push

---

## PHASE 6 — PRODUCTION READINESS (FUTURE)
_Not in current scope — tracked for planning_

### 6.1 Database Migration
- [ ] Switch from SQLite to PostgreSQL (Neon/Supabase free tier)
- [ ] Update prisma schema provider
- [ ] Run migrations on cloud DB
- [ ] Test concurrent access

### 6.2 File Storage
- [ ] Set up Cloudinary or S3 for evidence photos
- [ ] Update evidence upload API to store files externally
- [ ] Update evidence display to load from CDN

### 6.3 PWA / Service Worker
- [ ] Add next-pwa or custom service worker
- [ ] Cache static assets
- [ ] Enable background sync for queued actions
- [ ] Make app installable on mobile home screen

### 6.4 Full Offline Queue
- [ ] IndexedDB local storage for offline actions
- [ ] Background sync processor
- [ ] Evidence blob capture + upload pipeline
- [ ] PendingEvidence state machine (pending → uploading → uploaded)
- [ ] Conflict resolution strategy

### 6.5 Deploy
- [ ] Deploy to Vercel
- [ ] Set up environment variables (SESSION_SECRET, DATABASE_URL)
- [ ] Custom domain
- [ ] HTTPS enforcement

---

## TRACKING RULES

1. Each checkbox = one atomic task
2. Complete in order within each phase
3. No skipping phases — each builds on the previous
4. After each phase: build, verify, commit, push
5. If a task reveals a new blocker → add it, don't skip it
6. Nothing counts as done without proof (Doc 0 Rule 6)

---

## CURRENT STATUS

| Phase | Status | Items |
|-------|--------|-------|
| Phase 1 — Role & Schema | NOT STARTED | 28 tasks |
| Phase 2 — Connectivity & Offline | NOT STARTED | 18 tasks |
| Phase 3 — Audit & Governance | NOT STARTED | 14 tasks |
| Phase 4 — UI/UX Compliance | NOT STARTED | 14 tasks |
| Phase 5 — Testing & Hardening | NOT STARTED | 14 tasks |
| Phase 6 — Production (future) | NOT IN SCOPE | 14 tasks |
| **TOTAL (Phases 1–5)** | | **88 tasks** |

---

## DOC COMPLIANCE AFTER FULL PLAN

| Doc Requirement | Current | After Phase 5 |
|----------------|---------|---------------|
| 4 canonical roles | 3/4 | 4/4 |
| Entity model | 14/17 entities | 16/17 (OfflineAction merged into SyncAction) |
| Evidence state machine | basic | full status lifecycle |
| Offline awareness | none | connectivity + banners + workspace + queue screen |
| Management-class governance | none | isManagementClass + override flows |
| GuardrailsConfig | hardcoded | per-site configurable |
| ActionOverride audit | none | full override logging |
| Canonical screens | 7/9 | 9/9 |
| Audit coverage | ~70% | ~95% |
| Test coverage | 0% | core flows covered |
| Offline queue processing | none | schema ready, full processing in Phase 6 |
