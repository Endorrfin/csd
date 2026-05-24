// backend/src/modules/inquiry/inquiry.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Query,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { InquiryService } from './inquiry.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { AdminInquiryQueryDto } from './dto/admin-query.dto';
import { ExportInquiriesQueryDto } from './dto/export-query.dto';
import { UpdateInquiryStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('inquiries')
export class InquiryController {
  constructor(private readonly service: InquiryService) {}

  // Public contact-form submission (no auth — like POST /api/complaints)
  @Post()
  create(@Body() dto: CreateInquiryDto) {
    return this.service.create(dto);
  }

  // Paginated + filtered admin grid
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(@Query() query: AdminInquiryQueryDto) {
    return this.service.findAllForAdmin(query);
  }

  // CSV export — streams file with UTF-8 BOM for Excel compatibility
  @Get('admin/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async exportCsv(
    @Query() query: ExportInquiriesQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(query);
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="inquiries-${date}.csv"`,
    );
    // BOM makes Excel read Cyrillic correctly
    res.send('﻿' + csv);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateInquiryStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status, dto.managerNotes);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
