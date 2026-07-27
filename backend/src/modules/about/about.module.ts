import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AboutController } from './about.controller';
import { AboutService } from './about.service';
import { AboutSection } from './entities/about-section.entity';
import { AboutDocument } from './entities/about-document.entity';
// === ADDED: PR-D1 — file variants + presigned URLs for the private bucket ===
import { AboutDocumentFile } from './entities/about-document-file.entity';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AboutSection, AboutDocument, AboutDocumentFile]),
    UploadModule,
  ],
  controllers: [AboutController],
  providers: [AboutService],
})
export class AboutModule {}
