// body for the public recovery/needs presigned-upload request
import { IsIn, IsString } from 'class-validator';
import { ATTACHMENT_KINDS } from '../../needs/recovery.constants';
import type { AttachmentKind } from '../../needs/recovery.constants';

export class NeedsUploadDto {
  @IsIn(ATTACHMENT_KINDS)
  kind: AttachmentKind;

  /** Validated against the kind-specific MIME allowlist in UploadService. */
  @IsString()
  contentType: string;
}
