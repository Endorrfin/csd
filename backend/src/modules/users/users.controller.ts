// backend/src/modules/users/users.controller.ts
import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateRoleDto } from './dto/update-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from './entities/user.entity';
import type { AuthenticatedRequest } from '../../common/types/authenticated-request';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /** List all users — super_admin only */
  @Get()
  @Roles(UserRole.SUPER_ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  /** Change user role — super_admin only */
  @Patch(':id/role')
  @Roles(UserRole.SUPER_ADMIN)
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateRoleDto,
    @Request() req: AuthenticatedRequest,
  ) {
    // Prevent super_admin from demoting themselves
    if (id === req.user.id) {
      throw new ForbiddenException('Cannot change your own role');
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.usersService.updateRole(id, dto.role);
  }
}
