import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UploadService } from './upload.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TestimonialUploadDto } from './dto/testimonial-upload.dto';

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
}
