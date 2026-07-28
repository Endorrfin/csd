import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
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
// === ADDED: PR-D1 ===
import { CreateAboutDocumentFileDto } from './dto/create-about-document-file.dto';
import { AboutDocumentFileQueryDto } from './dto/about-document-file-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('about')
export class AboutController {
  constructor(private readonly aboutService: AboutService) {}

  // ===== PUBLIC =====

  // PR-D3 — sections only. The registry moved to GET /api/about/documents
  // when it got its own page, so the About page no longer loads it.
  @Get()
  getPublicAbout() {
    return this.aboutService.getPublicAbout();
  }

  // === ADDED: PR-D3 — registry feed for /about/documents. Declared BEFORE
  // 'documents/:code/file' for readability only; Nest matches on full path depth,
  // so the two cannot shadow each other. ===
  @Get('documents')
  getPublicDocuments() {
    return this.aboutService.getPublicDocuments();
  }

  // === ADDED: PR-D1 — one short-lived presigned GET per document per language.
  // Public by design (the registry is public), but deliberately NOT batchable:
  // downloading the whole registry now costs one request per file instead of one
  // request in total. ===
  @Get('documents/:code/file')
  getPublicDocumentFile(
    @Param('code') code: string,
    @Query() query: AboutDocumentFileQueryDto,
  ) {
    return this.aboutService.getPublicDocumentFile(code, query.locale);
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

  // ===== ADMIN: DOCUMENT FILES — ADDED: PR-D1 =====

  @Get('admin/documents/:id/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findDocumentFiles(@Param('id', ParseUUIDPipe) id: string) {
    return this.aboutService.findDocumentFiles(id);
  }

  @Post('admin/documents/:id/files')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  addDocumentFile(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateAboutDocumentFileDto,
  ) {
    return this.aboutService.addDocumentFile(id, dto);
  }

  @Get('admin/files/:fileId/url')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  getAdminFileUrl(@Param('fileId', ParseUUIDPipe) fileId: string) {
    return this.aboutService.getAdminFileUrl(fileId);
  }

  @Delete('admin/files/:fileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDocumentFile(@Param('fileId', ParseUUIDPipe) fileId: string) {
    return this.aboutService.removeDocumentFile(fileId);
  }
}
