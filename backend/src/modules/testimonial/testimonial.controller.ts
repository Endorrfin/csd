import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { TestimonialService } from './testimonial.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { TestimonialStatus } from './entities/testimonial.entity';

@Controller('testimonials')
export class TestimonialController {
  constructor(private readonly service: TestimonialService) {}

  // Public: approved testimonials only
  @Get()
  findAll() {
    return this.service.findAllApproved();
  }

  // Manager+: all including pending/rejected
  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAllAdmin() {
    return this.service.findAll();
  }

  @Get(':id')
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  // Any registered user can submit a testimonial
  @Post()
  // @UseGuards(JwtAuthGuard) // any users publish Testimonial
  create(@Body() dto: CreateTestimonialDto, @Req() req: any) {
    return this.service.create(dto, req.user.id as string);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTestimonialDto,
  ) {
    return this.service.update(id, dto);
  }

  // Dedicated approve endpoint
  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  approve(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestimonialDto) {
    return this.service.update(id, {
      ...dto,
      status: TestimonialStatus.APPROVED,
    });
  }

  // Dedicated reject endpoint
  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.MANAGER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  reject(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTestimonialDto) {
    return this.service.update(id, {
      ...dto,
      status: TestimonialStatus.REJECTED,
    });
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.remove(id);
  }
}
