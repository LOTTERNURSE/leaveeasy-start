# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LeaveEasy (ระบบขอลาออนไลน์) is a Thai-language online leave-request app built as a course assignment for **ADT-RAISE Non-Degree Batch 2, Module 2** (a 4-week workshop, weeks 6–9). It's plain **HTML · CSS · vanilla JS** — no framework, no build step, no bundler. `leaveeasy-spec.md` is the authoritative spec (user stories, acceptance criteria, Firestore schema, weekly rollout) — read it before adding or changing any feature; it defines exactly what belongs in which week.

## Commands

```bash
npm install       # installs devDependencies (serve, @playwright/test)
npm run dev       # serves the static site at http://localhost:3000 (via `serve`)
npx playwright test --workers=1              # e2e tests against the live site https://lotternurse.web.app
firebase deploy --only firestore:rules       # publish firestore.rules (needed after every rules edit)
```

There is no build or lint step. Tests (week 9) are Playwright e2e in `tests/`, run against the **deployed** site and the real Firestore — always `--workers=1` (parallel runs contend on the same backend and time out). Steps that need a manager/hr account log in with fixed test accounts from `.env` (template: `.env.example`, gitignored); without them those groups are skipped, not failed. Never make a test promote its own role — the rules forbid it, and `access-isolation.spec.js` asserts exactly that.

## Subagents (`.claude/agents/`)

Three project agents, each pinned to a model:
- `planner` (opus, read-only) — reads spec + code, writes the step-by-step plan for beat 2 of the 4-beat cycle.
- `reviewer` (opus, read-only + read-only git) — secret-leak scan, `firestore.rules` vs `ACL.md`, code vs spec. Run before every push.
- `tester` (sonnet) — writes/runs Playwright tests and updates `test-results.md`; may edit only test files, never app code or rules.

## How to work in this repo (important)

The project's README describes the intended workflow explicitly as a **4-beat cycle**: state the goal → Claude writes a plan → the user reviews/edits the plan → then implementation happens step by step. The README calls out beat 3 as "the heart of it" and says not to let the AI start implementing before the user has read the plan. **Default to planning first and getting explicit go-ahead before editing files**, especially for anything beyond a trivial fix.

Before pushing to GitHub, the `.gitignore` header asks that the list of files about to be pushed be shown to the user for a manual look, specifically flagging anything with "key/secret/config" in the name. Still, surface the file list before pushing rather than silently including everything.

**Never commit a real secret key to any file that gets pushed** (API keys for AI/third-party services, service account JSON, tokens, passwords). The one deliberate exception is the Firebase **web** `apiKey` in `js/firebase-config.js` — that key is public-by-design (Firebase access is controlled by Firestore Security Rules, not by hiding it), so it's fine committed as-is. Don't generalize from that exception: any other credential (e.g. the API key week 8/9's AI-classify feature will need) must go through `.gitignore`/env vars instead, never hardcoded into a pushed file.

## Architecture

**No build step, no modules.** Every page is a static `.html` file that loads shared scripts via plain `<script defer>` tags, in this order: `js/util.js` (shared helpers: `esc`, `ป้ายสถานะ`, `เวลาตอนนี้`, `ค่าจากURL`) → `js/nav.js` (renders the shared top nav into `<div id="nav">`) → the page's own script. Firebase is loaded even earlier via CDN `<script>` tags (compat SDK, global `firebase.*`) plus `js/firebase-config.js`, which sets `window.db` — every page has these three lines in `<head>` because week 7 needs `db` everywhere.

**Thai identifiers throughout.** Variable, function, and even some parameter names are Thai (e.g. `ใบลาทั้งหมด`, `แสดงตาราง`, `รหัสใบลา`). This is intentional (the course is Thai-language end to end) — match this style when editing existing files rather than switching to English names. Firestore/JS **field names** (e.g. `leaveRequestId`, `status`, `requesterName`) are English and must match exactly — casing matters and a mismatch fails silently (the spec calls this out explicitly: `status` vs `Status` are different Firestore fields).

**Data layer.** All pages read and write Firestore for real (week 7 CRUD done): create request, approve/reject, comments, delete, leave-type management. Login is Firebase Authentication (`js/auth-guard.js` exposes `window.รอสถานะล็อกอิน`); `requesterId` is the signed-in user's uid.

**Firestore schema** (see `leaveeasy-spec.md` §5.2 for the full picture). There are exactly 4 collections (folders) — 3 top-level plus 1 subcollection nested under each leave request document:
```
users/{id}              { name, email, role }         role ∈ employee | manager | hr
leaveTypes/{id}          { name }
leaveRequests/{id}       { title, reason, status, requesterId, requesterName,
                           approverId, approverName, leaveTypeId, leaveTypeName,
                           startDate, endDate, createdAt }
  leaveRequests/{id}/approvals/{id}   { authorId, authorName, message, createdAt }
```
- `users` — top-level collection
- `leaveTypes` — top-level collection
- `leaveRequests` — top-level collection
- `approvals` — subcollection nested under each `leaveRequests/{id}` document (not top-level)

`leaveRequests.status` has exactly 3 possible values — treat this as a closed set, not a free-text field:
- `รอพิจารณา` — pending (the default for every new request)
- `อนุมัติ` — approved
- `ไม่อนุมัติ` — rejected

Names are denormalized alongside every ID (e.g. `requesterName` next to `requesterId`) on purpose — Firestore has no JOINs.

**Seed data** (`u001`–`u003`, `lt001`–`lt003`, `lr001`–`lr005`, spec §7) is already in Firestore. The two seeders (`js/seed-data.js` + `js/data.js`, and `scripts/seed-firestore.js`) were removed once the per-role rules made them fail (fixed IDs like `users/u001` and requests owned by other users are rejected); recover them from git history if ever needed. Never delete the seed documents.

**Firestore Security Rules are per-role and deployed** (week 8, see `firestore.rules` and `ACL.md`): employees read/delete/comment only on their own requests and can never change `status` or their own `role`; manager/hr read all and approve/reject; only hr edits `leaveTypes`; `approvals`/`aiLog` subcollections follow the parent request's read rule. Because rules check the *query*, an employee list read must include `.where("requesterId", "==", uid)`.
**Pages** (5 total, plus `index.html` as a hub linking to them): `leave-requests.html` (list), `new-leave-request.html` (create form), `leave-request-detail.html` (detail + approve/reject + comments), `leave-types.html` (manage leave types). A 5th page, `dashboard.html`, is described in the spec (US-11) but does not exist yet — it's out of scope until Module 3.
