// nested DTO — one uploaded file (photo or document)
import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { DOCUMENT_MAX_BYTES } from '../recovery.constants';

/**
 * Metadata of a file already uploaded to S3 via the presigned-POST endpoint
 * (PR-2). `kind` is NOT part of the payload — the service derives it from
 * which array the entry came in (photos[] vs documents[]).
 *
 * The prefix regex stops applicants from attaching foreign bucket keys;
 * per-kind MIME/size rules are enforced in RecoveryService (cross-field).
 */
export class RecoveryAttachmentDto {
  @IsString()
  @MaxLength(512)
  // negative lookahead forbids '..' — CloudFront/browsers normalize such
  // paths, which would let a key escape the recovery prefix when rendered.
  @Matches(/^(?!.*\.\.)media\/needs\/recovery\/[a-zA-Z0-9/_.-]+$/, {
    message:
      's3Key must be under media/needs/recovery/ and must not contain ".."',
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
  @Max(DOCUMENT_MAX_BYTES) // absolute cap; per-kind cap re-checked in service
  sizeBytes: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
