import { Controller, Get } from '@nestjs/common';
import { EquipmentCatalogService } from './equipment-catalog.service';

@Controller('equipment-catalog')
export class EquipmentCatalogController {
  constructor(private readonly catalogService: EquipmentCatalogService) {}

  /** Public — returns all categories with items for the form dropdown */
  @Get()
  findAll() {
    return this.catalogService.findAll();
  }
}
