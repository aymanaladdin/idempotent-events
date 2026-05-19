import 'reflect-metadata';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';
import { AppConfig } from './config/app.config';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.setGlobalPrefix('api', {
    exclude: ['/reference', '/health', '/health/live', '/health/ready'],
  });
  app.enableVersioning({ type: VersioningType.URI });

  app.enableShutdownHooks();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
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

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use(
    '/reference',
    apiReference({
      spec: { content: document },
      theme: 'purple',
    }),
  );

  const port = app.get(ConfigService).getOrThrow<AppConfig>('app').port;
  await app.listen(port);
}

bootstrap();
