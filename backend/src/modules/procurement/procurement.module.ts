import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Procurement } from './entities/procurement.entity';
import { ProcurementService } from './procurement.service';
import { ProcurementController } from './procurement.controller';
// CHANGED: status audit log (spec 003)
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Procurement]), AuditModule],
  controllers: [ProcurementController],
  providers: [ProcurementService],
  exports: [ProcurementService],
})
export class ProcurementModule {}
