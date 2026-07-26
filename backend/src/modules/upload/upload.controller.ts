import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TestimonialUploadDto } from './dto/testimonial-upload.dto';
// === ADDED: PR-2 recovery/needs presigned upload ===
import { NeedsUploadDto } from './dto/needs-upload.dto';
import { TurnstileGuard } from '../../common/guards/turnstile.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  getPresignedUrl(
    @Body() body: { filename: string; contentType: string },
  ): Promise<{ uploadUrl: string; publicUrl: string }> {
    return this.uploadService.getPresignedUrl(body.filename, body.contentType);
  }

  // === public endpoint for anonymous testimonial evidence uploads ===
  // No guard by design (testimonial form is anonymous). S3 enforces size/type
  // via the presigned POST conditions; files become public only after moderation.
  @Post('testimonial-presigned')
  getTestimonialPresignedPost(@Body() dto: TestimonialUploadDto): Promise<{
    url: string;
    fields: Record<string, string>;
    publicUrl: string;
  }> {
    return this.uploadService.getTestimonialPresignedPost(dto.contentType);
  }

  // PR-2 — public recovery/needs upload (photos + documents)
  // Turnstile-guarded (anti-spam); files land in the PRIVATE bucket. The
  // returned s3Key is echoed back on form submit and re-validated there.
  // PR-W1 — `dto.formType` picks the key prefix (recovery |
  // winterization); omitting it keeps the PR-2 recovery behaviour.
  @Post('needs-presigned')
  @UseGuards(TurnstileGuard)
  getNeedsPresignedPost(@Body() dto: NeedsUploadDto): Promise<{
    url: string;
    fields: Record<string, string>;
    s3Key: string;
  }> {
    return this.uploadService.getNeedsPresignedPost(
      dto.kind,
      dto.contentType,
      dto.formType,
    );
  }
}
