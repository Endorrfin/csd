import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
// === ADDED: PR-2 — Turnstile guard for the public needs-upload endpoint ===
import { TurnstileGuard } from '../../common/guards/turnstile.guard';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  // CHANGED: PR-2 — provide TurnstileGuard; export UploadService so
  // NeedsModule can generate presigned GETs for the admin detail view.
  providers: [UploadService, TurnstileGuard],
  exports: [UploadService],
})
export class UploadModule {}
