import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cooperation } from './entities/cooperation.entity';
import { CooperationService } from './cooperation.service';
import { CooperationController } from './cooperation.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cooperation])],
  controllers: [CooperationController],
  providers: [CooperationService],
})
export class CooperationModule {}
