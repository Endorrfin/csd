# Documentation refresh — task brief

**Goal:** bring all nine repository documents back in line with the code. They drifted 1–4 months; three shipped features are undocumented everywhere.

**Prerequisite (done):** `docs/DOC-AUDIT.md` — the verified inventory and per-document drift list, produced 2026-07-28 against commit `d93b258`, revised 2026-07-29 against live AWS output. Read it first, **starting with §0 (corrections) and §3 (resolved contradictions)**. It exists so the rewrite sessions do not have to re-discover the codebase.

**Blocking prerequisite — ✅ DONE.** `feat/test-infrastructure` is merged (`dfac315`, PR #78) and `main` has moved on to `1c1030f`. It added the PR-check workflow, Testcontainers e2e, the `InitialSchema` baseline migration (13 → 14 migrations) and the `!test/jest-e2e.json` gitignore negation. **Document the merged state.** See DOC-AUDIT **§0.5**, which supersedes §0.3 and §3.6.

---

## Pass A — DONE (2026-07-29, at `1c1030f`)

`docs/ARCHITECTURE.md` is corrected and is now the reference the remaining passes link to. `docs/DOC-AUDIT.md` was corrected in the same pass (new §0.5 with rev.-3 corrections; new §5 with the settled decisions).

**Read `DOC-AUDIT.md` §0.5 and §5 before starting any later pass.** §5 lists the eight decisions taken in pass A; apply them, do not re-decide them.

### What later passes should now LINK to rather than restate

| Topic | Lives in |
| --- | --- |
| Recovery form, Winterization form, About registry, shared needs infrastructure | `ARCHITECTURE.md` §7.7, §7.8, §7.9, §7.10 |
| Three buckets + all four upload endpoints (auth · S3 op · bucket · prefix · cap · MIME · TTL) | `ARCHITECTURE.md` §8.1 |
| Env vars, incl. the five read-but-absent from `.env.example`, and the frontend `environment` keys | `ARCHITECTURE.md` §9 |
| Command tables and the `verify` chains for both apps | `ARCHITECTURE.md` §11 (which itself defers to `CONTRIBUTING.md` §4 as canonical) |
| Both CI workflows and the explicit "what CI does not run" | `ARCHITECTURE.md` §12 |
| CSP status — single source of truth | `ARCHITECTURE.md` §14.3 |
| Incident #4 (the `sanitize-html` / ESM outage and `check:cjs`) | `ARCHITECTURE.md` §15 |

### Findings that FLIPPED — do not repeat the audit's rev. 1/2 wording

- PR-check CI **does** exist on `main` (`.github/workflows/test.yml`). The live finding is now: **it has a single `backend` job, so the whole `ui` app is ungated pre-merge** — no `ng lint`, `typecheck`, `ng test`, `format:check` or `ng build` on any PR.
- `backend/test/jest-e2e.json` **is tracked**; `npm run test:e2e` works from a clean clone given Docker (Testcontainers `postgres:16-alpine`).
- 14 migrations on `main`.
- **About sections *are* sanitized** — by a separate config inside `about.service.ts`, not by `SanitizeHtmlPipe`. Only blog and `/api/pages` are unsanitized.
- `SanitizeHtmlPipe` covers **five routes**: procurement (create, update) and vacancy (create, update, legacy `:id/publish`).

### New facts found in pass A, not in the audit's §1

- `npm run check:cjs` + `backend/scripts/check-cjs-load.cjs`; `.github/dependabot.yml` (all npm majors ignored, `sanitize-html` ignored at every level).
- Backend `verify` = `typecheck → lint:check → check:cjs → test → build`. Undocumented script `verify:prod-baseline`.
- `POST /api/upload/presigned-url` has **no size cap** (presigned PUT cannot carry one) and returns **500** on a MIME violation.
- `AWS_S3_MEDIA_BUCKET` defaults to `''` in code → locally, public-media presigned URLs are built against an empty bucket name with no error.
- `AWS_S3_PRIVATE_BUCKET` and `WINTERIZATION_HOUSEHOLD_ENABLED` are **not** in `deploy.yml`'s deploy-step `env:`, so both always take their `serverless.yml` defaults.
- `src/database/run-seeds-standalone.ts` is dead code (no npm script, no import).
- Backend IAM has no `s3:DeleteObject` — which is *why* deleting a needs form orphans its S3 objects.
- `RolesGuard` returns `true` when `@Roles()` is absent/empty → the guard without the decorator is a silent no-op.
- `deploy.yml`'s concurrency group is keyed on `github.event_name`, so `workflow_dispatch` **cannot** cancel a queued PR-merge run, despite the workflow comment claiming it does.
- 35 files still read `translate.currentLang` (audit said ~31); 13 admin feature folders (audit said 12).

**Branch used for pass A:** `docs/architecture-sync` (merged as PR #139).

---

## Pass B — DONE (2026-07-29, at `6d84d64`)

`README.md` and `backend/README.md` are corrected; `ui/README.md` was rewritten from scratch. `docs/DOC-AUDIT.md` gained **§0.6** (rev.-4 corrections) and four more settled decisions in **§5** (items 9–12).

**Read `DOC-AUDIT.md` §0.6 and §5 items 9–12 before starting pass C or D.**

### What C and D should now LINK to rather than restate

| Topic | Lives in |
| --- | --- |
| Local-dev / e2e / prod PostgreSQL versions, as a table | root `README.md` §1 "Database" |
| The CI table + "what no workflow does" | root `README.md` §1.1 (short) · `ARCHITECTURE.md` §12 (full) |
| Bucket/endpoint summary aimed at a newcomer | root `README.md` §2.2 (`ARCHITECTURE.md` §8.1 stays canonical) |
| Env vars a developer must set, and the five missing from `.env.example` | root `README.md` §2.3 · `backend/README.md` "Environment" |
| Backend seeds, `verify` chain, `check:cjs`, known gaps | `backend/README.md` |
| Render modes, npm scripts, testing reality, language rule, Leaflet-from-CDN, known debt | `ui/README.md` |

### Findings corrected in pass B — do not repeat the audit's earlier wording

- Root `README.md` was wrong about local PostgreSQL in **five** places, not seven. The **Docker** `postgres:16` blocks were correct and were left alone (DOC-AUDIT §0.6).
- Equipment catalogue is 21 categories / **232** items, not "~230".
- `LanguageService` **19** files · `translate.currentLang` **35** files — both re-derived, drop the "~".
- `backend/README.md:100-103` said "two standalone scripts"; there are **three** files outside the bootstrap chain, one of which (`run-seeds-standalone.ts`) is dead code.
- `ui`'s `lint` is plain `ng lint` — **no `--fix`**. Only the backend's `lint` mutates files. Do not generalise the backend caveat to both apps.
- `POST /api/upload/testimonial-presigned` has **no guard at all** — anonymous by design.

**Branch used for pass B:** `docs/readme-sync-pass` (merged as PR #140, `4ee8195`).

---

## Pass C — DONE (2026-07-31, at `4ee8195`)

`docs/MEDIA-UPLOADS.md` was rescoped as the **operational** media document; `infra/SECURITY-HEADERS.md` gained a "current state" §0, the blocking enforce warning and executable runbooks. `docs/DOC-AUDIT.md` gained **§0.7** (rev.-5 corrections) and four more settled decisions in **§5** (items 13–16).

Note for pass D: HEAD was `4ee8195`, not the `6d84d64` the pass-C prompt named — pass B had already merged as PR #140.

### What D should now LINK to rather than restate

| Topic | Lives in |
| --- | --- |
| Manual bucket creation, CORS commands, IAM statements, upload error responses, retention/PII | `docs/MEDIA-UPLOADS.md` |
| Which constants file owns each size cap / MIME list / key prefix | `docs/MEDIA-UPLOADS.md` §1 (second table) |
| CSP allowlist rationale, apply/verify/enforce runbooks, the `unpkg.com` warning | `infra/SECURITY-HEADERS.md` |
| Live CloudFront values (policy ID, distribution, 10 behaviours, Report-Only) | `infra/SECURITY-HEADERS.md` §0 — all `†`-marked, none of it repo state |
| CSP *status* | still `ARCHITECTURE.md` §14.3 (unchanged) |

### Findings corrected in pass C — do not repeat the audit's earlier wording

- **The "enforce breaks the About registry" claim was too broad.** The public `/about/documents` link is a `window.open` top-level navigation, which no CSP fetch directive governs — it survives enforce today. What breaks is the **About admin upload** (`connect-src`, `document-files.ts:371`) and the **admin needs-attachment previews** (`img-src`, `recovery-form-detail.ts:518,617`). The Recovery/Winterization claim was correct. Full table in DOC-AUDIT §0.7. The conclusion — apply the prepared JSON before enforce — is unchanged.
- The `presigned-url` **500** on a bad MIME has a mechanism: that endpoint has **no DTO**, so the global `ValidationPipe` never runs. The other three return 400.
- **`AWS_S3_MEDIA_BUCKET=''` does not fail silently everywhere.** Probed against the repo's own `@aws-sdk`: the blog **PUT** flow throws at generation (`No value provided for input HTTP label: Bucket.` → 500); only the testimonial **POST** flow signs a bucket-less URL and fails later in the browser. The audit, pass A and `README.md` §2.3 all said "with no error" flatly. `README.md` §2.3's cell was corrected in this pass — it is the only pass-B file pass C touched.
- The **submit DTOs**, not the services, re-validate the S3 key prefix (`@Matches` in the three attachment DTOs).
- `AWS_S3_PRIVATE_BUCKET` unset → clean 500 via `assertPrivateBucketConfigured()`; there is no public-bucket equivalent.
- The two CORS configs differ on purpose: `csd-media` allows GET/PUT/POST, `csd-media-private` GET/POST.
- Backend helmet HSTS is `15552000` (180 d); the CloudFront policy is `63072000` (2 y). They are not the same value.
- `infra/s3-csd-media-lifecycle.json` has **never** existed — the reference is now removed, not fixed.

**Branch used for pass C:** none created. Suggested: `docs/infra-sync-pass-c`.

**Decisions already taken by Vasyl:**

- `ui/README.md` is untouched Angular CLI boilerplate → **rewrite from scratch**, modelled on `backend/README.md`.
- `docs/forms/` and `docs/about-documents/` stay gitignored. Document the **implementation as it exists in the code**; the planning drafts may be read for intent but are not the source of truth and are not to be relocated.
- Documents are written in **English** (repo convention: code, comments, docs in English; only UI copy and `ui/src/assets/i18n/*.json` are bilingual).
- Surgical updates, not restructuring — preserve each document's existing shape, tone and the material worth keeping (runbooks, incident timeline, security section).
- The five cross-document contradictions are **already resolved** in DOC-AUDIT §3, with the exact wording to use. Apply them verbatim; do not re-decide them per file.

---

## Scope

| Pass | Documents | Size | Status |
| --- | --- | --- | --- |
| **A** | `docs/ARCHITECTURE.md` | 1429 → 2074 lines | ✅ done 2026-07-29 at `1c1030f` |
| **B** | `README.md`, `backend/README.md`, `ui/README.md` | 614 → ~760 · 318 → ~430 · 59 → ~280 | ✅ done 2026-07-29 at `6d84d64` |
| **C** | `docs/MEDIA-UPLOADS.md`, `infra/SECURITY-HEADERS.md` | 129 → ~250 · 108 → ~230 | ✅ done 2026-07-31 at `4ee8195` |
| **D** | `CLAUDE.md`, `backend/CLAUDE.md`, `ui/CLAUDE.md`, `CONTRIBUTING.md` | 110 + 155 + 148 + 548 | next |

A is done — it is the home for the three feature sections, the ER diagram and the bucket/upload matrix, and everything else links to it. B and C are done. Only D remains. **Each pass is a separate session**; do not attempt several in one — the value of this work is accuracy, and that is the first thing a stretched context loses.

---

## Prompt for pass A (copy into a new session)

> Update `docs/ARCHITECTURE.md` in `/Users/vk/i-data/projects/csd-fund` so it matches the code.
>
> Read `docs/DOC-AUDIT.md` first — it is a verified inventory produced on 2026-07-28 and lists exactly what is wrong in this document, with line numbers, in §2.2. Also read `docs/tasks/doc-refresh-task.md` (this file).
>
> Re-verify anything you are about to write against the actual source. The audit is a snapshot, not a live view — where the audit and the code disagree, the code wins, and correct the audit too.
>
> This is a surgical update, not a rewrite. Keep the document's structure, the runbooks (§16), the incident timeline (§15) and the security section (§14). Fix the wrong facts listed in the audit and add the missing sections.
>
> Must be added:
> - §7.x for the Recovery form, §7.x for the Winterization form, §7.x for the About document registry.
> - The 8 tables missing from the ER diagram, and a corrected `ABOUT_DOCUMENT` block.
> - A media-bucket and upload matrix under §8 covering both buckets and all four upload endpoints.
> - An explicit "what CI does not run" note in §12.
> - In §14.2: server-side HTML sanitization covers only procurement and vacancy; recovery/winterization hard-delete is ungated.
> - Reconcile the two contradictory CSP entries (§14.3 vs §17).
>
> Also settle the cross-document contradictions in §3 of the audit — decide once, note the decision in the document, and record it at the end of your reply so later passes stay consistent.
>
> Update the "Last verified against code" header. Do not create a branch; tell me the suggested branch name at the end.

## Prompt for pass B

> Update `README.md` and `backend/README.md`, and rewrite `ui/README.md` from scratch, in `/Users/vk/i-data/projects/csd-fund`.
>
> Read these first, in this order: `docs/tasks/doc-refresh-task.md` (this file — especially the **Pass A — DONE** section), then `docs/DOC-AUDIT.md` **§0.5 and §5**, then its §2.1, §2.7, §2.8. `docs/ARCHITECTURE.md` was corrected in pass A and is the reference — **link to its sections rather than duplicating them**, per the table in the Pass A section above.
>
> Re-verify every fact against the source before writing. The audit is a snapshot; where it and the code disagree, the code wins, and correct `DOC-AUDIT.md` in the same pass. Re-derive counts — do not copy them from the audit into prose as if permanent. Note that HEAD is now `1c1030f`, not the audit's `d93b258`.
>
> **Root `README.md`** — priorities, roughly in order:
> - The `inquiry` module row is missing from the 14-module table (there are 15 modules).
> - The three shipped-but-undocumented features (Recovery, Winterization, About registry) — a short paragraph each, linking to `ARCHITECTURE.md` §7.7–§7.9.
> - Four upload endpoints and three buckets, linking to §8.1. Today it claims one bucket and one presigned PUT.
> - An env-var section covering the five variables read in code but absent from `backend/.env.example`, linking to §9.
> - **`postgresql@16` appears in seven places as the *local dev* database and is wrong in all seven** (DOC-AUDIT §3.1 lists the line numbers — re-derive them, the file may have shifted). Local dev is PostgreSQL 14.
> - Line ~71: procurement is a **7**-step form, not 6.
> - Line ~47: the seeders claim (super-admin + equipment + locations) is wrong — it is equipment + about-documents, local only, and there is no locations seed. It also contradicts line ~83 of the same file.
> - Line ~55: the frontend smoke test greps `ng-server-context`, not `<app-root>`.
> - Line ~26: `ValidationPipe` also sets `forbidNonWhitelisted: true`; `SanitizeHtmlPipe` does **not** cover "Quill rich-text fields" generally — see the flipped-findings list above.
> - Add a short "what CI does not do" note — the `ui` app has no pre-merge gate.
>
> **`backend/README.md`** — the `test:e2e` and Testcontainers sections are **now correct** (the branch merged); add only that the run needs Docker and starts `postgres:16-alpine`. Still wrong: the 14-module list (missing `inquiry`), `needs/` described as WASH-only, `runSeeds` described as equipment-only, the "minimum required keys" env list, the "merges to main trigger the workflow" phrasing, and the "pre-commit enforcement (if configured)" line — nothing is configured, there is no husky and no lint-staged.
>
> **`ui/README.md`** is untouched Angular CLI boilerplate — replace it entirely, modelled on `backend/README.md`. Facts verified in pass A that it should carry (re-verify before writing): Angular 21 standalone + signals + SSR; the three render-mode rules in `app.routes.server.ts` including `activity-map` = `RenderMode.Client` and **no prerendering**; 14 public + 13 admin feature folders; the full npm-script list with **`format:check` covering SCSS only** while `format` rewrites ts+html+scss, and `verify` including `build`; testing reality — **2 spec files, no `vitest.config.ts`, no options block on angular.json's test target**; the four `environment` keys (`production`, `apiUrl`, `turnstileSiteKey`, `winterizationHouseholdEnabled`); language hardcoded to `'ua'` on bootstrap and never persisted, plus the `LanguageService`-vs-`translate.currentLang` rule; **Leaflet is loaded from the unpkg CDN in `index.html`, it is not an npm dependency** (only the `@types` are); the squatted `"ngx-translate": "^0.0.1-security"` dependency; the five admin lists calling `localStorage.getItem('token')` without an `isPlatformBrowser` guard; deployment via S3 sync + SSR Lambda + CloudFront invalidation.
>
> Do not create a branch; suggest a name at the end.

## Prompt for pass C

> Update `docs/MEDIA-UPLOADS.md` and `infra/SECURITY-HEADERS.md` in `/Users/vk/i-data/projects/csd-fund`.
>
> Read, in this order: `docs/tasks/doc-refresh-task.md` (this file — especially **Pass A — DONE** and **Pass B — DONE**), then `docs/DOC-AUDIT.md` **§0.5, §0.6 and §5** (§5 items 1–12 are settled decisions — apply them, do not re-decide), then its §2.3 and §2.10. Re-verify against the source — in particular read `backend/src/modules/upload/upload.service.ts` and `infra/cloudfront-response-headers-policy.json` in full, since both documents describe an older state of exactly those two files.
>
> **HEAD is now `6d84d64`**, not the audit's `d93b258` nor pass A's `1c1030f`. Pass B is complete: `ARCHITECTURE.md` §8.1 (canonical matrix) and root `README.md` §2.2 (newcomer-facing summary) both already exist. **Build on them — do not restate either.** §5 item 9 sets the pattern: a pointer with enough detail to act on, not a duplicate.
>
> `MEDIA-UPLOADS.md` describes a world with one bucket and two endpoints; there are three buckets (`csd-fund-static`, `csd-media`, `csd-media-private`) and four upload endpoints, three of them presigned **POST**. This document is the **operational** one — its job is the how, not the what. Rescope it: an endpoint matrix (endpoint · auth · S3 method · bucket · key prefix · size cap · MIME allow-list), a private-bucket section (manual creation, `infra/s3-csd-media-private-cors.json`, the two IAM statements, no public-read policy), a presigned-GET read section covering `getNeedsFileUrl()` and `getAboutDocFileUrl()`, and a retention/PII section for `media/needs/*`. The referenced `infra/s3-csd-media-lifecycle.json` does not exist — fix or drop that reference.
>
> Three facts pass A verified that this document must carry, because they are operational and live nowhere else: `POST /api/upload/presigned-url` has **no size cap** (a presigned PUT cannot carry a `content-length-range` condition) and returns **500** on a MIME violation; `AWS_S3_MEDIA_BUCKET` defaults to `''` in code so local public-media presigned URLs are built against an empty bucket name with no error; the backend IAM role has **no `s3:DeleteObject`**, which is why deleting a needs form orphans its S3 objects.
>
> `SECURITY-HEADERS.md` is the tricky one, and the audit's first revision got it backwards — read DOC-AUDIT §0.1 and §3.3 carefully. Its allowlist table matches the **live** header and is correct; `infra/cloudfront-response-headers-policy.json` is the file that is out of sync, because it contains an update that was never applied to AWS. Do not "sync the table to the JSON".
>
> What the document needs: a "current state" header (live, Report-Only, policy `0dfcb167-3b72-4c89-8574-0465ee42283c` on distribution `E3U465AMSVR9PN`, verified 2026-07-29); a `default-src 'self'` row; and — most importantly — a **blocking warning** that switching to enforce today breaks the Recovery form, the Winterization form and the About registry, because the live CSP allows neither `challenges.cloudflare.com` nor `csd-media-private`. Applying the prepared JSON is a prerequisite for enforce, not an optional tidy-up. Extend the verification checklist to cover `/needs/recovery-form`, `/needs/winterization-form` and `/about/documents`.
>
> `ARCHITECTURE.md` §14.3 is the single source of truth on CSP *status* (§5 item 3) — link to it rather than restating the status. `SECURITY-HEADERS.md` owns the *procedure*: the allowlist table, the apply/verify commands, and the enforce runbook that the recorded policy ID finally makes executable.
>
> One more thing pass B surfaced: **`unpkg.com` is load-bearing.** Leaflet and `leaflet.markercluster` are loaded from that CDN by `<script>`/`<link>` in `ui/src/index.html` and are not npm dependencies, so `script-src`/`style-src`/`img-src` must keep `https://unpkg.com` or the activity map dies. Say so explicitly — a future reader tightening the CSP will otherwise assume it is a leftover.
>
> **Standing rule 3 applies hard in this pass.** The live header, the policy ID and the cache-behaviour count are *not derivable from this repository* — they were read from live AWS on 2026-07-29. Mark them as such with the verification date and the command to re-check, the way `README.md`'s Database table now does with its `†` footnote. Do not present them as repo facts.
>
> Do not create a branch; suggest a name at the end.

## Prompt for pass D

> Update `CLAUDE.md`, `backend/CLAUDE.md`, `ui/CLAUDE.md` and `CONTRIBUTING.md` in `/Users/vk/i-data/projects/csd-fund`.
>
> Read `docs/DOC-AUDIT.md` (§2.4–§2.6, §2.9) and `docs/tasks/doc-refresh-task.md` first. Passes A–C have already corrected the other documents — point at them instead of restating them.
>
> Judge the three `CLAUDE.md` files by whether an agent reading them would make a wrong edit. `backend/CLAUDE.md` is the most dangerous document in the repo right now: it teaches a ValidationPipe prod/local asymmetry that no longer exists, claims `run-seeds.ts` runs only the equipment seed, says public endpoints carry no guards (three carry `TurnstileGuard`), and lists 14 of 15 modules.
>
> `CONTRIBUTING.md`: two of its claims are genuinely false (`auth.service.spec.ts` and `ReadingTimePipe` do not exist), but the Testcontainers/e2e section and the "lint blocks the PR" claim describe `feat/test-infrastructure`, which is being merged — see DOC-AUDIT §0.3. Verify what is on `main` at the time you write and describe that, rather than deleting the section. Note the e2e container is PostgreSQL 16 while local dev is 14 (DOC-AUDIT §3.1).
>
> Also add to `ui/CLAUDE.md`: `LanguageService` is mandatory for language-dependent logic, because the app is zoneless and `translate.currentLang` is not reactive — roughly 35 files still read it and an agent copying a neighbouring component will reproduce the bug.
>
> Do not create a branch; suggest a name at the end.

---

## Standing rules for every pass

1. **Re-verify before writing.** Open the `.ts` / `.yml` / `.json` file. Never restate a claim from another document.
2. **The code wins** over both the audit and any existing document. If you find the audit wrong, fix `docs/DOC-AUDIT.md` in the same pass.
3. **Do not invent.** If something cannot be verified from the repo (the RDS endpoint, the CloudFront policy ID, CloudWatch retention), say so explicitly rather than repeating a plausible-sounding figure. Several current errors originated exactly this way.
4. **Document what is missing, not only what exists** — no PR-check CI, 2 UI spec files, broken `test:e2e`, no Swagger/throttler/filters. A reader who assumes these exist will make bad decisions.
5. **Keep the drift warning honest.** The one in `CLAUDE.md:94-98` lists four items that were already fixed. A stale warning about staleness is worse than none.
6. Run `npm run verify` in the touched app if any code changes — documentation-only passes need no build.

## Known traps

- Line counts and route totals change with every commit. Re-derive them; do not copy from the audit into prose as if permanent.
- `docs/forms/`, `docs/about-documents/`, `docs/screenshots/` are gitignored (`.gitignore` lines 48, 54, 55). Do not cite them as reader-accessible references in tracked documents.
- `docs/about-documents/pr-d2-task.md` describes **PR-D4** despite its name. Unrelated to this task, but do not let it confuse the About-registry write-up.
- The About registry is mid-flight: PR-D1…PR-D3 shipped, PR-D4 (PDF viewer, CSP, rate limit) has not. Document the current state and mark the viewer as pending rather than describing the end state.
