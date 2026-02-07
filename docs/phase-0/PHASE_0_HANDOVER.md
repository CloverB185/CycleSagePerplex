# Phase 0 Handover — OnsitePro Foundation & Architecture

**Phase:** 0 — Foundation & Architecture (Pre-Build)
**Status:** COMPLETE
**Date:** 2026-02-07
**PRD Version:** v1.0

---

## 1. What Was Built

Phase 0 delivers the complete architectural foundation for OnsitePro. No code was generated — this phase produces design specifications that Phase 1 will implement against.

### Deliverables

| Deliverable | File | Status |
|---|---|---|
| Entity Schema Design | `schemas/entity-schemas.json` | COMPLETE |
| Permission Model | `docs/architecture/permission-model.json` | COMPLETE |
| Offline Architecture Spec | `docs/architecture/offline-architecture.json` | COMPLETE |
| Evidence Workflow Design | `docs/architecture/evidence-workflow.json` | COMPLETE |
| Test Mode Enforcement Design | `docs/architecture/test-mode-enforcement.json` | COMPLETE |
| Phase 0 Handover | `docs/phase-0/PHASE_0_HANDOVER.md` | COMPLETE |

---

## 2. Architecture Decisions Summary

### 2.1 Entity Schema (13 Entities)

| Entity | Immutability | Notes |
|---|---|---|
| Organization | Partial | Name mutable, identity immutable |
| User | Partial | Profile mutable, identity immutable |
| Site | Conditional | isTestSite locks after operational data exists |
| SiteAssignment | Partial | isActive mutable, assignment immutable |
| DailyReport | **Full after submit** | Draft editable, submitted = frozen forever |
| DailyReportAnnotation | **Full after create** | Additive corrections only |
| TomorrowPlan | Conditional | Mutable until planDate arrives |
| Evidence | **Full after create** | Only isArchived flag mutable (admin only) |
| Snag | Core immutable | Status/owner mutable, description/category frozen |
| SnagComment | **Full after create** | Additive only |
| ChecklistTemplate | Partial | Content mutable, identity immutable |
| ChecklistSubmission | **Full after create** | Immutable checklist response record |
| SyncAction | Partial | Status/retry fields mutable, identity/payload frozen |
| AuditLog | **Full after create** | Never modified or deleted |

Key design decisions:
- **syncActionId** on all write-capable entities enables idempotent offline sync
- **Unique constraints** prevent duplicate daily reports (site+user+date)
- **Status transitions** are enforced (snag: open→in_progress→closed, report: draft→submitted)
- **Snag closure requires evidence** (contextType='snag', contextId=snag.id)

### 2.2 Permission Model (3 Roles)

- **Foreman (Priority 1):** Creates operational data on assigned sites only. Cannot modify others' data or access admin functions. Cannot edit submitted reports.
- **PM (Priority 2):** Views all data across assigned sites. Creates site structure and templates. Cannot edit foreman truth — uses annotation protocol for corrections.
- **Admin (Priority 3):** Full management access. Cannot violate temporal integrity rules (no editing submitted reports, no deleting evidence).

Enforcement: **Backend-only.** UI hides unauthorized actions but does not enforce. Every backend function validates identity, role, site assignment, and operation-specific rules.

### 2.3 Offline Architecture

- **Storage:** IndexedDB (localStorage prohibited for queues/blobs)
- **Sync queue:** FIFO processing, 10 actions per batch, evidence uploads parallel (max 2)
- **Retry:** Exponential backoff (5s, 15s, 45s), max 3 automatic retries, then manual only
- **Idempotency:** Client-generated UUID v4 per action, server checks before execution
- **Triggers:** Manual sync button (always available), auto on app open, auto on reconnect, debounced after queue write (5s)
- **User visibility:** Online/offline/syncing indicator, pending count, failed items with retry

### 2.4 Evidence Workflow

- **Types:** Photo (primary), Note, Attachment
- **Flow:** Capture → client processing (EXIF extract, resolution check, compress, hash) → queue in IndexedDB → upload when online → server validation → permanent storage
- **Quality floor:** 800px minimum shortest dimension, SHA-256 hash, device+server timestamps, EXIF preserved
- **GPS:** Optional, never blocks submission
- **Gating:** Snag closure BLOCKED without evidence. Daily report submission WARNS without evidence. Checklist items with requiresEvidence BLOCKED.
- **Integrity:** Immutable after creation. No deletion (archive only by admin). File hash for tamper detection. Full audit trail.

### 2.5 Test Mode Enforcement

- **Three modes:** DEMO (no writes), TEST (writes to test sites only), LIVE (production)
- **Backend enforced:** `validateSiteMode(siteId, expectedMode)` called before every write
- **Mode detection:** Inferred from site selection (site.isTestSite flag)
- **Isolation:** TEST queries filter `WHERE isTestSite=true`, LIVE filters `WHERE isTestSite=false/null`
- **Lockdown:** isTestSite cannot change once site has any operational data
- **DEMO protection:** All writes return mock success, zero database operations
- **Violation logging:** All mode violations logged to AuditLog

---

## 3. What Was Tested

Phase 0 is a design phase — no runtime tests. Validation was performed by:

- **Schema review against PRD:** All 13 entities cover the PRD Section 8 feature requirements
- **Immutability rules review:** Every immutability requirement from PRD Section 10 is encoded in schema
- **Permission boundary review:** All role boundaries from PRD Section 11 are documented
- **Offline architecture review:** Meets all requirements from PRD Section 9
- **Evidence workflow review:** Meets all quality/integrity requirements from PRD Section 8.3
- **Test mode review:** Backend enforcement design meets PRD Section 9.3

### Validation Checklist

- [x] Entity schemas cover: Sites, Users, DailyReports, TomorrowPlans, Evidence, Snags, QA/Safety checklists
- [x] Immutability rules defined for every entity
- [x] Permission model covers all three roles (foreman, pm, admin)
- [x] Offline queue uses IndexedDB (not localStorage)
- [x] Idempotency design includes syncActionId on all write operations
- [x] Retry policy defined (3 retries, exponential backoff)
- [x] Evidence quality floor defined (800px, SHA-256, timestamps)
- [x] Evidence gating rules defined (snag closure blocks, report submission warns)
- [x] Test mode enforcement is backend-only (UI cannot determine mode)
- [x] Audit trail entity covers all state changes
- [x] No features violate Tier-1 rules (Appendix A)

---

## 4. Pass/Fail Results

| Check | Result |
|---|---|
| All PRD Section 8 features have entity support | PASS |
| Immutability rules match PRD Section 10 | PASS |
| Permission boundaries match PRD Section 11 | PASS |
| Offline architecture matches PRD Section 9.1 | PASS |
| Idempotency design matches PRD Section 9.2 | PASS |
| Environment segregation matches PRD Section 9.3 | PASS |
| Evidence quality matches PRD Section 8.3.1 | PASS |
| No Tier-1 violations detected | PASS |

---

## 5. Blockers for Phase 1

### Missing Authoritative Files

The PRD references four authoritative files that are NOT present in the repository:

1. `BASE44_MASTER_CONTINUITY_v1.0.txt` — Platform-level rules
2. `buildflow_guardrails_v1.3.json` — OnsitePro guardrails
3. `ContinuityX.txt` — Handover protocol
4. `IMAGEX v2.2 ELITE.txt` — Visual governance

**Impact:** Phase 0 was designed from the PRD alone. If these files contain rules that conflict with the PRD, Phase 1 implementation may need adjustment.

**Recommendation:** User should provide these files before Phase 1 begins, OR explicitly confirm that the PRD is sufficient as the sole authoritative source.

### Base44 Platform Specifics

Phase 1 implementation targets Base44 as the execution platform. Specific Base44 APIs, entity creation syntax, and function definitions will need to be adapted to Base44's actual capabilities during Phase 1.

---

## 6. Current State Snapshot

```
Phase:       0 — Foundation & Architecture
Status:      COMPLETE
Completion:  100%
Tier-1:      No violations detected
Next Phase:  Phase 1 — Execution Core (MVP)
Blocker:     None (see recommendations above)
```

---

## 7. Phase 1 Readiness Assessment

### GO Criteria

- [x] Entity schema design complete with immutability rules
- [x] Permission model documented for all three roles
- [x] Offline architecture spec complete with idempotency
- [x] Evidence workflow designed with quality/integrity rules
- [x] Test mode enforcement designed with backend-only approach
- [x] No Tier-1 violations detected

### Recommendation

**GO** for Phase 1, with the caveat that missing authoritative files should be provided if they exist. The PRD provides sufficient detail for Phase 1 implementation.

### Phase 1 Scope Reminder

Phase 1 will implement:
- Sites entity (with isTestSite flag)
- Users entity (with role enforcement)
- Daily Reports (create, view, immutable after submit)
- Tomorrow Plans (create, view, update)
- Evidence uploads (capture, store, link)
- Snags (create, view, status updates)
- QA/Safety checklists (basic)
- Offline queue system
- Sync mechanism (with idempotency)

Backend functions: `createDailyReport`, `createSnag`, `uploadEvidence`, `submitChecklist`, `syncOfflineActions`, `validateSiteMode`

Pages: `/foreman/daily-report-create`, `/foreman/tomorrow-plan`, `/foreman/snag-create`, `/foreman/snag-list`, `/pm/site-dashboard`, `/pm/reports-view`

---

**END OF PHASE 0 HANDOVER**
