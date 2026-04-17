import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vacancy } from './entities/vacancy.entity';
import { VacancyService } from './vacancy.service';
import { VacancyController } from './vacancy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vacancy])],
  controllers: [VacancyController],
  providers: [VacancyService],
})
export class VacancyModule {}
