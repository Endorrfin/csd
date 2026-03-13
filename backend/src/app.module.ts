import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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


@Module({
  imports: [
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
          // synchronize: true creates tables automatically based on entities.
          // For development only! Use migrations in production.
          synchronize: true,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
