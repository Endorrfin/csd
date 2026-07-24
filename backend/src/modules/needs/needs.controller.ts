import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
  Body,
  Query,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { NeedsService } from './needs.service';
import { CreateWashFormDto } from './dto/create-wash-form.dto';
import { UpdateWashFormDto } from './dto/update-wash-form.dto';
import { UpdateWashFormFullDto } from './dto/update-wash-form-full.dto';
import { FormStatus } from './entities/wash-form.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditActor } from './audit-log.service';
import { XlsxExportService } from './xlsx-export.service';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { RecoveryService } from './recovery.service';
import { CreateRecoveryFormDto } from './dto/create-recovery-form.dto';
import { UpdateRecoveryFormDto } from './dto/update-recovery-form.dto';
import { UpdateRecoveryFormFullDto } from './dto/update-recovery-form-full.dto';
import { RecoveryAdminQueryDto } from './dto/recovery-admin-query.dto';
import { RecoveryXlsxExportService } from './recovery-xlsx-export.service';
// Turnstile anti-spam on the public recovery submit
import { TurnstileGuard } from '../../common/guards/turnstile.guard';

/**
 * Shape of req.user injected by JwtAuthGuard. Keep narrow — we only need
 * id/email for audit logging.
 */
interface AuthenticatedUser {
  id: string;
  email: string;
  role?: UserRole;
}

type AuthedRequest = Request & {
  user: { id: string; email: string };
};

/** Extracts an AuditActor from the request. Anonymous submit yields nulls. */
function resolveActor(req: Request): AuditActor {
  const user = (req as Request & { user?: AuthenticatedUser }).user;
  return {
    userId: user?.id ?? null,
    email: user?.email ?? null,
  };
}

@Controller('needs-forms')
export class NeedsFormsController {
  constructor(
    private readonly needsService: NeedsService,
    private readonly xlsxExport: XlsxExportService,
    private readonly recoveryService: RecoveryService,
    private readonly recoveryXlsxExport: RecoveryXlsxExportService,
  ) {}

  /** Public — submit a WASH needs form. Anonymous allowed. */
  @Post('wash')
  create(@Body() dto: CreateWashFormDto, @Req() req: Request) {
    return this.needsService.create(dto, resolveActor(req));
  }

  // extended GET — match @Roles to your existing list endpoint
  @Get('wash')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: FormStatus,
    @Query('region') region?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.needsService.findAll({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      status,
      region,
      search,
      sortBy,
      sortOrder,
      dateFrom,
      dateTo,
    });
  }

  @Patch('wash/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  bulkUpdateStatus(
    @Body() dto: BulkUpdateStatusDto,
    @Req() req: AuthedRequest,
  ) {
    return this.needsService.bulkUpdateStatus(dto.ids, dto.status, {
      userId: req.user.id,
      email: req.user.email,
    });
  }

  /**
   * Manager/Admin — export WASH forms as multi-sheet XLSX.
   *
   * Query params:
   *   - status  (optional) filter by FormStatus
   *   - region  (optional) case-insensitive substring
   *   - lang    (optional) 'ua' | 'en'; defaults to 'en'
   *
   * IMPORTANT: this route must be registered BEFORE `wash/:id` so the
   * literal path wins over the :id matcher.
   */
  @Get('wash/export-xlsx')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async exportXlsx(
    @Res() res: Response,
    @Query('status') status?: FormStatus,
    @Query('region') region?: string,
    @Query('lang') lang?: string,
  ): Promise<void> {
    const buffer = await this.xlsxExport.buildWorkbook({
      status,
      region,
      lang: lang === 'ua' ? 'ua' : 'en',
    });

    const date = new Date().toISOString().slice(0, 10);
    const filename = `wash-forms-${date}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /** Manager/Admin — single form with all child entities. */
  @Get('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findById(@Param('id') id: string) {
    return this.needsService.findById(id);
  }

  /** Manager/Admin — audit log for one form. */
  @Get('wash/:id/audit-log')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  getAuditLog(@Param('id') id: string) {
    return this.needsService.getAuditLog(id);
  }

  /** Manager/Admin — quick status/notes change. */
  @Patch('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateWashFormDto,
    @Req() req: Request,
  ) {
    return this.needsService.update(id, dto, resolveActor(req));
  }

  /** Manager/Admin — full-form edit (all fields). */
  @Patch('wash/:id/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  updateFull(
    @Param('id') id: string,
    @Body() dto: UpdateWashFormFullDto,
    @Req() req: Request,
  ) {
    return this.needsService.updateFull(id, dto, resolveActor(req));
  }

  /** Admin — delete form. */
  @Delete('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string, @Req() req: Request) {
    return this.needsService.remove(id, resolveActor(req));
  }

  // ══════════════════════════════════════════════════════════════
  // === ADDED: PR-1 Recovery form routes ===
  // ══════════════════════════════════════════════════════════════

  /**
   * Public — submit a Recovery needs form. Anonymous, Turnstile-guarded.
   * Client sends the Turnstile token in the `x-turnstile-token` header.
   */
  @Post('recovery')
  @UseGuards(TurnstileGuard)
  createRecovery(@Body() dto: CreateRecoveryFormDto, @Req() req: Request) {
    return this.recoveryService.create(dto, resolveActor(req));
  }

  /** Manager/Admin — paginated list with filters. */
  @Get('recovery')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findAllRecovery(@Query() query: RecoveryAdminQueryDto) {
    return this.recoveryService.findAll(query);
  }

  /**
   * Manager/Admin — bulk status change.
   * NOTE: literal 'recovery/bulk' must stay registered BEFORE 'recovery/:id'
   * (same gotcha as wash/export-xlsx above).
   */
  @Patch('recovery/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  bulkUpdateRecoveryStatus(
    @Body() dto: BulkUpdateStatusDto,
    @Req() req: AuthedRequest,
  ) {
    return this.recoveryService.bulkUpdateStatus(dto.ids, dto.status, {
      userId: req.user.id,
      email: req.user.email,
    });
  }

  /**
   * Manager/Admin — export Recovery forms as a 3-sheet XLSX
   * (Applications / Damages / Files).
   *
   * Query params mirror the recovery list filters: status, region, objectType,
   * applicantCategory, urgency, search, dateFrom, dateTo, plus lang ('ua'|'en',
   * defaults to 'en').
   *
   * IMPORTANT: must be registered BEFORE `recovery/:id` (ParseUUIDPipe) so the
   * literal path wins over the :id matcher.
   */
  @Get('recovery/export-xlsx')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  async exportRecoveryXlsx(
    @Res() res: Response,
    @Query('status') status?: FormStatus,
    @Query('region') region?: string,
    @Query('objectType') objectType?: string,
    @Query('applicantCategory') applicantCategory?: string,
    @Query('urgency') urgency?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('lang') lang?: string,
  ): Promise<void> {
    const buffer = await this.recoveryXlsxExport.buildWorkbook({
      status,
      region,
      objectType,
      applicantCategory,
      urgency,
      search,
      dateFrom,
      dateTo,
      lang: lang === 'ua' ? 'ua' : 'en',
    });

    const date = new Date().toISOString().slice(0, 10);
    const filename = `recovery-forms-${date}.xlsx`;

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * Manager/Admin — single form incl. damages + attachments.
   * Attachments come back with short-lived presigned GET urls (private bucket).
   */
  @Get('recovery/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findRecoveryById(@Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryService.findByIdWithUrls(id);
  }

  /** Manager/Admin — audit log for one form. */
  @Get('recovery/:id/audit-log')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  getRecoveryAuditLog(@Param('id', ParseUUIDPipe) id: string) {
    return this.recoveryService.getAuditLog(id);
  }

  /** Manager/Admin — quick status/notes change. */
  @Patch('recovery/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  updateRecovery(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecoveryFormDto,
    @Req() req: Request,
  ) {
    return this.recoveryService.update(id, dto, resolveActor(req));
  }

  /** Manager/Admin — full-form edit (replace semantics for arrays). */
  @Patch('recovery/:id/full')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  updateRecoveryFull(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRecoveryFormFullDto,
    @Req() req: Request,
  ) {
    return this.recoveryService.updateFull(id, dto, resolveActor(req));
  }

  /** Admin — delete form (attachments rows removed; S3 cleanup is Phase 2). */
  @Delete('recovery/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeRecovery(@Param('id', ParseUUIDPipe) id: string, @Req() req: Request) {
    return this.recoveryService.remove(id, resolveActor(req));
  }
}
