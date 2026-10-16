# 003 — Tasks

Three PRs (see plan §5). Task numbers keep their original T1–T4 prefixes; commit order inside a PR follows the listing. Tick when done. AC references are to spec.md.

- **PR 1** = specs + sections P1 and P2
- **PR 2** = section P3
- **PR 3** = section P4

## PR 1 · part 1 — Foundation (no visible change)
- [x] T0 Specs written: `spec.md`, `plan.md`, `tasks.md` (first commit of PR 1)
- [x] T1.1 Create standalone `AuditModule` with a new `EntityAuditService`; `NeedsModule` and the Recovery/Winterization code stay untouched (AC19)
- [x] T1.2 `audit-actor.ts` with `requireActor(req)` (throws without an authenticated user, D9); `needs.controller.ts` untouched
- [x] T1.3 `record*` methods with a required `EntityManager`; `findByEntity(type, id, limit)`; `toEntryDto`
- [x] T1.4 `AuditController` GET `/api/audit-log/:entityType/:entityId` with whitelist, roles, mapped DTO, default limit 100 (AC11–AC15)
- [x] T1.5 `resolveRequestId()` from `common/logger/request-id.ts` stored as `metadata.requestId` (D12); never returned by the API
- [x] T1.6 Unit tests for controller/service; e2e: role matrix (401, public/donor 403, manager/admin/super_admin 200), whitelist and UUID rejection, no user id in response, no write routes (AC14, AC24, D9, D10)
- [x] T1.7 `npm run verify` + `npm run test:e2e` in `backend`; existing Recovery/Winterization specs unchanged and green; the app boots in e2e after the module extraction

## PR 1 · part 2 — Complaint + inquiry
- [x] T2.1 Complaint: actor param on `create/update/updateStatus/remove`; transaction + row lock; log created/status/deleted; notes flag (AC1–AC9, AC22)
- [x] T2.2 Complaint controller passes `resolveActor(req)` on staff routes only; public `POST` is left byte-for-byte as is (AC4, D13)
- [x] T2.3 Inquiry: same for `updateStatus/remove`; public `POST` untouched
- [x] T2.4 Unit tests per D2/D3 cases for both modules
- [x] T2.5 E2E on real PostgreSQL (mutation-checked: removing the row lock, or swallowing audit errors, makes the tests fail): seed record → status change → notes-only change → read → delete → read; concurrency; forced audit failure leaves status unchanged; public POST creates no audit row (AC4, AC6, AC9, AC12, AC22)
- [ ] T2.6 `npm run verify` + `npm run test:e2e`; staging check (plan §8.2–8.3); production smoke after deploy

## PR 2 — Procurement, vacancy, testimonial
- [ ] T3.1 Procurement: actor param, transaction, row lock scoped to the procurement table (not across the `createdBy` join), logging; `publish` wrapper covered (AC1, AC5)
- [ ] T3.2 Vacancy: same, `publish` wrapper covered
- [ ] T3.3 Testimonial: staff routes only (`update`/`updateStatus`/`remove`); `approve` / `reject` / `PATCH :id` / `status` all covered; `verify` and public `POST` untouched (D6, D13)
- [ ] T3.4 One test per legacy wrapper route proving it reaches the log
- [ ] T3.5 E2E on real PostgreSQL: procurement create → publish → status → delete (proves the lock/join case), vacancy and testimonial flows, all 13 routes covered
- [ ] T3.6 `npm run verify` + `npm run test:e2e`; staging check (plan §8.2–8.3); production smoke after deploy

## PR 3 — UI + docs
- [ ] T4.1 `audit-timeline` shared component (signals, `LanguageService`, `ApiService`, no `innerHTML`) (AC16–AC18)
- [ ] T4.2 i18n keys in `ua.json` and `en.json`
- [ ] T4.3 Integrate into complaint drawer, inquiry drawer, procurement / vacancy / testimonial admin edit views
- [ ] T4.4 Vitest spec for the component (entries, empty state, error/retry, both languages) (AC17, AC18, AC23)
- [ ] T4.5 `ARCHITECTURE.md`: describe the log and the endpoint; delete the §17 debt item; re-derive any counts from code (AC21)
- [ ] T4.6 `npm run verify` in `ui`; manual matrix 5 views × UA/EN × manager/admin; blocked-request simulation; staging check; production smoke
- [ ] T4.7 Walk the AC table against the diff; set spec Status to Implemented
