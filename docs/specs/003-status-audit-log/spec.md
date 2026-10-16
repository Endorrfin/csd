# 003 — Status audit log for procurement, vacancy, testimonial, complaint, inquiry

| Field | Value |
| --- | --- |
| Status | Decisions resolved (D13 added); plan awaiting review |
| Origin | `docs/ARCHITECTURE.md` §17 (medium priority): «Add audit log for status changes on procurement, vacancy, testimonial, complaint, inquiry» |
| Apps | `backend`, `ui` (admin) |
| Size | Large: touches five backend modules, a shared log, five admin views, tests and docs |

## 1. Problem

Staff change the status of complaints, inquiries, testimonials, procurements and vacancies
(publish, approve, reject, close, cancel…). Nothing records **who** did it, **when**, or
**from what**. The fund reports to donors and the code already acknowledges it
(`complaint.service.ts`: «CSV export for donor reporting (GIZ/UNICEF audit requirements)»).
Three consequences today:

- A disputed decision («who rejected this testimonial?», «who closed this complaint?») cannot be answered.
- Hard deletes (closed complaints, draft procurements/vacancies) leave no trace at all.
- The three needs-form families (WASH, Recovery, Winterization) already have an audit trail, so
  the admin UI is inconsistent: some records have a history, others do not.

## 2. Current state (verified against the code)

- A shared `needs_form_audit_log` table and `NeedsAuditLogService` already exist for Recovery and
  Winterization. It is polymorphic (`formType` + `formId`, **no FK**, so `deleted` rows survive), keeps an
  email snapshot of the actor, and WASH has its own separate log that must not be refactored.
- None of the five target controllers passes the acting user into `updateStatus`; the services take no actor.
- Status can change through **13 routes**, but they funnel into two service methods per module
  (`update` and `updateStatus`): procurement `PATCH :id`, `:id/status`, `:id/publish`; vacancy the same three;
  testimonial `PATCH :id`, `:id/approve`, `:id/reject`, `:id/status`; complaint `PATCH :id`, `:id/status`;
  inquiry `:id/status`. `/publish`, `/approve` and `/reject` are legacy wrappers that call `service.update`.
  `PATCH :id` carries `status` because the update DTOs inherit it from the create DTOs. Testimonial `/verify`
  toggles a separate flag and is not a status.
- Recovery writes its audit record **after** the save, in a `try/catch` that only logs on failure
  (best-effort). The spec must decide whether the new log copies that or is stricter (§9, Q2).
- Hard delete exists: complaints (closed only), procurements and vacancies (draft only), testimonials, inquiries.
- Complaints and inquiries hold personal data; `managerNotes` is free text and may contain it.
  Complaint search deliberately excludes PII fields.
- Admin UI: Recovery/WASH detail pages already show an audit timeline; complaints and inquiries use a
  drawer; procurement, vacancy and testimonial use admin edit views.

## 3. Goals

- G1. Every status change on the five entities is recorded with actor, time, old and new value.
- G2. Creation by staff and deletion of these records are recorded, and deletion records outlive the record.
- G3. Authorised staff can see the history of one record in the admin UI.
- G4. Recording cannot be silently skipped by using a different route to the same change.
- G5. The existing WASH / Recovery / Winterization logs behave exactly as before.

## 4. Non-goals

- Field-level edit history (titles, descriptions, dates). Status, creation and deletion only.
- Back-filling history for records that already exist.
- A cross-entity audit search page, export, or reporting view.
- Changing who may change a status, or adding status-transition rules.
- Refactoring the WASH log or merging it into the shared table.
- Editing or deleting audit records (the log is append-only for everyone, including super_admin).

## 5. Actors

| Actor | Does |
| --- | --- |
| Manager / Admin / Super-admin | Changes statuses (as today); reads history |
| Anonymous visitor | Submits a complaint, inquiry or testimonial (creates a record, no actor) |
| Donor auditor (indirect) | Receives evidence the fund can produce from the log |

## 6. Acceptance criteria — recording

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC1 | Staff user, any of the five entities | Status changes via **any** route listed in §2 | Exactly one record is stored: entity type, entity id, actor id, actor email snapshot, old status, new status, timestamp |
| AC2 | Any entity | A request sets the status to its current value | No record is stored |
| AC3 | An update request changes several fields including status | It is saved | One status record is stored; other fields are not logged (non-goal) |
| AC4 | Anonymous visitor | Submits a complaint, inquiry or testimonial | Behaviour is exactly as before: the submission succeeds or fails on its own merits and **no audit write takes place** (decision D13) |
| AC5 | Staff user | Creates a procurement or vacancy | A `created` record exists with the actor |
| AC6 | Staff user | Hard-deletes a record | A `deleted` record exists with the actor and the status held at deletion; it remains after the record is gone |
| AC7 | Status change also sets a side effect (e.g. first publication date) | It is saved | Only the status change is logged; the side effect is not a separate record |
| AC8 | `managerNotes` changes (with or without a status change) | It is saved | The record shows that notes changed but never contains the note text (decision D3) |
| AC9 | The audit write fails | A status change is attempted | The whole operation fails with an error and the status is unchanged (decision D2); covered by a test |
| AC22 | Two staff users change the same record at nearly the same time | Both are saved | Each record's old value equals the status that was really replaced; no log entry claims a transition that did not happen |
| AC10 | A user is later deleted | History is read | The earlier email snapshot is still shown |

## 7. Acceptance criteria — reading

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC11 | Manager/Admin/Super-admin | Requests the history of one record | Records come back newest first, with actor, action, old and new status, timestamp |
| AC12 | A record id that has history but no longer exists | History is requested | The records, including `deleted`, are still returned |
| AC13 | A record with no history (created before this feature) | History is requested | An empty list, not an error |
| AC14 | Unauthenticated user, or role below manager | Requests history | 401 / 403 |
| AC15 | A very long history | It is requested | Result is limited (default limit, hard maximum) like the existing needs endpoint |

## 8. Acceptance criteria — admin UI and quality

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC16 | Staff user opens any of the five records in admin | Looks for history | A «History» section shows each entry: action, old → new status as the same localised labels used elsewhere, actor email or «Public submission», date and time |
| AC17 | A record without history | The section renders | A clear empty message that states history is recorded only from the feature's release |
| AC18 | UI language switched UA ↔ EN | The section renders | All text follows the language, via `LanguageService`, with keys in both `ua.json` and `en.json` |
| AC19 | WASH, Recovery, Winterization | Any existing flow runs | Behaviour and their audit output are unchanged |
| AC20 | The change ships | `npm run verify` (backend and ui) and backend e2e run | All pass; new unit tests cover AC1, AC2, AC6, AC8, AC9 per module, and one e2e test covers an end-to-end status change plus the role checks AC11, AC14 |
| AC23 | The history request fails or is slow | Staff opens any of the five admin views | Only the History section shows an error with a retry; the rest of the page works normally |
| AC24 | A role of `public` or `donor` | Requests history | 403, never data |
| AC21 | The change ships | Docs are read | `ARCHITECTURE.md` describes the new log; the §17 debt item is removed |

## 9. Decisions

Resolved with the priorities **1. security, 2. best practice, 3. usability for the public and staff**.

| ID | Decision | Why |
| --- | --- | --- |
| D1 | Record `created`, `status_changed`, `deleted`. Not field edits. | Hard delete is the worst blind spot; field history is a separate, larger feature |
| D2 | The status change and its audit record are written in **one database transaction**; if the audit insert fails, the change fails. | Same PostgreSQL instance, so an audit outage means the database is already unhealthy: atomicity costs no real availability and removes the silent-gap risk. Recovery's best-effort pattern is noted as debt, not copied |
| D3 | No free text in any record: for notes store only `notesChanged: true`; for staff-made `created` store only the initial status, never a snapshot. | Data minimisation. Complaints and inquiries hold personal data, and an append-only log cannot be corrected afterwards |
| D4 | Read access: manager and above, through one endpoint that accepts only these five entity types. | Matches the existing needs-form audit endpoints; the whitelist stops it becoming a window onto other logs |
| D5 | Build one new shared timeline component. Do **not** touch the WASH/Recovery/Winterization timelines. | Avoids regressions in working code (AC19). Migrating them is a later, optional change |
| D6 | Testimonial `/verify` is out of scope. | It is a separate flag, confirmed in the code |
| D7 | Keep records indefinitely, no cleanup job. | A retention rule for personal data is a policy decision, tracked under the open PII item in §17 |
| D8 | Ship in **3 PRs**: (1) specs + foundation + complaint/inquiry, (2) procurement/vacancy/testimonial, (3) UI + docs. | The riskiest backend part is isolated in PR 2; the log is write-only until the UI lands, so no feature flag is needed; every PR reverts cleanly. Specs travel with the code they describe |
| D9 | The actor comes only from the authenticated token on the server, never from the request body. | Prevents forging who made a change |
| D10 | The log is append-only: no API to edit or delete entries. | Evidence value |
| D11 | The old status is read under a row lock inside the transaction. | Makes AC22 true under concurrent edits |
| D13 | Public (anonymous) create routes are **not modified**. No `created` record for them. | Their `created` record would add almost no evidence (the row already has `createdAt` and its initial status), would couple a citizen's submission to an auxiliary write, and would let spam grow an unbounded table. Priority: operability |
| D12 | Each record stores the request correlation id. | Lets an entry be traced to the application logs without storing IPs or other personal data |

## 10. Risks to settle in the plan

- Missing a path: tests must call every one of the 13 routes (AC1).
- `FOR UPDATE` plus a join fails in PostgreSQL: procurement loads `createdBy` with its record, so the lock must be scoped to one table. Only a test on real PostgreSQL catches this.
- Five services change signature to receive the actor; callers and specs must be updated together.
- The existing audit service must be usable from the five modules without a circular import with the needs module.
- The shared table is named after «needs forms» but will hold other entities. Renaming is not worth the migration risk; the plan documents it instead.
- Complaint/inquiry history must stay free of personal data (AC8, D3).
