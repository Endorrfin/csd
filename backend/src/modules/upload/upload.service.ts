import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PRESIGNED_URL_EXPIRES_IN = 300; // 5 minutes

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
}
