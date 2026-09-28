import { NestFactory } from '@nestjs/core';
import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // El límite JSON por defecto (100kb) no alcanza: los archivos de
  // doctoral-assignments (plantillas/entregas) viajan como base64 dentro del
  // mismo body JSON (ver DoctoralFilesService, tope de 15MB en binario ≈
  // 20MB en base64) — 25mb cubre ese caso con margen, no es un límite laxo
  // global.
  app.useBodyParser('json', { limit: '25mb' });

  // API de solo-JSON: sin CSP con nonce (eso vive en apps/web, que sirve
  // HTML), pero sí el resto del set de cabeceras exigido: HSTS,
  // X-Content-Type-Options, Referrer-Policy, Permissions-Policy y
  // frame-ancestors/clickjacking.
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] },
      },
      hsts: { maxAge: 63_072_000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=()',
    );
    next();
  });
  app.use(cookieParser());

  app.enableCors({
    // Lista permitida explícita (no '*'): solo los orígenes del frontend configurado.
    origin: (process.env.CORS_ALLOWED_ORIGINS ?? 'http://localhost:3000').split(
      ',',
    ),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      // Por defecto Nest concatena TODOS los mensajes de TODOS los campos en
      // un array (`message: string[]`) — si el frontend los muestra tal
      // cual, un formulario con dos campos inválidos se ve como
      // "msg1,msg2" (Array#toString). Nos quedamos solo con el primer
      // mensaje: cada decorador de los DTOs ya tiene texto en español (ver
      // apps/api/src/**/dto/*.dto.ts), así que sigue siendo accionable.
      exceptionFactory: (errors: ValidationError[]) => {
        const firstMessage = errors
          .flatMap((e) => Object.values(e.constraints ?? {}))
          .at(0);
        return new BadRequestException(
          firstMessage ?? 'Los datos enviados no son válidos',
        );
      },
    }),
  );

  // Railway (y la mayoría de PaaS) inyectan PORT y esperan que la app
  // escuche ahí — su healthcheck interno apunta a ese puerto, no al que
  // declaremos nosotros. API_PORT sigue siendo el nombre usado en dev local.
  const port = process.env.PORT ?? process.env.API_PORT ?? 4000;
  await app.listen(port);
}

void bootstrap();
