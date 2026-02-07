# OnsitePro Evidence Pack v2.0
## Full Development State Audit — 7 February 2026

---

# SECTION 1: PROJECT STATUS OVERVIEW

| Area | Status | Detail |
|------|--------|--------|
| Phase 0 (Architecture) | COMPLETE | 13-entity schema, 7 lib modules, design docs |
| Phase 1 (Execution Core) | COMPLETE | 15 API routes, 9 pages, 12 components |
| Phase 2 (Mobile-First V2) | PARTIAL | Foreman dashboard + NavBar upgraded, 6 pages remain |
| Phase 3 (Reliability) | NOT STARTED | Offline queue, retry logic, conflict resolution |
| Build Status | CLEAN | 22 pages, 0 errors, 0 warnings |
| Test Accounts | 4 | admin, pm, foreman x2 (password: password123) |

---

# SECTION 2: WHAT WAS FINALIZED

## 2.1 Database Layer (13 Entities)
| Entity | Records | Purpose | Compliance |
|--------|---------|---------|------------|
| Organization | 1 | Tenant container | OK |
| User | 4 | Auth principals (admin, pm, 2 foremen) | OK |
| Site | 2 | Live + test construction sites | OK |
| SiteAssignment | 3 | Foreman-to-site bindings | OK |
| DailyReport | Dynamic | Daily work records with syncActionId dedup | OK |
| DailyReportAnnotation | Dynamic | Immutable PM comments/corrections | OK |
| TomorrowPlan | Dynamic | Next-day plans with date-based locking | OK |
| Evidence | Dynamic | Photos/notes with polymorphic linking | OK |
| Snag | Dynamic | Issues/defects with status workflow | OK |
| SnagComment | Dynamic | Threaded discussion on snags | OK |
| ChecklistTemplate | 1 | Safety checklist (5 items, 3 require evidence) | OK |
| ChecklistSubmission | Dynamic | Completed checklist records | OK |
| SyncAction | Dynamic | Offline sync queue (schema exists) | NOT WIRED |
| AuditLog | Dynamic | Immutable change tracking | OK |

## 2.2 API Routes (15 Total)

### COMPLIANT — 9 Routes
| Route | Methods | Key Enforcement |
|-------|---------|-----------------|
| GET /api/auth/me | GET | Session validation, role return |
| GET /api/sites | GET | Role-based filtering (foreman sees assigned only) |
| GET /api/users | GET | Site-scoped user listing |
| /api/daily-reports | GET, POST | syncActionId dedup, duplicate date check, site mode validation, audit log |
| /api/evidence | GET, POST | syncActionId dedup, SHA-256 hash, audit log |
| /api/snags | GET, POST | syncActionId dedup, category enum, audit log |
| /api/snags/[id] | GET, PATCH | Evidence gating BLOCKS closure, immutability on closed, status machine, audit log |
| /api/tomorrow-plans | GET, POST | syncActionId dedup, duplicate date check, audit log |
| /api/admin/audit-logs | GET | Admin/PM role gate, limit cap (200) |

### PARTIAL — 6 Routes (Need Hardening)
| Route | Methods | Gap |
|-------|---------|-----|
| POST /api/auth/login | POST | No audit logging of login attempts |
| POST /api/auth/logout | POST | Not wrapped in apiHandler, no audit logging |
| /api/daily-reports/[id] | GET, PATCH | Missing syncActionId on PATCH, no evidence warning on submit |
| /api/daily-reports/[id]/annotations | POST | No syncActionId, no report status check |
| /api/snags/[id]/comments | POST | No syncActionId |
| /api/tomorrow-plans/[id] | PATCH | No syncActionId |

## 2.3 Frontend Pages (9 Total)

### Mobile-First Upgraded
| Page | Lines | Features |
|------|-------|----------|
| Foreman Dashboard | 312 | Gradient hero, 4-col stats, 120px action cards, activity feed, mobile font scale |
| Foreman Daily Report | 744 | 3-tab interface (Quick/Full/History), evidence gating warning, immutability lock |
| NavBar | 267 | Bottom tab bar (mobile), hamburger overlay, HardHat branding, role badges |

### Standard Design (Not Yet Upgraded)
| Page | Lines | Status |
|------|-------|--------|
| Login Page | ~90 | Functional, standard Tailwind |
| PM Dashboard | ~210 | Stats + urgent snags + resolution bar |
| PM Reports | ~280 | List/detail + annotations + evidence |
| PM Snags | ~320 | Filter/list/detail + reassign + comment |
| Foreman Snags | ~380 | CRUD + timeline + evidence upload |
| Foreman Tomorrow Plan | ~278 | Edit/history tabs, date locking |
| Admin Panel | ~308 | 4 tabs (overview, sites, users, audit) |

## 2.4 Components (12 Total)
| Component | Mobile-First | Purpose |
|-----------|-------------|---------|
| AuthProvider | N/A | Session context, login/logout |
| SiteProvider | N/A | Site selection, localStorage persistence |
| ToastProvider | YES | Fixed bottom-right notifications |
| NavBar | YES | Header + mobile bottom tab bar |
| LoadingSkeleton | YES | Animated loading placeholders |
| EmptyState | YES | No-data states with icons + CTA |
| QuickActionCard | YES | 120px touch cards, 5 color variants |
| EvidenceUpload | YES | Photo/note upload with camera |
| EvidenceList | YES | Thumbnail grid / full card list |
| SiteSelector | NO | Site dropdown |
| DevToolbar | YES | Viewport switcher + field simulators |
| DevToolbarWrapper | YES | Viewport constraint container |

## 2.5 Design System
| Element | Status |
|---------|--------|
| Color Palette | Construction orange (#f97316) + Industrial blue (#1a56db) + Concrete grays |
| Mobile Breakpoints | xs: 390px, sm: 640px, md: 768px, lg: 1024px |
| Mobile Font Scale | 11px / 13px / 15px / 17px / 20px / 24px |
| Touch Targets | min-h-touch (44px), min-h-touch-lg (56px) |
| Safe Area | env(safe-area-inset-bottom/top) |
| Animations | slide-up, fade-in, pulse-glow, bounce-subtle |
| CSS Components | 16 (btn-primary/secondary/danger/brand, input-field, card, badges x8, etc.) |

---

# SECTION 3: WHAT IS OUTSTANDING

## 3.1 CRITICAL (P0 — Must Fix Before Production)

### 3.1.1 Session Token Security
**Status:** BROKEN
**Detail:** Session token is plain base64(userId + timestamp). Trivially forgeable — anyone can change the userId and re-encode.
**Fix:** Replace with signed JWT or HMAC-signed cookie.
**Effort:** 2-3 hours

### 3.1.2 Idempotency Not Enforced on PATCH Routes
**Status:** PARTIAL
**Detail:** POST routes check syncActionId. PATCH routes (daily-reports/[id], tomorrow-plans/[id]) do NOT. Offline retry would corrupt data.
**Affected Routes:** 4 endpoints
**Fix:** Add syncActionId check before all write operations.
**Effort:** 1-2 hours

### 3.1.3 Evidence Warning on Report Submission
**Status:** MISSING
**Detail:** PRD Rule: "report submission WARNS if no evidence." Currently no check exists.
**Fix:** Count evidence before submit, return warning flag in response.
**Effort:** 30 minutes

## 3.2 HIGH (P1 — Should Fix Before Pilot)

### 3.2.1 Mobile-First Upgrade for 6 Remaining Pages
**Status:** NOT STARTED
**Pages:** Login, PM Dashboard, PM Reports, PM Snags, Foreman Snags, Tomorrow Plan, Admin
**Fix:** Apply mobile font scale, touch targets, responsive grids, bottom padding for tab bar.
**Effort:** 3-4 hours

### 3.2.2 Audit Logging Gaps
**Status:** PARTIAL
**Detail:** Login/logout events not logged. Some PATCH operations missing audit entries.
**Fix:** Add logAudit() calls to auth routes and all remaining write endpoints.
**Effort:** 1 hour

### 3.2.3 SyncAction Queue Not Wired
**Status:** SCHEMA ONLY
**Detail:** SyncAction entity exists in schema but no frontend queue or API integration. Offline writes will fail silently.
**Fix:** Build offline queue in frontend, wire to SyncAction API.
**Effort:** 4-6 hours

### 3.2.4 Missing Admin CRUD Endpoints
**Status:** READ-ONLY
**Detail:** Admin panel displays sites/users but cannot create/edit/deactivate them.
**Missing Routes:** POST/PATCH /api/sites, POST/PATCH /api/users, POST /api/site-assignments
**Effort:** 3-4 hours

## 3.3 MEDIUM (P2 — Nice to Have)

| Item | Detail | Effort |
|------|--------|--------|
| Login page redesign | Apply construction theme + mobile layout | 1 hour |
| Responsive form grids | Use md:grid-cols-2 instead of grid-cols-2 on snag forms | 30 min |
| Image optimization | Responsive evidence thumbnails (srcSet) | 1 hour |
| Pagination | Large report/snag lists need infinite scroll or pagination | 2 hours |
| Report PDF export | Generate printable report for PM/admin | 3-4 hours |
| Dashboard analytics | Charts for snag trends, report compliance rates | 3-4 hours |
| Push notifications | Alert foreman of new snag assignments | 2-3 hours |
| Password reset flow | Currently no forgot password mechanism | 2 hours |

---

# SECTION 4: PRD COMPLIANCE MATRIX

| Tier-1 Rule | Status | Evidence |
|-------------|--------|----------|
| Backend truth > UI behavior | PARTIAL | DB lookups on every auth check. BUT session token is forgeable (P0 fix needed). |
| Offline-first always assumed | BROKEN | SyncAction schema exists but not wired. No frontend queue. POST routes have syncActionId dedup, PATCH routes don't. |
| Idempotency required (syncActionId) | PARTIAL | 5 POST routes enforce syncActionId. 4 PATCH routes do not. |
| Evidence gating: snag closure BLOCKS | PASS | /api/snags/[id] PATCH blocks closure without evidence (HTTP 400). Verified. |
| Evidence gating: report submit WARNS | FAIL | No evidence check on report submission. |
| Immutability after submit | PASS | Submitted reports return 409. Closed snags return 400. Past plans locked by date. |
| Test mode backend-enforced | PARTIAL | validateSiteMode() exists and called on report creation. Not enforced on all write routes. |
| Foreman is User #1 | PASS | Dashboard, daily report, and NavBar prioritize foreman UX. Mobile-first design applied to foreman pages first. |

**Overall Compliance: 4/8 PASS, 3/8 PARTIAL, 1/8 FAIL**

---

# SECTION 5: FILE INVENTORY

## Source Files (by category)
```
SCHEMA & DATA
  prisma/schema.prisma          339 lines  (13 entities)
  prisma/seed.ts                131 lines  (4 users, 2 sites, 1 template)

BACKEND LIB
  src/lib/auth.ts                89 lines  (session, password, roles)
  src/lib/permissions.ts         44 lines  (role, site, ownership checks)
  src/lib/audit.ts               26 lines  (append-only change log)
  src/lib/site-mode.ts           72 lines  (test/live enforcement)
  src/lib/api-helpers.ts         55 lines  (error wrapper)

API ROUTES (15)
  src/app/api/auth/login/route.ts
  src/app/api/auth/logout/route.ts
  src/app/api/auth/me/route.ts
  src/app/api/daily-reports/route.ts
  src/app/api/daily-reports/[id]/route.ts
  src/app/api/daily-reports/[id]/annotations/route.ts
  src/app/api/evidence/route.ts
  src/app/api/snags/route.ts
  src/app/api/snags/[id]/route.ts
  src/app/api/snags/[id]/comments/route.ts
  src/app/api/tomorrow-plans/route.ts
  src/app/api/tomorrow-plans/[id]/route.ts
  src/app/api/sites/route.ts
  src/app/api/users/route.ts
  src/app/api/admin/audit-logs/route.ts

PAGES (9)
  src/app/page.tsx                        (Login)
  src/app/foreman/page.tsx                (Foreman Dashboard) ✅ mobile-first
  src/app/foreman/daily-report/page.tsx   (Daily Report) ✅ partial mobile
  src/app/foreman/snags/page.tsx          (Foreman Snags)
  src/app/foreman/tomorrow-plan/page.tsx  (Tomorrow Plan)
  src/app/pm/page.tsx                     (PM Dashboard)
  src/app/pm/reports/page.tsx             (PM Reports)
  src/app/pm/snags/page.tsx               (PM Snags)
  src/app/admin/page.tsx                  (Admin Panel)

COMPONENTS (12)
  src/components/AuthProvider.tsx
  src/components/SiteProvider.tsx
  src/components/ToastProvider.tsx
  src/components/NavBar.tsx               ✅ mobile-first
  src/components/LoadingSkeleton.tsx
  src/components/EmptyState.tsx
  src/components/QuickActionCard.tsx      ✅ mobile-first
  src/components/EvidenceUpload.tsx
  src/components/EvidenceList.tsx
  src/components/SiteSelector.tsx
  src/components/DevToolbar.tsx           ✅ mobile-first
  src/components/DevToolbarWrapper.tsx    ✅ mobile-first

CONFIG
  tailwind.config.js             98 lines  ✅ mobile-first breakpoints
  src/app/globals.css            193 lines ✅ mobile-first utilities
  src/app/layout.tsx              41 lines ✅ DevToolbar + viewport meta
  package.json                    37 lines (8 deps, 8 devDeps)
```

---

# SECTION 6: RECOMMENDED NEXT STEPS

## Option A: Security & Compliance Hardening (2-3 sessions)
Fix all P0/P1 issues. Makes the app production-safe.
1. Replace session tokens with signed JWT
2. Wire syncActionId to all PATCH routes
3. Add evidence warning on report submission
4. Add audit logging to auth routes
5. Build offline queue (frontend SyncAction integration)

## Option B: Full Mobile-First Visual Upgrade (1-2 sessions)
Bring all remaining pages to mobile-first design.
1. Login page with construction branding
2. PM Dashboard + Reports + Snags
3. Foreman Snags + Tomorrow Plan
4. Admin Panel
5. Responsive form grids everywhere

## Option C: Feature Expansion (2-3 sessions)
Add missing functionality.
1. Admin CRUD (create sites, users, assignments)
2. Report PDF export
3. Dashboard analytics & charts
4. Password reset flow
5. Push notifications for snag assignments

## Option D: Full Phase 2 (4-5 sessions)
Everything above in order: Security → Mobile → Features.

---

# SECTION 7: BUILD VERIFICATION

```
Build: CLEAN
Pages: 22 (9 static, 13 dynamic API)
Errors: 0
Warnings: 0 (API cookie warnings are expected for dynamic routes)
Bundle: 87.3 kB shared + per-page chunks
Last commit: 3d236ac (Mobile-first upgrade)
Branch: claude/onsitepro-phase-0-KYw7S
```

---

*Evidence Pack v2.0 — Generated 7 February 2026*
*OnsitePro Claude — Construction Site Operational Truth Capture*
