import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EquipmentCategory } from './entities/equipment-category.entity';
import { EquipmentItem } from './entities/equipment-item.entity';
import { EquipmentCatalogService } from './equipment-catalog.service';
import { EquipmentCatalogController } from './equipment-catalog.controller';

@Module({
  imports: [TypeOrmModule.forFeature([EquipmentCategory, EquipmentItem])],
  controllers: [EquipmentCatalogController],
  providers: [EquipmentCatalogService],
  exports: [EquipmentCatalogService],
})
export class EquipmentCatalogModule {}
