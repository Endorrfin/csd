import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WashForm } from './entities/wash-form.entity';
import { WashFormItem } from './entities/wash-form-item.entity';
import { NeedsService } from './needs.service';
import { NeedsFormsController } from './needs.controller';

@Module({
  imports: [TypeOrmModule.forFeature([WashForm, WashFormItem])],
  controllers: [NeedsFormsController],
  providers: [NeedsService],
})
export class NeedsModule {}
