import { IsEnum } from 'class-validator';
import { VacancyStatus } from '../entities/vacancy.entity';

export class UpdateVacancyStatusDto {
  @IsEnum(VacancyStatus)
  status: VacancyStatus;
}
