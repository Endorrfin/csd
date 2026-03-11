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
} from '@nestjs/common';
import { CooperationService } from './cooperation.service';
import { CreateCooperationDto } from './dto/create-cooperation.dto';
import { UpdateCooperationDto } from './dto/update-cooperation.dto';
import { CooperationType } from './entities/cooperation.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('cooperation')
export class CooperationController {
  constructor(private readonly cooperationService: CooperationService) {}

  // GET /api/cooperation?type=vacancy
  @Get()
  findAll(@Query('type') type?: CooperationType) {
    if (type) {
      return this.cooperationService.findPublishedByType(type);
    }
    return this.cooperationService.findAllPublished();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.cooperationService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  create(@Body() dto: CreateCooperationDto) {
    return this.cooperationService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateCooperationDto) {
    return this.cooperationService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.cooperationService.remove(id);
  }
}
