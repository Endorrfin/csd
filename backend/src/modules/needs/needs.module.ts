import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashForm } from './entities/wash-form.entity';
import { WashFormItem } from './entities/wash-form-item.entity';
import { WashFormBorehole } from './entities/wash-form-borehole.entity';
import { WashFormTower } from './entities/wash-form-tower.entity';
import { WashFormPurification } from './entities/wash-form-purification.entity';
import { WashFormPump } from './entities/wash-form-pump.entity';
import { WashFormAuditLog } from './entities/wash-form-audit-log.entity';
import { NeedsService } from './needs.service';
import { NeedsFormsController } from './needs.controller';
import { AuditLogService } from './audit-log.service';
import { XlsxExportService } from './xlsx-export.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      WashForm,
      WashFormItem,
      WashFormBorehole,
      WashFormTower,
      WashFormPurification,
      WashFormPump,
      WashFormAuditLog,
    ]),
  ],
  controllers: [NeedsFormsController],
  // register AuditLogService so the controller can request the log.
  providers: [NeedsService, AuditLogService, XlsxExportService],
})
export class NeedsModule {}
