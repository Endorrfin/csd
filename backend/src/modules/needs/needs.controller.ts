import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Query, Res, UseGuards,
} from '@nestjs/common';
// import { Response } from 'express';
// import type { Response } from 'express';
import * as express from 'express';
import { NeedsService } from './needs.service';
import { CreateWashFormDto } from './dto/create-wash-form.dto';
import { UpdateWashFormDto } from './dto/update-wash-form.dto';
import { FormStatus } from './entities/wash-form.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('needs-forms')
export class NeedsFormsController {
  constructor(private readonly needsService: NeedsService) {}

  /** Public — submit a WASH needs form */
  @Post('wash')
  create(@Body() dto: CreateWashFormDto) {
    return this.needsService.create(dto);
  }

  /** Manager/Admin — list forms with pagination & filters */
  @Get('wash')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: FormStatus,
    @Query('region') region?: string,
    @Query('search') search?: string,
  ) {
    return this.needsService.findAll({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
      region,
      search,
    });
  }

  /** Manager/Admin — export forms as CSV */
  @Get('wash/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async exportCsv(
    // @Res() res: Response,
    // @Res() res: any,
    @Res() res: express.Response,
    @Query('status') status?: FormStatus,
    @Query('region') region?: string,
  ) {
    const csv = await this.needsService.exportCsv({ status, region });
    const filename = `wash-forms-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // BOM for Excel UTF-8 support
    res.send('\uFEFF' + csv);
  }

  /** Manager/Admin — single form */
  @Get('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findById(@Param('id') id: string) {
    return this.needsService.findById(id);
  }

  /** Manager/Admin — update status/notes */
  @Patch('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateWashFormDto) {
    return this.needsService.update(id, dto);
  }

  /** Admin — delete form */
  @Delete('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.needsService.remove(id);
  }
}
