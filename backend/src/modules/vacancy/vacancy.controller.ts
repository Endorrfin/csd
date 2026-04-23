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
  Query, // CHANGED: added for admin query DTO
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
// CHANGED: new admin query DTO
import { AdminVacancyQueryDto } from './dto/admin-query.dto';

@Controller('vacancies')
export class VacancyController {
  constructor(private readonly service: VacancyService) {}

  // CHANGED: now returns every non-draft record (not only published)
  @Get()
  findAll() {
    return this.service.findAllPublic();
  }

  // CHANGED: paginated + filtered admin endpoint (replaces /admin/all)
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(@Query() query: AdminVacancyQueryDto) {
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
  create(@Body() dto: CreateVacancyDto, @Req() req: any) {
    return this.service.create(dto, req.user.id as string);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(SanitizeHtmlPipe)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyDto,
  ) {
    return this.service.update(id, dto);
  }

  // Legacy /publish kept for backward compat — will be removed after UI migrates fully
  @Patch(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UsePipes(SanitizeHtmlPipe)
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyDto,
  ) {
    return this.service.update(id, { ...dto, status: VacancyStatus.PUBLISHED });
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVacancyStatusDto,
  ) {
    return this.service.updateStatus(id, dto.status);
  }

  // CHANGED: DELETE lowered from ADMIN+ to MANAGER+ (draft-only rule enforced in service)
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
