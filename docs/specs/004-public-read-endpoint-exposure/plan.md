# 004 — Plan

Spec: [spec.md](./spec.md). Decisions D1–D6 fixed; questions resolved (spec §7).

## Rollout (D6, expand → switch → contract)

| PR | Content | Public behaviour change |
| --- | --- | --- |
| **A** | Backend: guarded `GET admin/:id` ×3; testimonial create DTO drops `status` and `managerNotes`; e2e that proves the leak and the new route | none for the public site (public `GET :id` still unchanged); closes AC9 |
| **B** | UI: the three admin forms read `admin/:id` | none |
| **C** | Backend: public `GET :id` becomes status-filtered and allow-listed; flip the `it.failing` tests to `it` | drafts and staff fields disappear from public responses |

Order is strict. Tightening before B would break the admin edit forms for drafts during the deploy window (backend deploys before frontend).

## PR A design

- Service: `findByIdForAdmin(id)` per module = `findOne({ where: { id } })` **without relations**, so no `createdBy` object is loaded (procurement's public `findById` still joins it until PR C).
- Controller: `@Get('admin/:id')` declared **after** `admin/list` (otherwise `list` would hit `admin/:id` and fail UUID validation), `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(MANAGER, ADMIN, SUPER_ADMIN)`, `ParseUUIDPipe`.
- Testimonial: `CreateTestimonialDto` loses `status` and `managerNotes`. `UpdateTestimonialDto` no longer inherits them, so it declares `status`, `managerNotes` and `isVerified` itself; `PATCH :id` keeps accepting the same body as before.
- `publishedAt` stays in the public DTO (D4).

## Tests

`test/public-read-exposure.e2e-spec.ts` on real PostgreSQL:
- AC5/AC6: `admin/:id` returns the full record for draft/pending items; 401 unauthenticated, 403 for `public` and `donor`; no `createdBy` object, no email anywhere in the body.
- AC9: `POST /testimonials` with `managerNotes` or `status` → 400 and nothing stored; a normal submit still 201.
- **Leak proofs** (AC1–AC4): written as the final assertions and marked `it.failing`, so they pass **today because the leak exists** and turn red the moment someone fixes it, forcing PR C to flip them to `it`. Before marking them, they are run once as plain `it` to read the real failures (proof that each fails for the right reason, not a setup error).
- PR C flips them; PR A's regression gate is that they still fail.

## Risks

- `it.failing` can hide a wrong-reason failure: mitigated by the one-off plain run.
- A new `GET admin/:id` route must not shadow `GET admin/list`: covered by the existing list tests plus a route-order assertion.
