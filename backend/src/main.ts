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
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const normalizeOrigin = (origin?: string) => origin?.replace(/\/$/, '');
  const isDevLocalOrigin = (origin?: string) =>
    !origin ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin);

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const requestOrigin = normalizeOrigin(origin);
      if (
        (requestOrigin && allowedOrigins.includes(requestOrigin)) ||
        (process.env.NODE_ENV !== 'production' && isDevLocalOrigin(origin))
      ) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS origin not allowed: ${origin || 'unknown'}`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
