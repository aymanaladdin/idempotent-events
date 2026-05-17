import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', {
    exclude: ['/ui/dashboard', '/reference', '/health', '/health/live', '/health/ready'],
  });
  app.enableVersioning({ type: VersioningType.URI });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Idempotent Events API')
    .setDescription('Station transfer event ingestion with idempotency guarantees')
    .setVersion('1.0')
    .addBasicAuth()
    .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'x-api-key')
    .build();

  SwaggerModule.createDocument(app, swaggerConfig);

  const port = app.get(ConfigService).get<AppConfig>('app').port;
  await app.listen(port);
}

bootstrap();
