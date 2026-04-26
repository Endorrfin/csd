import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
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
}
