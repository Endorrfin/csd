import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Inquiry } from './entities/inquiry.entity';
import { InquiryService } from './inquiry.service';
import { InquiryController } from './inquiry.controller';
// CHANGED: status audit log (spec 003)
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Inquiry]), AuditModule],
  controllers: [InquiryController],
  providers: [InquiryService],
})
export class InquiryModule {}
