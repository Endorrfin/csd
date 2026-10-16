# 004 — Public `GET :id` endpoints expose drafts and staff data

| Field | Value |
| --- | --- |
| Status | Decisions resolved; PR A in progress |
| Origin | Found while verifying spec 003 (a procurement fetched with `relations: ['createdBy']`) |
| App | `backend` first, then `ui` (three admin forms) |
| Kind | Security fix (information disclosure) |

## 1. Problem

Three modules expose `GET /api/<module>/:id` with **no guard and no status filter**:
`procurement`, `vacancy`, `testimonial`. Anyone who knows or obtains a record's UUID can read it, whatever its state.

| Endpoint | What an anonymous caller gets today (from the code) |
| --- | --- |
| `GET /api/procurement/:id` | **Drafts** (the public list hides them, this does not) and the joined `createdBy` user: `id`, `email`, `firstName`, `lastName`, `role` |
| `GET /api/vacancies/:id` | **Drafts**, and `createdById` |
| `GET /api/testimonials/:id` | **Pending and rejected** submissions (unmoderated text, names, photos, location), `managerNotes` (internal staff notes), `createdById` |

Secrets are not exposed: `passwordHash`, `resetToken` and `resetTokenExpiry` are `select: false`. UUIDs are unguessable, which lowers the likelihood but is not an access control: an id can leak through a shared link, a log, a referrer or a browser history.

A related defect in the same class: the **public** `POST /api/testimonials` DTO accepts `managerNotes` (and `status`, `publishedAt`), and the service overwrites only some of them, so an anonymous visitor can write a staff-only field.

> Not yet reproduced by a running test. The table is derived from the code. Verification step 1 of the plan is a failing e2e test that proves each row before anything is changed.

## 2. Current state (verified in code)

- The three controllers' `@Get(':id')` carry no `@UseGuards`; `findById` filters nothing but `id`. Procurement's `findById` loads `relations: ['createdBy']`.
- `GET :id` is used by **two different audiences with the same route**:
  - public detail pages: `vacancy-detail.ts:187`, `procurement-detail.ts:470`;
  - admin edit forms: `procurement-form.ts:1129`, `vacancy-form.ts:368`, `testimonial-edit.ts:479`.
- Testimonial `GET :id` has **no public consumer** in the UI; only the admin edit page calls it.
- `complaint` and `inquiry` `GET :id` are already guarded (manager/admin); blog, content, partners and cooperation expose only published content by design.

## 3. Goals

- G1. An anonymous caller can read only what the public site shows: published/non-draft procurements and vacancies, approved testimonials.
- G2. A public response never contains staff data (`createdBy`, `createdById`, `managerNotes`).
- G3. Staff keep full access for editing through a guarded route.
- G4. Anonymous visitors cannot write staff-only fields through the public create route.
- G5. Rollout cannot break the admin edit forms or the public detail pages at any point.

## 4. Non-goals

- Rate limiting and Turnstile on public routes (separate debt).
- Changing what the public **lists** return.
- Complaint, inquiry, blog, content, partners, cooperation (reviewed, already correct).
- A general serializer/DTO layer for all responses.

## 5. Acceptance criteria

| ID | Given | When | Then |
| --- | --- | --- | --- |
| AC1 | A draft procurement or vacancy | Anonymous `GET /:id` | 404 (not 403, so existence is not revealed) |
| AC2 | A non-draft procurement or vacancy | Anonymous `GET /:id` | 200; no `createdBy`, no `createdById` in the body |
| AC3 | A pending or rejected testimonial | Anonymous `GET /:id` | 404 |
| AC4 | An approved testimonial | Anonymous `GET /:id` | 200 without `managerNotes`, `createdBy`, `createdById` |
| AC5 | Manager, admin or super_admin | `GET /admin/:id` for any record in any status | 200 with the full record (the fields the edit forms need) |
| AC6 | Unauthenticated, `public` or `donor` role | `GET /admin/:id` | 401 / 403 |
| AC7 | The three admin edit forms | Open an existing record | They load it through the guarded route and behave as before, for drafts too |
| AC8 | The public vacancy and procurement detail pages | Open a published record | Unchanged |
| AC9 | Anonymous `POST /api/testimonials` with `managerNotes` or `status` in the body | Submitted | 400 (rejected by validation, decision D4); nothing is stored |
| AC10 | A record's `GET /:id` response shape for staff and public | Compared in tests | Public shape is a strict subset of the admin shape |
| AC11 | The change ships | `verify`, backend e2e and Playwright run | All pass; new e2e tests cover AC1–AC6, AC9 on real PostgreSQL |
| AC12 | The route table is inspected in a test | Any `GET /:id` that returns staff fields | It is guarded; asserted by a test so a new route cannot regress it |

## 6. Decisions (proposed defaults; security first)

| ID | Decision | Why |
| --- | --- | --- |
| D1 | Add a guarded `GET /admin/:id` to the three modules; the existing `GET /:id` stays public but becomes status-filtered and sanitised. | The two audiences need different data; one route cannot serve both safely |
| D2 | Not-found and not-visible both return **404**. | A 403 would confirm that a draft exists |
| D3 | Public responses are built by an explicit allow-list of fields, not by deleting a few. | A column added later must not become public by default |
| D4 | The public testimonial create DTO drops `status` and `managerNotes` (validation rejects them). Staff update keeps them. **`publishedAt` stays accepted**: the public form sends it (`testimonial-form.ts`, a date input) and the service already overwrites it with `null`, so removing it from the DTO would make the form answer 400 for anyone who fills the date. The silently ignored date input is UI debt, not part of this fix. | `forbidNonWhitelisted` already returns 400 for unknown fields, so removing them from the public DTO is enough; no silent ignore |
| D5 | Public testimonial `GET /:id` returns approved records only (it has no public consumer today, so this changes no screen). Alternative: guard it entirely. | Least exposure with no UI impact |
| D6 | Roll out as **expand → switch → contract**: PR A adds `GET /admin/:id` and the filtered public route is **not** tightened yet; PR B switches the three admin forms to the new route; PR C tightens the public route. | The backend deploys before the frontend, so tightening first would break the admin edit forms for drafts during the deploy window |

## 7. Resolved questions

1. D5: approved-only public route (testimonial `GET /:id` has no public consumer today). Accepted.
2. Procurement `GET /admin/:id`: **no `createdBy` object at all**, only `createdById`. The UI does not read `createdBy` anywhere (checked), so the default of returning names was more than needed. Stricter than the first proposal.
3. Rollout: 3 PRs (expand → switch → contract). Accepted.

## 8. Risks

- Missing a consumer of `GET /:id` (mobile, scripts, bookmarks): only the five UI callers above were found; the plan must grep the whole repo again before PR C.
- A published record becoming a draft again would disappear from its public link: intended, but worth noting for editors.
- The audit-log endpoint (spec 003) is unaffected: it is already guarded and has no `createdBy` join.
