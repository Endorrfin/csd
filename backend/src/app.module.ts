import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { loggerConfig } from './common/logger/logger.config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDatabaseSslOptions } from './database/db-ssl';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { BlogModule } from './modules/blog/blog.module';
import { PartnersModule } from './modules/partners/partners.module';
import { CooperationModule } from './modules/cooperation/cooperation.module';
import { NeedsModule } from './modules/needs/needs.module';
import { EquipmentCatalogModule } from './modules/equipment-catalog/equipment-catalog.module';
import { UploadModule } from './modules/upload/upload.module';
import { ProcurementModule } from './modules/procurement/procurement.module';
import { VacancyModule } from './modules/vacancy/vacancy.module';
import { TestimonialModule } from './modules/testimonial/testimonial.module';
import { ComplaintModule } from './modules/complaint/complaint.module';
import { InquiryModule } from './modules/inquiry/inquiry.module'; // CHANGED: register contact-form inquiries module
import { AboutModule } from './modules/about/about.module';

@Module({
  imports: [
    // First in the list on purpose: LoggerModule registers pino-http as
    // middleware, and it has to wrap every other one.
    LoggerModule.forRoot(loggerConfig),

    // Loads .env into process.env, accessible via ConfigService
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Connecting to PostgreSQL using variables from .env
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_NAME'),
        autoLoadEntities: true,
        // synchronize: config.get<string>('NODE_ENV') !== 'production',
        synchronize: false,
        // synchronize: true, // initial create table RDS
        // was `{ rejectUnauthorized: false }` — encrypted but UNVERIFIED.
        // The TLS decision now lives in db-ssl.ts and is shared with the CLI
        // DataSource used by migration:run, so the two cannot drift apart.
        ssl: getDatabaseSslOptions(config.get<string>('NODE_ENV')),
      }),
    }),
    UsersModule,
    AuthModule,
    ContentModule,
    BlogModule,
    PartnersModule,
    CooperationModule,
    EquipmentCatalogModule,
    NeedsModule,
    UploadModule,
    ProcurementModule,
    VacancyModule,
    TestimonialModule,
    ComplaintModule,
    InquiryModule,
    AboutModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
