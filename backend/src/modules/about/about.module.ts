import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AboutController } from './about.controller';
import { AboutService } from './about.service';
import { AboutSection } from './entities/about-section.entity';
import { AboutDocument } from './entities/about-document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AboutSection, AboutDocument])],
  controllers: [AboutController],
  providers: [AboutService],
})
export class AboutModule {}
