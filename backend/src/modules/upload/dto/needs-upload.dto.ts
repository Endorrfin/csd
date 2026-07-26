// body for the public needs presigned-upload request (recovery / winterization)
import { IsIn, IsOptional, IsString } from 'class-validator';
import { ATTACHMENT_KINDS } from '../../needs/recovery.constants';
import type { AttachmentKind } from '../../needs/recovery.constants';

import { NEEDS_UPLOAD_FORM_TYPES } from '../../needs/needs-forms.constants';
import type { NeedsUploadFormType } from '../../needs/needs-forms.constants';

export class NeedsUploadDto {
  @IsIn(ATTACHMENT_KINDS)
  kind: AttachmentKind;

  /** Validated against the kind-specific MIME allowlist in UploadService. */
  @IsString()
  contentType: string;

  /**
   * Which form the file belongs to — decides the S3 key prefix, which the
   * owning service re-validates on submit. Optional for backwards
   * compatibility: the Recovery client (PR-2) does not send it and must keep
   * getting `media/needs/recovery/...`.
   */
  @IsOptional()
  @IsIn(NEEDS_UPLOAD_FORM_TYPES)
  formType?: NeedsUploadFormType;
}
