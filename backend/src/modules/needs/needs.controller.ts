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
  constructor(private readonly needsFormsService: NeedsService) {}

  // Публичный — подать заявку (без авторизации)
  @Post('wash')
  createWash(@Body() dto: CreateWashFormDto) {
    return this.needsFormsService.create(dto);
  }

  // Менеджер/админ — список всех заявок
  @Get('wash')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findAllWash() {
    return this.needsFormsService.findAll();
  }

  // Менеджер/админ — одна заявка
  @Get('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  findWashById(@Param('id') id: string) {
    return this.needsFormsService.findById(id);
  }

  // Менеджер/админ — обновить статус
  @Patch('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  updateWash(@Param('id') id: string, @Body() dto: UpdateWashFormDto) {
    return this.needsFormsService.update(id, dto);
  }

  // Админ — удалить
  @Delete('wash/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  removeWash(@Param('id') id: string) {
    return this.needsFormsService.remove(id);
  }
}
