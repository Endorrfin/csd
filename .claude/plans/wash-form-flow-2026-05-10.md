# WASH form — full data flow trace

## Context
You asked for an end-to-end explanation of how WASH form data moves from the Angular reactive form, through Nest DTOs/controller/service, into Postgres, and out via the bilingual UA/EN export. This is a **read-only trace** — no code is modified.

## Three deviations from the framing (confirmed against code)
1. **The form is 8 steps, not 7.** Defined in `ui/src/app/features/needs/wash-form/wash-form.ts` lines 2029–2046: `general → object → borehole → tower → purification → pumps → equipment → review`.
2. **The export is XLSX, not CSV.** WASH export is built with ExcelJS in `backend/src/modules/needs/xlsx-export.service.ts` (6 sheets). The only CSV exporter in the repo is the unrelated `complaint` module. Migration comments reference a historical one-off CSV dump done before the schema rewrite, not a current code path.
3. **There are no JSONB "optional blocks" on WASH anymore.** Migration `backend/src/database/migrations/1777300000000-RestructureWashForms.ts` replaced legacy single-object JSONB columns with normalized child tables. `wash-form.entity.ts:95` explicitly notes *"jsonb fields replaced with OneToMany relations."* The only JSONB column remaining in the needs module is `wash_form_audit_log.metadata` (audit diffs).

The trace below describes **what the code currently does**, not the legacy JSONB/CSV design.

---

## 1. Frontend — Angular reactive form

### Host & routing
- `ui/src/app/app.routes.ts` (line 73-77) — top-level routing, redirects `/wash-form` → `/needs/wash-form`.
- `ui/src/app/features/needs/needs.routes.ts` — child routes; lazy-loads `WashFormComponent`.
- `ui/src/app/features/needs/needs.ts` — `NeedsComponent` shell with tabs (WASH / Recovery / Shelters).

### The 8-step form (single component)
- `ui/src/app/features/needs/wash-form/wash-form.ts` (~2,800 lines) — all 8 steps live in one standalone component:
  - Step list at lines 2029–2046 (key, UA/EN labels, group, optional flag, icon).
  - Step-validation map at lines 2327–2336 (`stepFields`).
  - `currentStep()` / `submitted()` / `submitting()` / `stepInvalid()` signals (~2983 onward).
  - `nextStep()`, `prevStep()`, `skipStep()`, `goToStep()`, `validateCurrentStep()`.

### FormBuilder shape
Defined inline at lines 2056–2169 in the same file:
- Step 0 (general): `location` (LocationValue), `organizationName`, `headName`, `headPhoneDigits` (10-digit pattern), `email`.
- Step 1 (object): `objectName`, `dependentPopulation`, `socialFacilities`, `installationDeadline`, `replacementReason`.
- Step 2 (boreholes): `FormArray<FormGroup>` via `createBoreholeGroup()` (lines 2109–2124).
- Step 3 (towers): `FormArray` via `createTowerGroup()` (2127–2139).
- Step 4 (purifications): `FormArray` via `createPurificationGroup()` (2141–2151).
- Step 5 (pumps): `FormArray` via `createPumpGroup()` (2154–2169).
- Step 6 (equipment): NOT a FormArray — a `selectedEquipment` signal `Map<itemId, {quantity, notes}>` (line 2014).
- Step 7 (review): read-only summary, no controls.

### Frontend services & supporting code
- `ui/src/app/core/services/api.service.ts` — thin wrapper around HttpClient (`get/post/patch/delete`), base URL `${environment.apiUrl}/api`.
- `ui/src/environments/environment.ts` — `apiUrl: 'http://localhost:3000'`.
- `ui/src/app/shared/components/location-selector/location-selector.ts` — `ControlValueAccessor` exposing region → district → community → settlement; emits `LocationValue`.
- `ui/src/app/shared/services/location.service.ts` — hierarchical location data source.
- `@ngx-translate/core` — injected `TranslateService` for the `isUa` flag (used to pick UA vs EN labels at template level).

### DTOs / interfaces (TS)
- `ui/src/app/features/needs/wash-form/wash-form.interfaces.ts`:
  - `CreateWashFormPayload` (112–145) — flat shape POSTed to backend.
  - `UpdateWashFormFullPayload` (282) — `Partial<CreateWashFormPayload>` for admin edit.
  - Child payloads: `CreateBoreholePayload`, `CreateTowerPayload`, `CreatePurificationPayload`, `CreatePumpPayload`.
  - Read models: `WashFormDetail`, plus `*Full` variants with IDs.
  - Enums: `BoreholeWorkType`, `WaterTowerType`, `WaterTowerHeight`, `PumpPurpose`, `WashFormStatus`, `EquipmentUnit`.

### Submission HTTP call
In `wash-form.ts`:
- `buildPayload()` (2644–2767) — flattens `LocationValue` into `region/regionEn/.../settlementCode`, maps every FormArray to typed payload, pulls equipment items from the `selectedEquipment` Map.
- `onSubmit()` (2616–2641):
  - Create mode → `this.api.post('needs-forms/wash', payload)` → `POST http://localhost:3000/api/needs-forms/wash`.
  - Edit mode → emits `(saved)` event up to admin parent component, which then calls PATCH.

### Admin / edit-mode wrappers
- `ui/src/app/features/admin/wash-form-detail/wash-form-detail.ts` — wraps `WashFormComponent` with `mode='edit'`; on `(saved)` calls `PATCH /api/needs-forms/wash/:id/full`.
- `ui/src/app/features/admin/wash-forms-list/wash-forms-list.ts` — paginated list; triggers XLSX download.

### State / drafts
No localStorage, no NgRx, no draft persistence. Form state is ephemeral signals + reactive form. Equipment catalog is fetched once via `loadCatalog()` (2347–2357) on init.

### i18n
- `ui/src/assets/i18n/ua.json` and `ui/src/assets/i18n/en.json` — translation bundles (mostly nav/footer, only a handful of WASH-specific keys around `wash_form_pumps_*`).
- The form's labels are mostly hardcoded **bilingual ternaries** in the template: `{{ isUa ? 'Інфо' : 'Info' }}`. Helpers like `getBoreholeWorkTypeLabel`, `getTowerTypeLabel`, `getTowerHeightLabel`, `getPumpPurposeLabel` (lines 2405–2442) emit UA or EN strings based on `isUa`.

---

## 2. Backend — DTOs

All under `backend/src/modules/needs/dto/`:
- `create-wash-form.dto.ts` — `CreateWashFormDto`. Top-level scalars (location, org, contact, object) + nested arrays. Uses `class-validator` (`@IsString`, `@MinLength`, `@Matches /^\+380\d{9}$/`, `@IsEmail`, `@IsInt`, `@Min`, `@ValidateNested({ each: true })`, `@Type`).
- `update-wash-form.dto.ts` — `UpdateWashFormDto` (status + managerNotes only — quick edits).
- `update-wash-form-full.dto.ts` — `UpdateWashFormFullDto extends PartialType(CreateWashFormDto)` plus `status` and `managerNotes`. Child arrays use **replace semantics** (omit = leave alone; present = replace whole collection).
- `bulk-update-status.dto.ts` — `BulkUpdateStatusDto { ids: string[] (1–200 UUIDs); status }`.
- `audit-log-query.dto.ts` — `{ limit?: 1–500 }`.
- Per-section sub-DTOs (each holds the same fields as the corresponding entity, minus IDs):
  - `wash-form-borehole.dto.ts` — `CreateBoreholeDto` (workType enum, expectedFlowRate 7–50, conditional aquifer/depth/debit fields, sortOrder).
  - `wash-form-tower.dto.ts` — `CreateTowerDto` (towerType, towerHeight, customHeight ≥ 26 when `over_25`, foundation booleans, sortOrder).
  - `wash-form-purification.dto.ts` — `CreatePurificationDto` (six booleans + notes + sortOrder).
  - `wash-form-pump.dto.ts` — `CreatePumpDto` (purpose enum, optional brand/model/specs, quantity ≥ 1).
  - `wash-form-item.dto.ts` — `CreateWashFormItemDto` (equipmentItemId UUID, quantity, notes, sortOrder).

---

## 3. Backend — controller

`backend/src/modules/needs/needs.controller.ts` — `@Controller('needs-forms')`, class `NeedsFormsController`.

| Method | Path | Guards | Roles |
|---|---|---|---|
| POST | `/wash` | none | public/anonymous |
| GET | `/wash` | JwtAuthGuard, RolesGuard | MANAGER, ADMIN |
| **GET** | **`/wash/export-xlsx`** | **JwtAuthGuard, RolesGuard** | **MANAGER, ADMIN** |
| GET | `/wash/:id` | JwtAuthGuard, RolesGuard | MANAGER, ADMIN |
| GET | `/wash/:id/audit-log` | JwtAuthGuard, RolesGuard | MANAGER, ADMIN |
| PATCH | `/wash/:id` | JwtAuthGuard, RolesGuard | MANAGER, ADMIN |
| PATCH | `/wash/:id/full` | JwtAuthGuard, RolesGuard | MANAGER, ADMIN |
| PATCH | `/wash/bulk` | JwtAuthGuard, RolesGuard | MANAGER, ADMIN |
| DELETE | `/wash/:id` | JwtAuthGuard, RolesGuard | ADMIN |

`resolveActor(req)` (lines 42–49) yields `{ userId, email }` from JWT, or `{ null, null }` for anonymous POST.

Guards live in `backend/src/modules/auth/guards/{jwt-auth,roles}.guard.ts`. `@Roles()` decorator at `backend/src/modules/auth/decorators/roles.decorator.ts`. `UserRole` enum at `backend/src/modules/users/entities/user.entity.ts`.

---

## 4. Backend — `NeedsService`

`backend/src/modules/needs/needs.service.ts`. Repositories injected for `WashForm`, `WashFormItem`, `WashFormBorehole`, `WashFormTower`, `WashFormPurification`, `WashFormPump`. Plus `AuditLogService` and `DataSource`.

Methods:
- `create(dto, actor)` — calls `assertAtLeastOneSection()`, builds the parent + child arrays, saves with cascade, fires `auditLog.recordCreate()`.
- `findAll(opts)` — paginated list with eager relations; sortBy whitelist (`createdAt`, `organizationName`, `region`, `dependentPopulation`, `status`); date range; case-insensitive search.
- `findById(id)` — returns parent with eager-loaded children, sorts each child array by `sortOrder`.
- `update(id, dto, actor)` — quick status/notes update; computes per-field diffs and audits.
- `updateFull(id, dto, actor)` — full edit inside a `dataSource.transaction(...)`, replaces child collections when present, snapshots before/after for audit diffs.
- `bulkUpdateStatus(ids, status, actor)` — single SQL update; skips no-op rows; per-form audit entries after commit.
- `remove(id, actor)` — audits then deletes; cascades to all children.
- `getAuditLog(id)` — fetches audit trail after verifying form exists.
- Private: `toSnapshot(form)` flattens for diff; `assertAtLeastOneSection(dto)` throws 400 if no boreholes/towers/purifications/pumps/items.

Audit logger: `backend/src/modules/needs/audit-log.service.ts` (`AuditActor` interface, `diff()` static method, fire-and-forget logging).

---

## 5. Postgres — entities

All under `backend/src/modules/needs/entities/`, registered via `TypeOrmModule.forFeature([...])` in `needs.module.ts`. Datasource at `backend/src/database/data-source.ts`; runtime config via `TypeOrmModule.forRootAsync` in `backend/src/app.module.ts`.

### `wash-form.entity.ts` — table `wash_forms`
- PK `id: uuid`.
- Location columns: `region`, `regionEn`, `district`, `districtEn`, `community`, `communityEn`, `communityCode`, nullable `settlement`, `settlementEn`, `settlementCode`.
- Org/contact: `organizationName`, `headName`, `headPhone` (`+380XXXXXXXXX`), `email`.
- Object: `objectName`, `dependentPopulation: int`, `socialFacilities? text`, `installationDeadline? varchar`, `replacementReason: text`.
- `status`: enum `wash_forms_status_enum` (`new | in_review | approved | rejected | in_progress | completed`), default `new`.
- `managerNotes? text`. `createdAt`, `updatedAt` timestamps.
- OneToMany (cascade, eager): `boreholes`, `towers`, `purifications`, `pumps`, `items`. Plus `auditLog` (lazy).
- Comment at line 95 makes the JSONB → relations refactor explicit.

### Child tables (one file each in `entities/`)
- `wash-form-borehole.entity.ts` — `wash_form_boreholes`. `workType` enum, `expectedFlowRate int`, conditional aquifer/depth/debit/booleans/oldLocation, `notes`, `sortOrder`. Indexed `washFormId` FK with `ON DELETE CASCADE`.
- `wash-form-tower.entity.ts` — `wash_form_towers`. `towerType` & `towerHeight` enums, `customHeight?` (used when `over_25`), foundation booleans, `notes`, `sortOrder`.
- `wash-form-purification.entity.ts` — `wash_form_purifications`. Six booleans + `notes` + `sortOrder`.
- `wash-form-pump.entity.ts` — `wash_form_pumps`. `purpose` enum, `purposeOther`, optional brand/model/specs (numeric(10,2) for power/flow/head, numeric(5,2) for diameter), `quantity int`, `notes`, `sortOrder`.
- `wash-form-item.entity.ts` — `wash_form_items`. `equipmentItemId` FK to `equipment_items` (`ON DELETE RESTRICT`), `quantity numeric(10,2)`, `notes`, `sortOrder`. ManyToOne `equipmentItem` is eager and pulls in its `category`.

### `wash-form-audit-log.entity.ts` — table `wash_form_audit_log`
- The **only JSONB column** in the needs module: `metadata: jsonb? nullable` (line 63). Holds complex/nested diffs and create-snapshots.
- Plus `washFormId` FK, `changedById` (FK users `SET NULL`), `changedByEmail` snapshot, `action` enum (`created | updated | status_changed | deleted`), `fieldName?`, `oldValue? text`, `newValue? text`, `createdAt` (indexed).

### Migrations
- `backend/src/database/migrations/1777300000000-RestructureWashForms.ts` — the schema rewrite. Drops legacy `wash_forms` (with JSONB activity blocks) and `wash_form_items`, recreates the new `wash_forms` parent + 5 child tables + `wash_form_audit_log`, plus 6 enums. `down()` does **not** restore the legacy 9 forms (they were dumped to CSV manually pre-cutover — that's the only "WASH CSV" reference in the codebase).
- `backend/src/database/migrations/1777200000000-ExpandStatusEnums.ts` and `1777200000001-RemapLegacyClosedStatuses.ts` — adjacent migrations on procurement/vacancy enums, not WASH.

---

## 6. Bilingual UA/EN export (XLSX, not CSV)

`backend/src/modules/needs/xlsx-export.service.ts` — `XlsxExportService.buildWorkbook({ status?, region?, lang? })` returns an ExcelJS Buffer.

Trigger: `GET /needs-forms/wash/export-xlsx?lang=ua|en&status=…&region=…` → controller streams workbook with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, filename `wash-forms-YYYY-MM-DD.xlsx`.

Source data: TypeORM query against `WashForm` with eager relations (boreholes, towers, purifications, pumps, items → equipmentItem → category), filters `status` (eq) and `region` (ILIKE), order `createdAt DESC`.

Workbook layout (6 sheets, each with frozen header row, auto-filter, color-coded header band):
1. **Forms** (deep blue) — 1 row per form: scalars + child counts + manager notes.
2. **Boreholes** (cyan) — 1 row per borehole, includes `form_id` for cross-sheet VLOOKUP.
3. **Towers** (teal).
4. **Purifications** (blue).
5. **Pumps** (amber).
6. **Equipment** (violet) — 1 row per `wash_form_items` row, joined with `equipmentItem` + `equipmentCategory` for bilingual category/item names.

Headers are emitted as `"UA | EN"` strings (bilingual headers in every sheet); body cells switch to one language based on `lang` (UA-or-EN value).

Label dictionaries: `backend/src/modules/needs/xlsx-export.labels.ts`:
- `STATUS_LABELS`, `BOREHOLE_WORK_TYPE_LABELS`, `TOWER_TYPE_LABELS`, `PUMP_PURPOSE_LABELS`, `EQUIPMENT_UNIT_LABELS`.
- Helpers: `labelStatus`, `labelBoreholeWorkType`, `labelTowerType`, `labelTowerHeight` (handles `over_25` + `customHeight`), `labelPumpPurpose`, `labelEquipmentUnit`, `labelBool` (`Так/Ні` vs `Yes/No`, null-safe).
- Locality strings (region/district/community/settlement) come straight from the entity's UA and EN columns — no translation lookup needed.

---

## 7. Module wiring & DB config
- `backend/src/modules/needs/needs.module.ts` — imports `TypeOrmModule.forFeature([WashForm, WashFormItem, WashFormBorehole, WashFormTower, WashFormPurification, WashFormPump, WashFormAuditLog])`; controllers `[NeedsFormsController]`; providers `[NeedsService, AuditLogService, XlsxExportService]`.
- `backend/src/database/data-source.ts` — Postgres connection (env-driven), `migrationsTransactionMode: 'each'`, `synchronize: false`, SSL on in prod.
- `backend/src/app.module.ts` — registers `NeedsModule` and global TypeOrm async config.

---

## End-to-end summary (one paragraph)

A user opens `/needs/wash-form` (`ui/.../wash-form.ts`), fills 8 reactive-form steps backed by a single `FormGroup` with five child `FormArray`s plus an in-memory equipment Map, and submits. `onSubmit()` builds a flat `CreateWashFormPayload` (`wash-form.interfaces.ts`) and POSTs it to `/api/needs-forms/wash`. `NeedsFormsController.create()` (anonymous-allowed) hands the validated `CreateWashFormDto` to `NeedsService.create()`, which asserts at least one section, persists the parent `wash_forms` row plus children in five normalized tables (no JSONB blocks anymore — that's a legacy concept), and fire-and-forget records an audit-log entry whose `metadata` is the only remaining JSONB column. Admin users later list/edit forms (PATCH `/wash/:id/full` runs in a transaction with replace-semantics for child arrays) or hit `GET /wash/export-xlsx?lang=ua|en` — `XlsxExportService` queries the data with eager relations and emits a 6-sheet ExcelJS workbook with bilingual `UA | EN` headers and language-switched body cells, mapped via the label tables in `xlsx-export.labels.ts`.

---

## Key file index (grouped by layer)

**Frontend host & routing**
- `ui/src/app/app.routes.ts`
- `ui/src/app/features/needs/needs.routes.ts`
- `ui/src/app/features/needs/needs.ts`

**Frontend form**
- `ui/src/app/features/needs/wash-form/wash-form.ts`
- `ui/src/app/features/needs/wash-form/wash-form.interfaces.ts`
- `ui/src/app/features/admin/wash-form-detail/wash-form-detail.ts`
- `ui/src/app/features/admin/wash-forms-list/wash-forms-list.ts`

**Frontend support**
- `ui/src/app/core/services/api.service.ts`
- `ui/src/app/shared/components/location-selector/location-selector.ts`
- `ui/src/app/shared/services/location.service.ts`
- `ui/src/environments/environment.ts`
- `ui/src/assets/i18n/ua.json`, `ui/src/assets/i18n/en.json`

**Backend controller / DTOs**
- `backend/src/modules/needs/needs.controller.ts`
- `backend/src/modules/needs/dto/create-wash-form.dto.ts`
- `backend/src/modules/needs/dto/update-wash-form.dto.ts`
- `backend/src/modules/needs/dto/update-wash-form-full.dto.ts`
- `backend/src/modules/needs/dto/bulk-update-status.dto.ts`
- `backend/src/modules/needs/dto/audit-log-query.dto.ts`
- `backend/src/modules/needs/dto/wash-form-borehole.dto.ts`
- `backend/src/modules/needs/dto/wash-form-tower.dto.ts`
- `backend/src/modules/needs/dto/wash-form-purification.dto.ts`
- `backend/src/modules/needs/dto/wash-form-pump.dto.ts`
- `backend/src/modules/needs/dto/wash-form-item.dto.ts`

**Backend service / wiring**
- `backend/src/modules/needs/needs.service.ts`
- `backend/src/modules/needs/audit-log.service.ts`
- `backend/src/modules/needs/needs.module.ts`
- `backend/src/modules/auth/guards/jwt-auth.guard.ts`
- `backend/src/modules/auth/guards/roles.guard.ts`
- `backend/src/modules/auth/decorators/roles.decorator.ts`
- `backend/src/modules/users/entities/user.entity.ts`

**Postgres entities**
- `backend/src/modules/needs/entities/wash-form.entity.ts`
- `backend/src/modules/needs/entities/wash-form-borehole.entity.ts`
- `backend/src/modules/needs/entities/wash-form-tower.entity.ts`
- `backend/src/modules/needs/entities/wash-form-purification.entity.ts`
- `backend/src/modules/needs/entities/wash-form-pump.entity.ts`
- `backend/src/modules/needs/entities/wash-form-item.entity.ts`
- `backend/src/modules/needs/entities/wash-form-audit-log.entity.ts` ← only JSONB column (`metadata`)

**Postgres migration & config**
- `backend/src/database/migrations/1777300000000-RestructureWashForms.ts`
- `backend/src/database/data-source.ts`
- `backend/src/app.module.ts`

**Bilingual XLSX export (UA/EN)**
- `backend/src/modules/needs/xlsx-export.service.ts`
- `backend/src/modules/needs/xlsx-export.labels.ts`
- (Equipment names sourced from) `backend/src/modules/equipment-catalog/entities/equipment-item.entity.ts`

---

## Verification (read-only, optional)
This is a trace, not a change — there is nothing to test. To sanity-check the trace yourself:
- `grep -rn jsonb backend/src/modules/needs/` — should show only `wash-form-audit-log.entity.ts:63` and code comments.
- `grep -rn "needs-forms/wash" ui/src` — should show the POST in `wash-form.ts` and the PATCH in `wash-form-detail.ts`.
- Open `wash-form.ts` lines 2029–2046 — confirm 8 step keys.
- Open `xlsx-export.service.ts` — confirm the 6-sheet layout and `lang: 'ua' | 'en'`.
