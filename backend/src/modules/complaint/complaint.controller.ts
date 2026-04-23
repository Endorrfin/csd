// backend/src/modules/complaint/complaint.controller.ts
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
import { ComplaintService } from './complaint.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UpdateComplaintDto } from './dto/update-complaint.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { UpdateComplaintStatusDto } from './dto/update-status.dto';
import { AdminComplaintQueryDto } from './dto/admin-query.dto';
import { ExportComplaintsQueryDto } from './dto/export-query.dto';

@Controller('complaints')
export class ComplaintController {
  constructor(private readonly service: ComplaintService) {}

  // Legacy unfiltered list — kept for backward compat
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.service.findAll();
  }

  // paginated + filtered admin endpoint
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(@Query() query: AdminComplaintQueryDto) {
    return this.service.findAllForAdmin(query);
  }

  // CSV export endpoint — streams file with UTF-8 BOM for Excel compatibility
  @Get('admin/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async exportCsv(
    @Query() query: ExportComplaintsQueryDto,
    @Res() res: Response,
  ) {
    const csv = await this.service.exportCsv(query);
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="complaints-${date}.csv"`,
    );
    // BOM makes Excel read Cyrillic correctly
    res.send('\ufeff' + csv);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateComplaintDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateComplaintStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status, dto.managerNotes);
  }

  // DELETE lowered from ADMIN+ to MANAGER+ (closed-only rule in service)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
