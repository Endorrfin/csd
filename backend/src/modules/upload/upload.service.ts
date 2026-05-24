import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { ConfigService } from '@nestjs/config';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PRESIGNED_URL_EXPIRES_IN = 300;
const TESTIMONIAL_MAX_BYTES = 5 * 1024 * 1024; // 5 MB

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly cloudfrontUrl: string | undefined;

  constructor(private readonly config: ConfigService) {
    this.region = this.config.get<string>('AWS_REGION', 'eu-central-1');
    this.bucket = this.config.get<string>('AWS_S3_MEDIA_BUCKET', '');
    this.cloudfrontUrl = this.config.get<string>('AWS_CLOUDFRONT_MEDIA_URL');
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
}
