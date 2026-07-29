# Documentation refresh — task brief

**Goal:** bring all nine repository documents back in line with the code. They drifted 1–4 months; three shipped features are undocumented everywhere.

**Prerequisite (done):** `docs/DOC-AUDIT.md` — the verified inventory and per-document drift list, produced 2026-07-28 against commit `d93b258`, revised 2026-07-29 against live AWS output. Read it first, **starting with §0 (corrections) and §3 (resolved contradictions)**. It exists so the rewrite sessions do not have to re-discover the codebase.

**Blocking prerequisite:** merge `feat/test-infrastructure`. Rebased onto `main` as `8f32e52`; `npm run verify` passes in both apps (backend 17 suites / 176 tests + build, ui green) as of 2026-07-29. It adds the PR-check workflow, Testcontainers e2e, the `InitialSchema` baseline migration (13 → 14 migrations) and the `!test/jest-e2e.json` gitignore negation. Two of the audit's findings flip after this merge. Document the merged state, not `main` as it stands. See DOC-AUDIT §0.3 and §3.6.

**Decisions already taken by Vasyl:**

- `ui/README.md` is untouched Angular CLI boilerplate → **rewrite from scratch**, modelled on `backend/README.md`.
- `docs/forms/` and `docs/about-documents/` stay gitignored. Document the **implementation as it exists in the code**; the planning drafts may be read for intent but are not the source of truth and are not to be relocated.
- Documents are written in **English** (repo convention: code, comments, docs in English; only UI copy and `ui/src/assets/i18n/*.json` are bilingual).
- Surgical updates, not restructuring — preserve each document's existing shape, tone and the material worth keeping (runbooks, incident timeline, security section).
- The five cross-document contradictions are **already resolved** in DOC-AUDIT §3, with the exact wording to use. Apply them verbatim; do not re-decide them per file.

---

## Scope

| Pass | Documents | Size |
| --- | --- | --- |
| **A** | `docs/ARCHITECTURE.md` | 1429 lines |
| **B** | `README.md`, `backend/README.md`, `ui/README.md` | 614 + 318 + 59 |
| **C** | `docs/MEDIA-UPLOADS.md`, `infra/SECURITY-HEADERS.md` | 129 + 108 |
| **D** | `CLAUDE.md`, `backend/CLAUDE.md`, `ui/CLAUDE.md`, `CONTRIBUTING.md` | 110 + 155 + 148 + 548 |

Run A first — it is the natural home for the three new feature sections and the ER diagram, and everything else links to it. C and D can run in parallel after A. Each pass is a separate session; do not attempt all four in one.

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
> Read `docs/DOC-AUDIT.md` (§2.1, §2.7, §2.8) and `docs/tasks/doc-refresh-task.md` first. `docs/ARCHITECTURE.md` has already been corrected in pass A — link to it rather than duplicating it.
>
> Re-verify facts against the source before writing; where the audit and the code disagree, the code wins.
>
> `ui/README.md` is currently untouched Angular CLI boilerplate with no project-specific content. Replace it entirely, modelled on `backend/README.md`: stack, feature/route map, SSR model, i18n, auth, local setup, npm scripts (including the `format:check` SCSS-only caveat), testing reality, deployment.
>
> For the root `README.md`, the priorities are: the missing `inquiry` module row, the three undocumented features, the four upload endpoints and two buckets, and an env-var section covering the five variables read in code but absent from `backend/.env.example`.
>
> Do not create a branch; suggest a name at the end.

## Prompt for pass C

> Update `docs/MEDIA-UPLOADS.md` and `infra/SECURITY-HEADERS.md` in `/Users/vk/i-data/projects/csd-fund`.
>
> Read `docs/DOC-AUDIT.md` (§2.3, §2.10) and `docs/tasks/doc-refresh-task.md` first. Re-verify against the source — in particular read `backend/src/modules/upload/upload.service.ts` and `infra/cloudfront-response-headers-policy.json` in full, since both documents describe an older state of exactly those two files.
>
> `MEDIA-UPLOADS.md` describes a world with one bucket and two endpoints; there are two buckets and four endpoints. Rescope it: an endpoint matrix (endpoint · auth · S3 method · bucket · key prefix · size cap · MIME allow-list), a private-bucket section (manual creation, CORS file, IAM statements, no public-read policy), a presigned-GET read section, and a retention/PII section for `media/needs/*`. The referenced `infra/s3-csd-media-lifecycle.json` does not exist — fix or drop that reference.
>
> `SECURITY-HEADERS.md` is the tricky one, and the audit's first revision got it backwards — read DOC-AUDIT §0.1 and §3.3 carefully. Its allowlist table matches the **live** header and is correct; `infra/cloudfront-response-headers-policy.json` is the file that is out of sync, because it contains an update that was never applied to AWS. Do not "sync the table to the JSON".
>
> What the document needs: a "current state" header (live, Report-Only, policy `0dfcb167-3b72-4c89-8574-0465ee42283c` on distribution `E3U465AMSVR9PN`, verified 2026-07-29); a `default-src 'self'` row; and — most importantly — a **blocking warning** that switching to enforce today breaks the Recovery form, the Winterization form and the About registry, because the live CSP allows neither `challenges.cloudflare.com` nor `csd-media-private`. Applying the prepared JSON is a prerequisite for enforce, not an optional tidy-up. Extend the verification checklist to cover `/needs/recovery-form`, `/needs/winterization-form` and `/about/documents`.
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
