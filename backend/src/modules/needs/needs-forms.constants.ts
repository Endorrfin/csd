// === ADDED: PR-W1 cross-form constants for the needs module ===
// Anything shared by MORE THAN ONE needs form lives here; per-form option
// catalogs stay in <form>.constants.ts (recovery.constants.ts,
// winterization.constants.ts).

/**
 * `form_type` discriminators used by the shared needs_* tables
 * (needs_form_attachments / needs_form_audit_log / form_number_sequences) and
 * by the S3 key prefix of the public presigned-upload endpoint.
 *
 * Adding a form type here is deliberately NOT enough to make uploads work —
 * UploadService also needs its prefix in NEEDS_PREFIX_BY_FORM_TYPE, which the
 * compiler enforces via Record<NeedsUploadFormType, string>.
 */
export const NEEDS_UPLOAD_FORM_TYPES = ['recovery', 'winterization'] as const;
export type NeedsUploadFormType = (typeof NEEDS_UPLOAD_FORM_TYPES)[number];

/** Default keeps the Recovery client (PR-2) working without sending formType. */
export const DEFAULT_NEEDS_UPLOAD_FORM_TYPE: NeedsUploadFormType = 'recovery';
