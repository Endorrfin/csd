import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { NeedsService } from './needs.service';
import { CreateWashFormDto } from './dto/create-wash-form.dto';
import { UpdateWashFormDto } from './dto/update-wash-form.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('needs-forms')
export class NeedsFormsController {
  constructor(private readonly needsService: NeedsService) {}

  /** Public — submit a WASH needs form (no auth required) */
  @Post('wash')
  create(@Body() dto: CreateWashFormDto) {
    return this.needsService.create(dto);
  }

  /** Manager/Admin — list all forms */
  @Get('wash')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findAll() {
    return this.needsService.findAll();
  }

  /** Manager/Admin — get single form */
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
