// PR-W1 nested DTO — one uploaded file (photo or document)
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DOCUMENT_MAX_BYTES } from '../winterization.constants';

/**
 * Metadata of a file already uploaded to the private bucket via
 * POST /api/upload/needs-presigned (formType='winterization'). `kind` is NOT
 * part of the payload — the service derives it from which array the entry came
 * in (photos[] vs documents[]).
 *
 * This is a near-twin of RecoveryAttachmentDto and deliberately NOT a shared
 * base class: the only difference is the S3 prefix, and class-validator
 * decorators are static per class, so a "generic" version would have to loosen
 * the prefix regex — the very check that stops an applicant from attaching
 * someone else's bucket key.
 */
export class WinterizationAttachmentDto {
  @IsString()
  @MaxLength(512)
  // negative lookahead forbids '..' — CloudFront/browsers normalize such paths,
  // which would let a key escape the winterization prefix when rendered.
  @Matches(/^(?!.*\.\.)media\/needs\/winterization\/[a-zA-Z0-9/_.-]+$/, {
    message:
      's3Key must be under media/needs/winterization/ and must not contain ".."',
  })
  s3Key: string;

  @IsString()
  @MaxLength(255)
  originalName: string;

  @IsString()
  @MaxLength(100)
  mimeType: string;

  @IsInt()
  @Min(1)
  @Max(DOCUMENT_MAX_BYTES) // absolute cap; per-kind cap re-checked in the service
  sizeBytes: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
