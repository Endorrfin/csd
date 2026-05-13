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
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AboutService } from './about.service';
import { CreateAboutSectionDto } from './dto/create-about-section.dto';
import { UpdateAboutSectionDto } from './dto/update-about-section.dto';
import { CreateAboutDocumentDto } from './dto/create-about-document.dto';
import { UpdateAboutDocumentDto } from './dto/update-about-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('about')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  // ===== PUBLIC =====

  // CHANGED: single endpoint returning published sections + documents (SSR-friendly)
  @Get()
  getPublicAbout() {
    return this.aboutService.getPublicAbout();
  }

  // ===== ADMIN: SECTIONS =====

  @Get('admin/sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllSections() {
    return this.aboutService.findAllSections();
  }

  @Get('admin/sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findSectionById(@Param('id', ParseUUIDPipe) id: string) {
    return this.aboutService.findSectionById(id);
  }

  @Post('admin/sections')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createSection(@Body() dto: CreateAboutSectionDto) {
    return this.aboutService.createSection(dto);
  }

  @Patch('admin/sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateSection(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAboutSectionDto,
  ) {
    return this.aboutService.updateSection(id, dto);
  }

  @Delete('admin/sections/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSection(@Param('id', ParseUUIDPipe) id: string) {
    return this.aboutService.removeSection(id);
  }

  // ===== ADMIN: DOCUMENTS =====

  @Get('admin/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllDocuments() {
    return this.aboutService.findAllDocuments();
  }

  @Get('admin/documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findDocumentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.aboutService.findDocumentById(id);
  }

  @Post('admin/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  createDocument(@Body() dto: CreateAboutDocumentDto) {
    return this.aboutService.createDocument(dto);
  }

  @Patch('admin/documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  updateDocument(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAboutDocumentDto,
  ) {
    return this.aboutService.updateDocument(id, dto);
  }

  @Delete('admin/documents/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDocument(@Param('id', ParseUUIDPipe) id: string) {
    return this.aboutService.removeDocument(id);
  }
}
