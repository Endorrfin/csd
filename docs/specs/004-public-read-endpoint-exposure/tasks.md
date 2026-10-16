# 004 — Tasks

## PR A — backend: admin route, DTO split, leak proofs
- [x] A1 Run the leak tests as plain `it` once; record the real failures (AC1–AC4). **Result, on the real app:** draft procurement and draft vacancy answered 200; a published procurement returned the `createdBy` object including the creator's email; a pending testimonial answered 200; an approved testimonial returned `managerNotes`; `POST /testimonials` accepted `managerNotes` and `status` (201)
- [x] A2 `findByIdForAdmin` + guarded `GET admin/:id` in procurement, vacancy, testimonial (AC5, AC6)
- [x] A3 Testimonial DTO split: create loses `status`/`managerNotes`, update declares its own (AC9, D4)
- [x] A4 `test/public-read-exposure.e2e-spec.ts`: AC5, AC6, AC9 as normal tests; AC1–AC4 as `it.failing`
- [x] A5 Unit tests for the new service methods
- [x] A6 Mutation checks: remove the guard, move `admin/:id` before `admin/list`, restore `managerNotes` to the create DTO — each must fail a test
- [x] A7a `npm run verify` (284 unit tests) and `npm run test:e2e` (5 suites, 101 tests) green
- [ ] A7b staging check; production smoke

## PR B — ui: admin forms use `admin/:id`
- [ ] B1 `procurement-form.ts`, `vacancy-form.ts`, `testimonial-edit.ts` call `admin/<id>`; public detail pages unchanged (AC7, AC8)
- [ ] B2 Verify drafts still open in all three forms on staging

## PR C — backend: tighten the public route
- [ ] C1 Public `GET :id`: 404 for draft / non-approved (D2), allow-listed fields (D3, D5)
- [ ] C2 Flip the `it.failing` tests to `it` (AC1–AC4, AC10)
- [ ] C3 Route-table test: no unguarded `GET /:id` returns staff fields (AC12)
- [ ] C4 Re-grep the whole repo for other consumers of the public `GET :id` before merging
- [ ] C5 `ARCHITECTURE.md`: document the split; derive counts; set spec Status to Implemented
