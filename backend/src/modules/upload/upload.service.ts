import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand, // CHANGED: PR-2 — presigned GET for private recovery files
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { ConfigService } from '@nestjs/config';
// === ADDED: PR-2 — shared recovery upload rules (single source of truth,
// also enforced in RecoveryService.assertValidAttachments on submit). ===
import {
  AttachmentKind,
  DOCUMENT_MAX_BYTES,
  DOCUMENT_MIME_TYPES,
  PHOTO_MAX_BYTES,
  PHOTO_MIME_TYPES,
  RECOVERY_S3_PREFIX,
} from '../needs/recovery.constants';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PRESIGNED_URL_EXPIRES_IN = 300;
const TESTIMONIAL_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

// CHANGED: PR-2 — extension map for recovery uploads (photos + documents).
const NEEDS_MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/zip': 'zip',
};

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontUrl: string | undefined;
  // CHANGED: PR-2 — separate PRIVATE bucket for needs uploads (defect acts
  // contain PII; csd-media is public-read, so these must not live there).
  private readonly privateBucket: string;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION', 'eu-central-1');
    this.bucket = this.config.get<string>('AWS_S3_MEDIA_BUCKET', '');
    this.cloudfrontUrl = this.config.get<string>('AWS_CLOUDFRONT_MEDIA_URL');
    this.privateBucket = this.config.get<string>('AWS_S3_PRIVATE_BUCKET', '');
    this.s3 = new S3Client({ region: this.region });
  }

  async getPresignedUrl(
    filename: string,
    contentType: string,
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new InternalServerErrorException('Unsupported file type');
    }

    const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
    // Generate unique key to avoid collisions
    const key = `media/blog/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: contentType,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    });

    // Use CloudFront URL if configured, otherwise fall back to direct S3
    const publicUrl = this.cloudfrontUrl
      ? `${this.cloudfrontUrl}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return { uploadUrl, publicUrl };
  }

  // === anonymous-safe upload for testimonial evidence ===
  // Uses a presigned POST so S3 itself rejects oversized/wrong-type files
  // (a presigned PUT cannot enforce content-length). Public endpoint.
  async getTestimonialPresignedPost(contentType: string): Promise<{
    url: string;
    fields: Record<string, string>;
    publicUrl: string;
  }> {
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      throw new BadRequestException('Unsupported file type');
    }

    const ext = MIME_EXT[contentType];
    const key = `media/testimonials/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.bucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, TESTIMONIAL_MAX_BYTES],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: PRESIGNED_URL_EXPIRES_IN,
    });

    const publicUrl = this.cloudfrontUrl
      ? `${this.cloudfrontUrl}/${key}`
      : `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;

    return { url, fields, publicUrl };
  }

  // ══════════════════════════════════════════════════════════════
  // === ADDED: PR-2 — recovery / needs uploads (PRIVATE bucket) ===
  // ══════════════════════════════════════════════════════════════

  /**
   * Presigned POST for a recovery form file. Anonymous-safe: S3 itself
   * enforces size + content-type via POST conditions (a presigned PUT can't
   * cap content-length). Target is the PRIVATE bucket — no public URL is
   * returned; admins view files through short-lived presigned GETs.
   *
   * Returns the storage key so the client can echo it back on form submit;
   * RecoveryService re-validates the prefix, MIME and size there.
   */
  async getNeedsPresignedPost(
    kind: AttachmentKind,
    contentType: string,
  ): Promise<{ url: string; fields: Record<string, string>; s3Key: string }> {
    this.assertPrivateBucketConfigured();

    const allowed: readonly string[] =
      kind === 'photo' ? PHOTO_MIME_TYPES : DOCUMENT_MIME_TYPES;
    if (!allowed.includes(contentType)) {
      throw new BadRequestException(
        `Unsupported ${kind} content type: ${contentType}`,
      );
    }

    const maxBytes = kind === 'photo' ? PHOTO_MAX_BYTES : DOCUMENT_MAX_BYTES;
    const ext = NEEDS_MIME_EXT[contentType] ?? 'bin';
    const subdir = kind === 'photo' ? 'photo' : 'doc';
    const key = `${RECOVERY_S3_PREFIX}${subdir}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { url, fields } = await createPresignedPost(this.s3, {
      Bucket: this.privateBucket,
      Key: key,
      Conditions: [
        ['content-length-range', 1, maxBytes],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: PRESIGNED_URL_EXPIRES_IN,
    });

    return { url, fields, s3Key: key };
  }

  /**
   * Short-lived presigned GET for a private recovery file. Used by the admin
   * detail view (RecoveryService.findByIdWithUrls) — never exposed publicly.
   */
  async getNeedsFileUrl(s3Key: string): Promise<string> {
    this.assertPrivateBucketConfigured();
    const command = new GetObjectCommand({
      Bucket: this.privateBucket,
      Key: s3Key,
    });
    return getSignedUrl(this.s3, command, {
      expiresIn: PRESIGNED_URL_EXPIRES_IN,
    });
  }

  private assertPrivateBucketConfigured(): void {
    if (!this.privateBucket) {
      throw new InternalServerErrorException(
        'AWS_S3_PRIVATE_BUCKET is not configured — recovery file storage is unavailable',
      );
    }
  }
}
