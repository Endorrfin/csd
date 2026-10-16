# 002 — Plan

Spec: [spec.md](./spec.md). Open questions resolved with the proposed defaults: evidence in a new
«Evidence» column; English status values, paths as evidence; Part 1 (rows 1–50) is the pilot.

## Method

1. Record `git rev-parse --short HEAD` and the date; they go into the board header (AC4).
2. For each row, read the described scope, open the named files, and if a path is missing search by
   intent (symbol, i18n key, attribute). Read-only: grep and file reads, no app runs.
3. Classify with the vocabulary in spec §4. `Partial` and `Obsolete` evidence must say what is
   missing / why it no longer applies. Genuinely ambiguous rows go on a separate list (AC6).
4. Pilot: audit rows 1–50, apply to `tasks.md`, run the AC5 sample (15 random rows re-checked
   by a second pass). Only if ≥ 14/15 match, repeat for rows 51–150.
5. Apply: add the «Evidence» column, fill Status/Evidence, add the audit header. Do not edit any
   other cell (AC1).

## Delegation

Row audits are many independent grep tasks, so they go to a subagent per part. The subagent returns
a table `№ | status | evidence | note`; it edits nothing. The main session applies the result and
owns the AC5 spot check, so the audit is never self-graded by the agent that produced it.

## Risks

- Intern rows (1–10) are "study the project" tasks with no code artefact. Rule: status `Open` unless
  a deliverable exists in the repo; they are listed in the ambiguous list, not guessed.
- Table cells contain `|` escaped as `\|`; the edit must preserve that.

## Verification

Mechanical checks for AC1/AC2/AC4/AC7, then the AC5 sample.
