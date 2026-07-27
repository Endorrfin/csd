import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateAboutDocumentDto } from './create-about-document.dto';

// CHANGED: PR-D1 — `code` is the public identifier used in document URLs and in the
// S3 layout, so it is immutable after creation (re-import instead of renaming).
export class UpdateAboutDocumentDto extends PartialType(
  OmitType(CreateAboutDocumentDto, ['code'] as const),
) {}
