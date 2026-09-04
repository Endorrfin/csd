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

**Branch used for pass C:** `docs/infra-sync-pass-c` (merged as PR #141, `e5a4578`).

---

## Pass D — DONE (2026-07-31, at `e5a4578`) — **the refresh is complete**

`CLAUDE.md`, `backend/CLAUDE.md`, `ui/CLAUDE.md` and `CONTRIBUTING.md` are corrected. `docs/DOC-AUDIT.md` gained **§0.8** (rev.-6 corrections), four more settled decisions in **§5** (items 17–20), a completion banner at the top, and ✅ marks on §2.4, §2.5, §2.6 and §2.9.

**Every tracked document in the repository has now been verified against the code.** There is no pass E.

### What each document ended up owning

| Document | Owns | Verified at |
| --- | --- | --- |
| `CLAUDE.md` (root) | Repo tree, stack snapshot, the CI-gaps summary, prod resources, Vasyl's rules, the **Documentation state** table | `e5a4578` |
| `backend/CLAUDE.md` | Boot contract, RBAC + Turnstile, sanitization scope, IAM, migrations, "known gaps — do not fix blindly", Don'ts | `e5a4578` |
| `ui/CLAUDE.md` | The `LanguageService` rule, the Leaflet nuance, SSR safety + the five violators, `ApiService` and its two real exceptions, environments, Don'ts | `e5a4578` |
| `CONTRIBUTING.md` | Branching, commits, PR process, **§4 — the canonical command reference**, testing reality, security rules | `e5a4578` |

### Findings corrected in pass D — do not repeat the audit's earlier wording

- **DOC-AUDIT §2.5's `about` row is backwards.** It said `backend/CLAUDE.md`'s "sections + documents" should read "sections only since PR-D3". The module carries **both** — three entities and two admin document routes. Only the row's parenthetical ("NOT mentioned in README") was wrong.
- **The backend `verify` chain includes `check:cjs`** — `CONTRIBUTING.md:236` omitted it, and §2.9 did not flag the omission. It is the step that exists *because* of two production outages.
- **`test.yml` does not run backend `typecheck`, `format` or `build`**, only `lint:check → check:cjs → test → test:e2e`. So `typecheck` is ungated on both apps, not just on `ui`.
- **The backend has no `format:check` script at all.** §0.6 documented the `ui` half of the formatting story only; nothing anywhere verifies backend formatting.
- **The Turnstile contract has a third part:** `serverless.yml` allowlists `X-Turnstile-Token` in the API Gateway CORS `headers` block on both `http` events. Guarding a new route means editing `serverless.yml` too.
- **Root `CLAUDE.md` carried two deploy errors §2.4 missed** — the frontend smoke test greps `ng-server-context`, not `<app-root>`; and `workflow_dispatch` cannot cancel a queued PR-merge run, because the concurrency group is keyed on `github.event_name`.
- **`ssr-lambda.mjs` and `lambda.mjs` wrap different exports** (`handler` vs `app`). Editing the wrong one is silent.
- **Two of the four `allowedCommonJsDependencies` entries are real.** `quill` and `quill-delta` are load-bearing; only `leaflet` and `leaflet.markercluster` are dead. Do not remove the array.
- **DOC-AUDIT §0.5's "14 public + 13 admin" feature-folder count double-counts `admin/`.** `features/` has 14 folders total, one being `admin/`; `admin/` has 13 subfolders.
- **`POST /api/auth/login` is not unguarded** — it carries `@UseGuards(AuthGuard('local'))`. Anonymous in the JWT sense only.
- **There is a second raw-`fetch` category in `ui`**, larger than the XLSX one: five components do direct-to-S3 presigned uploads, correctly bypassing the auth interceptor.
- **`main.ts` and `lambda.ts` match on ValidationPipe *options*, not on statement order.**
- **Two hand-rolled CSV exporters exist** (`complaint.controller.ts`, `inquiry.controller.ts`), with no shared helper.
- **Not every untracked `docs/` subfolder is gitignored** — `Research/` and `pоlicies_and_procedures/` are not.

The last eight were caught by an independent verification pass run against the source *after* the first draft, not during it. That check earned its keep; do it again if there is ever a pass E.

### Counts re-derived at `e5a4578`

15 backend modules · 14 migrations · 17 backend unit suites + 1 e2e suite · 21 equipment categories / 232 items · 27 routes in `needs.controller.ts` · 5 `SanitizeHtmlPipe` routes · 3 Turnstile-guarded routes · 14 `ui` feature folders (13 public + `admin/`, which has 13 subfolders) · **2** `ui` spec files · 19 `LanguageService` consumers vs **35** files still reading `translate.currentLang` · 5 admin lists with unguarded `localStorage` · 5 components doing direct-to-S3 `fetch`.

**Branch suggested for pass D:** `docs/agent-guides-pass-d`.

---

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
| **D** | `CLAUDE.md`, `backend/CLAUDE.md`, `ui/CLAUDE.md`, `CONTRIBUTING.md` | 110 + 155 + 148 + 548 → ~150 + ~250 + ~200 + ~640 | ✅ done 2026-07-31 at `e5a4578` |

**All four passes are complete.** A is the home for the three feature sections, the ER diagram and the bucket/upload matrix, and everything else links to it. **Each pass was a separate session** — do not attempt several in one; the value of this work is accuracy, and that is the first thing a stretched context loses.

Nothing further is planned. If a fifth pass ever becomes necessary, `DOC-AUDIT.md`'s top banner lists what would trigger it.

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
> **`ui/README.md`** is untouched Angular CLI boilerplate — replace it entirely, modelled on `backend/README.md`. Facts verified in pass A that it should carry (re-verify before writing): Angular 21 standalone + signals + SSR; the three render-mode rules in `app.routes.server.ts` including `activity-map` = `RenderMode.Client` and **no prerendering**; 14 public + 13 admin feature folders; the full npm-script list with **`format:check` covering SCSS only** while `format` rewrites ts+html+scss, and `verify` including `build`; testing reality — **2 spec files, no `vitest.config.ts`, no options block on angular.json's test target**; the five `environment` keys (`production`, `apiUrl`, `turnstileSiteKey`, `winterizationHouseholdEnabled`, `cartoBasemapKey`) and the `Environment` interface in `environment.model.ts` that all three files implement; language hardcoded to `'ua'` on bootstrap and never persisted, plus the `LanguageService`-vs-`translate.currentLang` rule; **Leaflet is loaded from the unpkg CDN in `index.html`, it is not an npm dependency** (only the `@types` are); the squatted `"ngx-translate": "^0.0.1-security"` dependency; the five admin lists calling `localStorage.getItem('token')` without an `isPlatformBrowser` guard; deployment via S3 sync + SSR Lambda + CloudFront invalidation.
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

*(Rewritten 2026-07-31 after pass C merged. The pre-pass-A version of this prompt is obsolete — it referred to `feat/test-infrastructure` as unmerged.)*

> Update `CLAUDE.md`, `backend/CLAUDE.md`, `ui/CLAUDE.md` and `CONTRIBUTING.md` in `/Users/vk/i-data/projects/csd-fund`. This is the **last pass** — after it, every document in the repo has been verified.
>
> Read, in this order: `docs/tasks/doc-refresh-task.md` (this file — the **Pass A/B/C — DONE** sections and their "what to LINK to" tables), then `docs/DOC-AUDIT.md` **§0.5, §0.6, §0.7 and §5** (§5 items 1–16 are settled decisions — apply them, do not re-decide), then its §2.4, §2.5, §2.6 and §2.9.
>
> **HEAD is `e5a4578`** (pass C merged as PR #141). Passes A–C corrected `ARCHITECTURE.md`, all three READMEs, `MEDIA-UPLOADS.md` and `SECURITY-HEADERS.md`. **Point at them; do not restate them.** Standing rules 1–6 at the bottom of this file apply, especially rule 1 (open the source before writing) and rule 3 (never present a live-AWS value as a repo fact).
>
> **The test to apply throughout:** judge the three `CLAUDE.md` files by whether an agent that believes them would make a *wrong edit*. Everything else is secondary. `CONTRIBUTING.md` is judged differently — it is the canonical command reference (DOC-AUDIT §5 item 5), so its §4 must be re-derived line by line against `backend/package.json` and `ui/package.json`.
>
> **`backend/CLAUDE.md` is the most dangerous document in the repo.** Every item below is from DOC-AUDIT §2.5 — re-verify each before writing: it teaches a ValidationPipe prod/local asymmetry that no longer exists (`lambda.ts:52` sets `forbidNonWhitelisted`), claims `run-seeds.ts` runs only the equipment seed (it also runs `seedAboutDocuments()`), says public endpoints carry no guards (three carry `TurnstileGuard`), lists 14 of 15 modules (`inquiry` missing), describes `needs/` as WASH-only, says the tsconfig target is ESNext (`ES2023` / `module: nodenext`), and claims IAM covers `csd-media/*` only. Add: the Turnstile header contract, `assertRequiredEnv` + helmet, the full npm-script list including `verify` / `lint` vs `lint:check` / `check:cjs` / `seed:about-documents` (there is **no** `seed:equipment`), and a "known gaps — do not fix blindly" section.
>
> **`ui/CLAUDE.md`.** Its Leaflet line needs care rather than deletion: `angular.json:61-66` really does still list `leaflet` and `leaflet.markercluster` under `allowedCommonJsDependencies`, but **neither is an npm dependency** — both come from the unpkg CDN via `<script>`/`<link>` in `index.html`, and `map-view.ts` reads `globalThis.L`. So the config entries are dead, and the CLAUDE.md line is true about the config and false about reality. Say both, and flag the entries as a cleanup candidate. Also add the rule that matters most: **`LanguageService` is mandatory for language-dependent logic** — the app is zoneless, `translate.currentLang` is not reactive, and ~35 files still read it (re-derive the count), so an agent copying a neighbouring component reproduces the bug. Keep only the rules an agent must not break; `ui/README.md` is now the home for render modes, scripts and known debt (DOC-AUDIT §5 item 11).
>
> **Root `CLAUDE.md`.** Its "⚠ Doc drift warning" lists four README errors that pass B already fixed. **Decision taken: replace the section with a "documents are current" pointer** — a short table of each document, the commit it was last verified against, and a link to `DOC-AUDIT.md` §5 for the settled decisions. Do not keep a list of specific stale claims; that is what went wrong the first time. Also add `infra/` and `docs/tasks/` to the repo tree, and `csd-media-private` to the prod-resources list.
>
> **`CONTRIBUTING.md`.** The status of several claims has *flipped* since the audit was written — verify against `main`, not against DOC-AUDIT's rev. 1:
> - The Testcontainers/e2e section and "not running lint blocks the PR" are now **true for the backend** (`.github/workflows/test.yml` is on `main`). They remain **false for `ui`** — `test.yml` has exactly one job, `backend`. Use the invariant sentence from DOC-AUDIT §5 item 10 verbatim.
> - `auth.service.spec.ts` does not exist; `ui` has exactly **two** spec files (`app.spec.ts`, `features/contact/inquiry-form.spec.ts`).
> - Line ~271 names two pipes as test targets: **`ReadingTimePipe` does not exist**, but **`QuillHtmlPipe` does** (`ui/src/app/shared/pipes/quill-html.pipe.ts`). Fix the false half, keep the true half.
> - "pre-commit enforcement (if configured)" — nothing is configured. No `.husky/`, no `lint-staged` in any `package.json`.
> - Line ~459's ValidationPipe asymmetry is gone (same fix as `backend/CLAUDE.md`).
> - Note the PostgreSQL spread: local dev **14**, e2e Testcontainers **16-alpine**, production **16.13** (DOC-AUDIT §5 item 1).
> - `ui`'s `format:check` is **SCSS only**, and its `lint` is plain `ng lint` with **no `--fix`** — only the backend's `lint` mutates files. Do not generalise the backend caveat.
>
> Finally, add a line to `docs/DOC-AUDIT.md` §5 recording any decision you take, and a **Pass D — DONE** section to this file. Since D is last, also say plainly in `DOC-AUDIT.md` that the refresh is complete and what would make it stale again.
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
