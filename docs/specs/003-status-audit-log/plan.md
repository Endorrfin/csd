# 003 — Plan

Spec: [spec.md](./spec.md). Decisions D1–D12 are fixed; this plan only says how.

## 1. Architecture

**Audit at the service layer, not the controller.** All 13 status-changing routes call one of two
service methods per module (`update`, `updateStatus`), so instrumenting the services covers every route,
including the legacy `/publish`, `/approve`, `/reject` wrappers (AC1). Controllers only forward the actor.

```
Controller (resolveActor from JWT, D9)
   └─ Service.update / updateStatus / create / remove   (actor: AuditActor)
         └─ dataSource.transaction(manager =>
               lock row (pessimistic_write, D11) → read old status
               write entity → if status differs: audit.logStatusChange(..., manager)   (D2)
            )
Read: AuditController  GET /api/audit-log/:entityType/:entityId  → NeedsAuditLogService.findByEntity
```

No new table and no migration: `needs_form_audit_log` is already generic (`formType varchar(32)`,
`action varchar(20)`, `metadata jsonb`, index on `(formType, formId)`, no FK). Rollback is a plain revert.

## 2. Backend design

### 2.1 Standalone `AuditModule` (decided while implementing PR 1)
- New `backend/src/modules/audit/audit.module.ts` registers `NeedsFormAuditLog` and provides/exports a **new** `EntityAuditService`.
  It does **not** import `NeedsModule`, and `NeedsModule`, `NeedsAuditLogService`, `AuditLogService` and every Recovery/Winterization file
  are left byte-for-byte unchanged. This is safer than the first idea (moving `NeedsAuditLogService` into a shared module): AC19 holds
  trivially and there is no DI rewiring of working code.
- `audit/audit-actor.ts` exports `requireActor(req)`: builds the actor only from the verified JWT and **throws** if there is none, so a
  mis-wired staff route cannot write an anonymous entry (D9). `needs.controller.ts` keeps its own local `resolveActor`.
- `audit/audit-entity-types.ts`: `AUDITED_ENTITY_TYPES = ['procurement','vacancy','testimonial','complaint','inquiry'] as const`.

### 2.2 `EntityAuditService` (new)
- `recordCreated`, `recordStatusChange`, `recordNotesChanged`, `recordDeleted`: each takes the caller's `EntityManager` as a **required first
  argument**, so a call outside a transaction does not compile (D2). Metadata keys are limited to `requestId`, `status`, `notesChanged` (D3, D12).
- A notes-only change is stored as `action='updated'`, `fieldName='managerNotes'`, flag only. A status change plus a notes change is one
  `status_changed` entry carrying `notesChanged: true` (AC3, AC8).
- `findByEntity(type, id, limit)`: newest first, default 100, clamped to 500 in the service as well as validated in the DTO.
- `toEntryDto` maps a row to the API shape: no user id, no user relation, no raw metadata, `requestId` never leaves the server.

### 2.3 Read endpoint (AC11–AC15)
- `GET /api/audit-log/:entityType/:entityId?limit=` , `JwtAuthGuard + RolesGuard`, `@Roles(MANAGER, ADMIN, SUPER_ADMIN)`
  (a guard without the decorator is a no-op).
- `entityType` validated against the whitelist (400 otherwise); `entityId` `ParseUUIDPipe`.
- `limit`: reuse `AuditLogQueryDto` semantics with a **default of 100** and max 500 (AC15).
- Response is a mapped DTO: `{ id, action, oldValue, newValue, changedByEmail, createdAt, metadata }`.
  Never the raw entity, never the `changedBy` relation or user id.
- Unknown or deleted id returns the rows that exist, or `[]`, never 404 (AC12, AC13).

### 2.4 Per-module changes
Each module follows the same shape. `ENTITY_TYPE` constant per module.

| Module | `create` | `update` (incl. PATCH `:id`, publish, approve, reject) | `updateStatus` | `remove` |
| --- | --- | --- | --- | --- |
| complaint | **unchanged** (public, D13) | log if `dto.status` differs; `notesChanged` flag | log; notes flag | `deleted` with last status |
| inquiry | **unchanged** (public, D13) | n/a (no update route) | log; notes flag | `deleted` |
| testimonial | **unchanged** (public, D13) | log if `dto.status` differs (covers approve/reject) | log; notes flag | `deleted` |
| procurement | staff: `created` with actor | log if status differs (covers publish) | log | `deleted` |
| vacancy | staff: `created` with actor | log if status differs (covers publish) | log | `deleted` |

Rules applied everywhere:
- Compare old vs new inside the transaction under `FOR UPDATE`; no record when equal (AC2); one record per call (AC3).
- Side effects (`publicationDate`, `publishedAt`, testimonial approval timestamps) stay in the same write, not logged (AC7).
- `metadata` never contains text from the entity: `{ requestId, notesChanged? }` for changes, `{ requestId }` for create/delete (D3).
- Public `create` routes are not touched at all (D13); their controllers and services keep their current code path.
- Row lock is scoped to the entity's own table (`lock: { mode: 'pessimistic_write', onTables: [...] }`), because procurement loads `createdBy` and PostgreSQL rejects `FOR UPDATE` across a nullable outer join. The e2e flow for procurement exists specifically to prove this.
- Controllers add `@Req() req` and pass `resolveActor(req)`; services take `actor: AuditActor` as a required parameter
  so a missed call site fails to compile instead of silently skipping the log.
- `requestId` comes from the existing request-id helper (`common/logger/request-id.ts`); the plan task confirms
  the exact accessor before use.

## 3. UI design
- `ui/src/app/shared/components/audit-timeline/audit-timeline.ts`: standalone, signals, `inject()`.
  Inputs: `entityType`, `entityId`. (The first plan also had a `statusLabelPrefix` input; it was dropped because the prefix is always `<entityType>.status.`, which removes a way to pass a wrong prefix.)
- Fetches through `ApiService` in the browser only (admin pages are client-guarded; no `localStorage` use added).
- Language via `LanguageService`; never `translate.currentLang`. Dates via the existing `DatePipe` pattern.
- Renders action, `old → new` using the entity's existing status labels, actor email or «Public submission», timestamp.
  All values rendered through interpolation, never `innerHTML`.
- Empty state text states history exists only from the release date (AC17).
- A failed or slow request is contained: the component shows its own error with a retry and never throws into the host page (AC23).
- Integrated into: `complaint-drawer`, `inquiry-drawer`, and the procurement/vacancy/testimonial admin edit views.
- New i18n keys added to both `ua.json` and `en.json`; no hardcoded `isUa ? … : …`.
- The WASH/Recovery/Winterization timelines are not modified (D5).

## 4. Tests
- **Unit (Jest), per module** with mocked repo/manager: status change logs once (AC1); same status logs nothing (AC2);
  notes-only change logs `notesChanged` without text (AC8); delete logs `deleted` (AC6); audit insert throws → operation rejects and
  entity not saved (AC9); every route-level wrapper (`publish`, `approve`, `reject`) reaches the logging path (AC1).
- **Unit** for `AuditController`: whitelist 400, mapped DTO has no user id, default limit applied.
- **E2E (Testcontainers, `postgres:16-alpine`)**: one real flow per two entities (complaint anonymous create → staff status change →
  history read newest first → close → delete → history still readable, AC4/AC6/AC12); role matrix 401/403 (AC14); concurrent
  status changes yield consistent old values (AC22). Stay inside existing e2e conventions.
- **UI (Vitest)**: component renders entries, empty state, and both languages. Playwright is not extended: its stub API cannot
  exercise admin auth (suite cap of 12 tests is untouched).

## 5. Delivery: 4 PRs (D8)

The first plan said 3 PRs. PR 1 was merged early with only the specs and the foundation, so the work now ships as 4.

| PR | Content | State | Behaviour visible to users |
| --- | --- | --- | --- |
| **PR 1** | specs, `audit` module, read endpoint, `EntityAuditService`, tests | merged (#207) | none (endpoint returns `[]`) |
| **PR 2** | complaint + inquiry staff-side write path (`update`/`updateStatus`/`remove`), tests | in review | none until PR 4 |
| **PR 3** | procurement + vacancy + testimonial staff-side write path, tests (the lock/join case lives here) | next | none until PR 4 |
| **PR 4** | `audit-timeline` component, five integrations, i18n, `ARCHITECTURE.md` (describe the log, remove the §17 debt item, fix the module count) | planned | history visible |

Order is strict: PR 1 → PR 2 → PR 3 → PR 4. PR 2 pilots the pattern on the two modules without joins or publication side effects;
PR 3 repeats it where the risk is higher. The deploy pipeline already deploys the backend before the frontend. Each PR passes the
release gate in §8.2 before merge (`verify`, `test:e2e`, staging check). The user creates branches and commits; a branch name and
commit message are proposed per PR.

## 6. Risks and mitigations
- **A route is missed** → required `actor` parameter (compile error) + one test per wrapper route.
- **Row lock contention** → locks are per record and held for one short transaction; staff volume is low.
- **Cycle between `NeedsModule` and the five modules** → the dedicated `AuditModule` removes it.
- **Public create** → deliberately untouched (D13), so no new failure mode and no spam amplification.
- **Wrong old value under races** → `FOR UPDATE` (D11) with the e2e concurrency test.
- **Docs drift** → P4 re-derives counts from the code instead of copying them.
- **Legacy routes later removed** → they only delegate, so removing them needs no audit change.

## 7. Out of scope reminders
Field-level history, back-fill, search/export of the log, retention job, migrating the other timelines, status-transition rules.

## 8. Test strategy and release gate

Safety and operability come first, so testing is a gate, not a step. A slice is not merged until every item for it is green.

### 8.1 Layers
1. **Unit (Jest, mocked repos).** Logic per module: AC1, AC2, AC3, AC6, AC7, AC8, AC9. Including: audit insert throws → entity not saved and the call rejects; notes text never reaches `metadata`.
2. **Integration/e2e on real PostgreSQL 16 (Testcontainers).** Unit tests with mocks cannot see SQL behaviour, so these carry the weight:
   - every one of the 13 routes (including `/publish`, `/approve`, `/reject`) produces exactly one record when the status really changes and none when it does not (AC1, AC2);
   - procurement status change succeeds with the row lock despite the `createdBy` join (the §2.4 risk);
   - atomicity: force the audit insert to fail inside the transaction and prove the status is unchanged in the database (AC9);
   - concurrency: two simultaneous changes on one record, assert the recorded old values form a consistent chain (AC22);
   - delete: `deleted` row survives and is readable by id afterwards (AC6, AC12);
   - read limits: default 100, maximum enforced, over-limit rejected (AC15).
3. **Security tests.**
   - role matrix on the history endpoint: unauthenticated 401; `public`, `donor` 403; `manager`, `admin`, `super_admin` 200 (AC14, AC24);
   - `entityType` outside the whitelist (including `recovery`, `wash`, `../x`) → 400;
   - non-UUID `entityId` → 400;
   - response contains no user id and no `changedBy` relation;
   - request bodies carrying `changedByEmail`, `changedById` or `actor` are rejected by validation (`forbidNonWhitelisted`), proving D9;
   - there is no route that updates or deletes an audit row (D10), asserted by a route-table test;
   - stored `metadata` is checked to hold only the allowed keys.
4. **Regression.** Whole backend `verify` and `test:e2e` stay green; the Recovery and Winterization audit specs are not edited; the application **boots** in e2e after the module extraction (catches missing providers that `nest build` cannot).
5. **UI (Vitest + manual).** Component spec: entries, empty state, error/retry state, both languages. Manual matrix: 5 views × UA/EN × manager/admin, plus a blocked-request simulation to confirm only the History section degrades (AC23).
6. **Public routes untouched (D13).** A test asserts that the anonymous complaint, inquiry and testimonial `POST` flows behave as before and write no audit row.

### 8.2 Release gate per slice
1. `npm run verify` in every touched app, then `npm run test:e2e` in `backend`; both green on a clean checkout.
2. Push the same commit to a `staging/<name>` branch (triggers `deploy-staging.yml`; the staging database is stopped nightly, so start it first if needed) and run the manual checklist below against staging.
3. Only then merge to `main`; production deploys through the normal pipeline.
4. After the production deploy, repeat the short smoke checklist. The pipeline's own smoke test only calls `/api/health` and greps the SSR page, so it cannot see a broken status change.

### 8.3 Manual checklist (staging, then production smoke)
- For each of the five entities: change a status through the admin UI, confirm it saved, confirm it appears in History with the right actor and time.
- Complaint/inquiry: change only the notes, confirm a record with no note text.
- Procurement and vacancy: publish via the status control (and the legacy publish path if still reachable); one record each.
- Delete an eligible record; confirm its history is still retrievable by id.
- Sign in with a lower role if one is available; confirm the history endpoint refuses.
- Submit one public complaint, inquiry and testimonial on staging; confirm they still succeed and create no audit rows.
- Watch the Lambda logs for errors during the run.

### 8.4 Rollback
No migration, so rollback is `git revert` of the slice and a normal deploy. Existing audit rows stay and are harmless. A slice that fails on staging is not merged.
