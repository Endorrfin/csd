import { IsEnum } from 'class-validator';
import { ProcurementStatus } from '../entities/procurement.entity';

export class UpdateProcurementStatusDto {
  @IsEnum(ProcurementStatus)
  status: ProcurementStatus;
}
