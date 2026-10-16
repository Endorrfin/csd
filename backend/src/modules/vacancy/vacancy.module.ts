import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { VacancyService } from './vacancy.service';
import { VacancyController } from './vacancy.controller';
// CHANGED: status audit log (spec 003)
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [TypeOrmModule.forFeature([Vacancy]), AuditModule],
  controllers: [VacancyController],
  providers: [VacancyService],
})
export class VacancyModule {}
