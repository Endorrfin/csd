// backend/src/modules/testimonial/testimonial.controller.ts
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
  Req,
} from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TestimonialStatus } from './entities/testimonial.entity';
import { UpdateTestimonialStatusDto } from './dto/update-status.dto';
import { AdminTestimonialQueryDto } from './dto/admin-query.dto';
import { VerifyTestimonialDto } from './dto/verify.dto';
// CHANGED: staff routes pass the verified actor to the audit log (spec 003)
import { requireActor } from '../audit/audit-actor';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly service: TestimonialService) {}

  @Get()
  findAll() {
    return this.service.findAllApproved();
  }

  // paginated admin endpoint (replaces /admin/all)
  @Get('admin/list')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllForAdmin(@Query() query: AdminTestimonialQueryDto) {
    return this.service.findAllForAdmin(query);
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Post()
  create(@Body() dto: CreateTestimonialDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestimonialDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(id, dto, requireActor(req));
  }

  // Legacy /approve, /reject kept for backward compat
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestimonialDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(
      id,
      { ...dto, status: TestimonialStatus.APPROVED },
      requireActor(req),
    );
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestimonialDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.update(
      id,
      { ...dto, status: TestimonialStatus.REJECTED },
      requireActor(req),
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestimonialStatusDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.updateStatus(
      id,
      dto.status,
      dto.managerNotes,
      requireActor(req),
    );
  }

  // dedicated verify toggle — independent of status
  @Patch(':id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  verify(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: VerifyTestimonialDto,
  ) {
    return this.service.setVerified(id, dto.isVerified);
  }

  // DELETE lowered from ADMIN+ to MANAGER+ (rejected-only rule in service)
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
