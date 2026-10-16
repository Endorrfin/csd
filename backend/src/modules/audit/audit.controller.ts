// === ADDED: spec 003 — read-only history endpoint ===
import {
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { AuditLogQueryDto } from '../needs/dto/audit-log-query.dto';
import { AuditedEntityType } from './audit-entity-type';
import {
  EntityAuditEntryDto,
  EntityAuditService,
  toEntryDto,
} from './entity-audit.service';

/**
 * GET only, by design: the log is append-only and this controller has no write routes
 * (spec decision D10). `donor` and `public` are excluded by @Roles; `super_admin`
 * passes through RolesGuard's built-in bypass.
 */
@Controller('audit-log')
export class AuditController {
  constructor(private readonly audit: EntityAuditService) {}

  @Get(':entityType/:entityId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async history(
    @Param('entityType', new ParseEnumPipe(AuditedEntityType))
    entityType: AuditedEntityType,
    @Param('entityId', ParseUUIDPipe) entityId: string,
    @Query() query: AuditLogQueryDto,
  ): Promise<EntityAuditEntryDto[]> {
    const rows = await this.audit.findByEntity(
      entityType,
      entityId,
      query.limit,
    );
    return rows.map(toEntryDto);
  }
}
