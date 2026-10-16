// backend/src/modules/vacancy/vacancy.controller.ts
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
import { VacancyService } from './vacancy.service';
import { CreateVacancyDto } from './dto/create-vacancy.dto';
import { UpdateVacancyDto } from './dto/update-vacancy.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { VacancyStatus } from './entities/vacancy.entity';
import { SanitizeHtmlPipe } from '../../common/pipes/sanitize-html.pipe';
import { UpdateVacancyStatusDto } from './dto/update-status.dto';
import { AdminVacancyQueryDto } from './dto/admin-query.dto';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';
// CHANGED: staff routes pass the verified actor to the audit log (spec 003)
import { requireActor } from '../audit/audit-actor';

@Controller('vacancies')
export class VacancyController {
  constructor(private readonly service: VacancyService) {}

  @Get()
  findAll() {
    return this.service.findAllPublic();
  }

  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(@Query() query: AdminVacancyQueryDto) {
    return this.service.findAllForAdmin(query);
  }

  // === ADDED: spec 004 — guarded full record for the admin edit forms. Declared after
  // `admin/list` so `list` is never captured as an id. ===
  @Get('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findByIdForAdmin(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findByIdForAdmin(id);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(SanitizeHtmlPipe)
  create(@Body() dto: CreateVacancyDto, @Req() req: AuthenticatedRequest) {
    return this.service.create(dto, req.user.id, requireActor(req));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(SanitizeHtmlPipe)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(id, dto, requireActor(req));
  }

  // Legacy /publish kept for backward compat — will be removed after UI migrates fully
  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(SanitizeHtmlPipe)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(
      id,
      { ...dto, status: VacancyStatus.PUBLISHED },
      requireActor(req),
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.updateStatus(id, dto.status, requireActor(req));
  }

  // DELETE lowered from ADMIN+ to MANAGER+ (draft-only rule enforced in service)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.remove(id, requireActor(req));
  }
}
