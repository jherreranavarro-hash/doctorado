import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { SKIP_CSRF_KEY } from '../decorators/skip-csrf.decorator.js';
import { CsrfService } from '../services/csrf.service.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-csrf-token';

/**
 * Synchronizer token derivado de la sesión (ver CsrfService) — no doble-
 * submit por cookie, porque apps/web y apps/api están en dominios distintos
 * en producción y una cookie de un dominio nunca es legible por JS del otro
 * (ver ADR 0011). Requiere que SessionAuthGuard haya corrido antes y haya
 * poblado request.sessionId.
 */
@Injectable()
export class CsrfGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly csrf: CsrfService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;

    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_CSRF_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) return true;

    const headerToken = request.headers[CSRF_HEADER];
    if (
      !request.sessionId ||
      typeof headerToken !== 'string' ||
      !this.csrf.verifyToken(request.sessionId, headerToken)
    ) {
      throw new ForbiddenException('Token CSRF inválido o ausente');
    }
    return true;
  }
}
