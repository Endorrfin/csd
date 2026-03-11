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
import { ContentService } from './content.service';
import { CreatePageDto } from './dto/create-page.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('pages')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Public — list of published pages
  @Get()
  findAll() {
    return this.contentService.findAllPublished();
  }

  // Public — page by slug
  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.contentService.findBySlug(slug);
  }

  // Manager/admin only — creation
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  create(@Body() dto: CreatePageDto) {
    return this.contentService.create(dto);
  }

  // Manager/admin only — update
  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  update(@Param('slug') slug: string, @Body() dto: UpdatePageDto) {
    return this.contentService.update(slug, dto);
  }

  // Admin only — delete
  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('slug') slug: string) {
    return this.contentService.remove(slug);
  }
}
