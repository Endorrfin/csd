// === ADDED: spec 003 — status audit log module ===
// Standalone on purpose: it does not import NeedsModule, so procurement, vacancy,
// testimonial, complaint and inquiry can import it without a module cycle, and the
// Recovery / Winterization audit code stays untouched.
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NeedsFormAuditLog } from '../needs/entities/needs-form-audit-log.entity';
import { AuditController } from './audit.controller';
import { EntityAuditService } from './entity-audit.service';

@Module({
  imports: [TypeOrmModule.forFeature([NeedsFormAuditLog])],
  controllers: [AuditController],
  providers: [EntityAuditService],
  exports: [EntityAuditService],
})
export class AuditModule {}
