import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { access, writeFile } from 'fs/promises';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadsRoot = process.env.UPLOADS_ROOT || join(process.cwd(), 'uploads');
  if (!existsSync(uploadsRoot)) {
    mkdirSync(uploadsRoot, { recursive: true });
  }
  try {
    await access(uploadsRoot);
    const probePath = join(uploadsRoot, '.healthcheck');
    await writeFile(probePath, `ok:${new Date().toISOString()}\n`);
  } catch (error) {
    // Fail fast if mounted disk is not writable.
    // eslint-disable-next-line no-console
    console.error(`Uploads root is not writable: ${uploadsRoot}`, error);
    process.exit(1);
  }

  app.use('/uploads', express.static(uploadsRoot));

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
