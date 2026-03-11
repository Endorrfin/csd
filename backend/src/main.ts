import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  // CORS — allows the Angular dev server to access the API
  app.enableCors({
    origin: ['http://localhost:4200'], // Angular dev server
    credentials: true,
  });

  // Global DTO validation — rejects requests with invalid data
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true, // Removes fields that are not in the DTO
        forbidNonWhitelisted: true, // Error if extra fields are received
        transform: true, // Automatic type conversion
      }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
