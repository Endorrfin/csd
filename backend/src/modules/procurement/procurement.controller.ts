// backend/src/modules/procurement/procurement.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
  UsePipes,
  Query,
} from '@nestjs/common';
import { ProcurementService } from './procurement.service';
import { CreateProcurementDto } from './dto/create-procurement.dto';
import { UpdateProcurementDto } from './dto/update-procurement.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { SanitizeHtmlPipe } from '../../common/pipes/sanitize-html.pipe';
import { UpdateProcurementStatusDto } from './dto/update-status.dto';
import { AdminProcurementQueryDto } from './dto/admin-query.dto';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('procurement')
export class ProcurementController {
  constructor(private readonly service: ProcurementService) {}

  @Get()
  findAll() {
    return this.service.findAllPublic();
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(@Query() query: AdminProcurementQueryDto) {
    return this.service.findAllForAdmin(query);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(SanitizeHtmlPipe)
  create(@Body() dto: CreateProcurementDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(SanitizeHtmlPipe)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcurementDto,
  ) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProcurementStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  // Legacy publish endpoint — kept for backward compat, will be removed
  // after UI fully switches to /:id/status (technical debt note in roadmap)
  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  publish(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.update(id, {
      status: 'published',
    } as UpdateProcurementDto);
  }

  // Hard delete — service enforces draft-only rule
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
