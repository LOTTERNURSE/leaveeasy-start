# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

LeaveEasy (ระบบขอลาออนไลน์) is a Thai-language online leave-request app built as a course assignment for **ADT-RAISE Non-Degree Batch 2, Module 2** (a 4-week workshop, weeks 6–9). It's plain **HTML · CSS · vanilla JS** — no framework, no build step, no bundler. `leaveeasy-spec.md` is the authoritative spec (user stories, acceptance criteria, Firestore schema, weekly rollout) — read it before adding or changing any feature; it defines exactly what belongs in which week.

## Commands

```bash
npm install       # installs devDependencies (serve, firebase)
npm run dev       # serves the static site at http://localhost:3000 (via `serve`)
npm run seed      # node scripts/seed-firestore.js — seeds users/leaveTypes/leaveRequests into Firestore
```

There is no build, lint, or test setup — this project intentionally has none.

## How to work in this repo (important)

The project's README describes the intended workflow explicitly as a **4-beat cycle**: state the goal → Claude writes a plan → the user reviews/edits the plan → then implementation happens step by step. The README calls out beat 3 as "the heart of it" and says not to let the AI start implementing before the user has read the plan. **Default to planning first and getting explicit go-ahead before editing files**, especially for anything beyond a trivial fix.

Before pushing to GitHub, the `.gitignore` header asks that the list of files about to be pushed be shown to the user for a manual look, specifically flagging anything with "key/secret/config" in the name. Still, surface the file list before pushing rather than silently including everything.

**Never commit a real secret key to any file that gets pushed** (API keys for AI/third-party services, service account JSON, tokens, passwords). The one deliberate exception is the Firebase **web** `apiKey` in `js/firebase-config.js` / `scripts/seed-firestore.js` — that key is public-by-design (Firebase access is controlled by Firestore Security Rules, not by hiding it), so it's fine committed as-is. Don't generalize from that exception: any other credential (e.g. the API key week 8/9's AI-classify feature will need) must go through `.gitignore`/env vars instead, never hardcoded into a pushed file.

## Architecture

**No build step, no modules.** Every page is a static `.html` file that loads shared scripts via plain `<script defer>` tags, in this order: `js/util.js` (shared helpers: `esc`, `ป้ายสถานะ`, `เวลาตอนนี้`, `ค่าจากURL`) → `js/nav.js` (renders the shared top nav into `<div id="nav">`) → `js/data.js` (legacy in-memory fake dataset) → the page's own script. Firebase is loaded even earlier via CDN `<script>` tags (compat SDK, global `firebase.*`) plus `js/firebase-config.js`, which sets `window.db` — every page has these three lines in `<head>` because week 7 needs `db` everywhere.

**Thai identifiers throughout.** Variable, function, and even some parameter names are Thai (e.g. `ใบลาทั้งหมด`, `แสดงตาราง`, `รหัสใบลา`). This is intentional (the course is Thai-language end to end) — match this style when editing existing files rather than switching to English names. Firestore/JS **field names** (e.g. `leaveRequestId`, `status`, `requesterName`) are English and must match exactly — casing matters and a mismatch fails silently (the spec calls this out explicitly: `status` vs `Status` are different Firestore fields).

**Data layer is mid-migration (by design).** The spec rolls out persistence gradually:
- `js/data.js` (`window.LEAVE_DATA`) is the original hardcoded fake dataset. It's no longer read by the list/detail pages, but is still the source data for the browser-based seeder.
- `leave-requests.js` and `leave-request-detail.js` (US-01, US-03) now read real data from Firestore (`db.collection(...).get()`), matching this week's (week 6) scope.
- `new-leave-request.js` and `leave-types.js` (US-02, US-06) still only mutate `sessionStorage` / in-memory arrays — they intentionally do **not** write to Firestore yet; that's week 7 scope. Don't "fix" this without checking the spec's per-US week numbers first.
- Approve/reject and posting a comment (US-04, US-05) similarly still only mutate in-memory state in `leave-request-detail.js` — read-from-Firestore is live, write-back is week 7.

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

**Two independent, idempotent seeders** — both write with fixed, hand-picked document IDs (`u001`, `lt001`, `lr001`, …) via `.set()`/`setDoc()`, so re-running either is safe and just overwrites:
- `js/seed-data.js` — browser-based, wired to a button on `index.html`, uses the Firebase **compat** SDK (`window.db`) and seeds all 4 collections including `approvals`, reading from `window.LEAVE_DATA`.
- `scripts/seed-firestore.js` — Node CLI (`npm run seed`), uses the Firebase **modular** SDK (`firebase/app`, `firebase/firestore`, not `firebase-admin` — no service account needed while Firestore rules stay open), seeds only `users`/`leaveTypes`/`leaveRequests` (no `approvals`) with its own literal copy of the same sample data.

**Firestore Security Rules are intentionally wide open** (`allow read, write: if true`) — there's no login yet (that's week 7) and no per-role access control (that's week 8, per US-08). Don't tighten rules or add auth checks unless the task is explicitly about week 7/8 work.

**Pages** (5 total, plus `index.html` as a hub linking to them): `leave-requests.html` (list), `new-leave-request.html` (create form), `leave-request-detail.html` (detail + approve/reject + comments), `leave-types.html` (manage leave types). A 5th page, `dashboard.html`, is described in the spec (US-11) but does not exist yet — it's out of scope until Module 3.
