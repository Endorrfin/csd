# 002 — Sync the task board with the code (retro-spec)

| Field | Value |
| --- | --- |
| Status | Implemented (2026-10-16); not yet committed |
| Origin | Spec 001 audit: tasks #11, #12, #17–19, #22–24, #40, #47 were already implemented while `docs/tasks/tasks.md` showed «—» |
| Type | Retro-spec (documentation only, no application code changes) |
| Target | `docs/tasks/tasks.md` (150 rows: 50 Junior + 100 Feature/Improvement) |

## 1. Problem

Every one of the 150 rows has Status «—», so the board cannot answer "what is left to do".
Spot checks show a meaningful share is already shipped. A stale backlog costs time twice:
people pick tasks that are done, and nobody can see real progress. This is spec drift in its
plainest form — the document claims one state, the code is in another.

## 2. Goals

- G1. Each row's Status reflects the state of the code at a recorded commit.
- G2. Each non-«—» status is backed by evidence a reviewer can re-check in under a minute.
- G3. The board states which commit it was verified against, so the next drift is detectable.

## 3. Non-goals

- Implementing any open task.
- Rewriting task titles, descriptions, levels or the Ukrainian wording.
- Re-prioritising or adding new tasks.
- Touching other documents (`ARCHITECTURE.md`, READMEs).

## 4. Status vocabulary

| Status | Meaning |
| --- | --- |
| `Done` | The described behaviour exists in the code today |
| `Partial` | Some of the described scope exists; the evidence names what is missing |
| `Open` | Nothing of the described scope exists |
| `Obsolete` | The task no longer applies (feature frozen, approach superseded); evidence says why |

## 5. Acceptance criteria

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC1 | The synced board | Counting rows | All 150 rows keep their numbers, titles and order; none removed or added |
| AC2 | Any row | Reading Status | It is exactly one value from §4 — no «—» remains |
| AC3 | Any `Done`/`Partial`/`Obsolete` row | Reading the evidence | A file path (and, where useful, a symbol) that a reviewer can open to confirm |
| AC4 | The board header | Reading it | It names the commit hash the audit was run against and the audit date |
| AC5 | A random sample of 15 rows | Re-checking against code | At least 14 match their recorded status |
| AC6 | Rows whose status was ambiguous | Reading the PR/commit notes | They are listed with the reason, not silently decided |
| AC7 | The diff | Reviewing it | Only `docs/tasks/tasks.md` (and this spec folder) changed |

## 6. Constraints

- Verification reads code and greps only; it does not run the apps.
- Tasks that describe backend-visible behaviour are judged by the UI/API code, not by production.
- Where a task's file path no longer exists, search by intent (symbol/behaviour) before concluding `Open`.
- Documentation is not authoritative over code: when they disagree, the code wins (repo rule).

## 7. Verification

- AC1, AC2, AC4, AC7: mechanical — row count, no «—», header present, `git diff --stat`.
- AC3, AC5, AC6: the reviewer samples rows and re-checks the evidence.

## 8. Open questions

1. **Where does the evidence live?** Options: (a) a new «Evidence» column in the same table;
   (b) evidence inside the Status cell, e.g. `Done — footer.ts:40`; (c) a separate
   `docs/specs/002-tasks-board-sync/audit.md`, board stays clean. Proposed default: (a), since it keeps
   one source of truth and the table is already wide.
2. **Language of the Status/Evidence cells**: the table is Ukrainian, repo rule says English for
   files. Proposed default: status values in English as in §4 (they are lookup keys), evidence is just paths.
3. **Scope for the first pass**: all 150 rows at once, or Part 1 (50) first as a pilot to
   validate the method? Proposed default: Part 1 first, then Part 2 once AC5 passes.
