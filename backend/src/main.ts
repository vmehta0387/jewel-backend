import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { access, writeFile } from 'fs/promises';
import { join } from 'path';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
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

  const allowedOrigins = (process.env.CORS_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
  const allowedOriginSet = new Set(allowedOrigins);
  const normalizeOrigin = (origin?: string) => origin?.replace(/\/$/, '');
  const isDevLocalOrigin = (origin?: string) =>
    !origin ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
    /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
    /^https?:\/\/172\.(1[6-9]|2\d|3[01])\.\d+\.\d+(:\d+)?$/.test(origin);
  const alwaysAllowedLocalWebOrigins = new Set([
    'http://localhost:8082',
    'http://127.0.0.1:8082',
  ]);
  const isAllowedCorsOrigin = (origin?: string) => {
    const requestOrigin = normalizeOrigin(origin);
    return Boolean(
      !origin ||
      (requestOrigin && allowedOriginSet.has(requestOrigin)) ||
      (requestOrigin && alwaysAllowedLocalWebOrigins.has(requestOrigin)) ||
      isDevLocalOrigin(requestOrigin),
    );
  };



  app.use('/uploads', express.static(uploadsRoot));

  app.setGlobalPrefix('api');
  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        isAllowedCorsOrigin(origin)
      ) {
        callback(null, true);
        return;
      }

      logger.warn(`Blocked CORS origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
    allowedHeaders: ['Authorization', 'Content-Type', 'Accept', 'Origin', 'X-Requested-With'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    optionsSuccessStatus: 204,
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(process.env.PORT || 3000, '0.0.0.0');
}
bootstrap();
