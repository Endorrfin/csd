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
// Recovery form + shared needs infrastructure
import { RecoveryForm } from './entities/recovery-form.entity';
import { RecoveryFormDamage } from './entities/recovery-form-damage.entity';
import { NeedsFormAttachment } from './entities/needs-form-attachment.entity';
import { NeedsFormAuditLog } from './entities/needs-form-audit-log.entity';
import { FormNumberSequence } from './entities/form-number-sequence.entity';
import { RecoveryService } from './recovery.service';
import { NeedsAuditLogService } from './needs-audit-log.service';
import { FormNumberService } from './form-number.service';
// === END ADDED ===

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
      // recovery + shared needs entities
      RecoveryForm,
      RecoveryFormDamage,
      NeedsFormAttachment,
      NeedsFormAuditLog,
      FormNumberSequence,
    ]),
  ],
  controllers: [NeedsFormsController],
  // register AuditLogService so the controller can request the log.
  providers: [
    NeedsService,
    AuditLogService,
    XlsxExportService,
    RecoveryService,
    NeedsAuditLogService,
    FormNumberService,
  ],
})
export class NeedsModule {}
