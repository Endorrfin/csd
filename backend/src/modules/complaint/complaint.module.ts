import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Complaint } from './entities/complaint.entity';
import { ComplaintService } from './complaint.service';
import { ComplaintController } from './complaint.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint])],
  controllers: [ComplaintController],
  providers: [ComplaintService],
})
export class ComplaintModule {}
