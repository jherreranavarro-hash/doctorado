import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { Role } from '@doctorado/shared';
import { ROLES_KEY } from '../decorators/roles.decorator.js';

/**
 * Deniega por defecto: si un handler no declara @Roles(...), este guard lo
 * bloquea salvo que también esté marcado @Public(). Requiere que
 * SessionAuthGuard haya corrido antes y haya poblado request.user.
 *
 * Solo valida pertenencia a rol; la verificación de organización/tenant y de
 * ownership del recurso específico es responsabilidad de cada handler/servicio
 * de dominio (Fase 2+), ya que depende del recurso que se está accediendo.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const userRoles = new Set(request.user?.roles.map((r) => r.roleKey) ?? []);
    const allowed = requiredRoles.some((role) => userRoles.has(role));
    if (!allowed) {
      throw new ForbiddenException(
        'No tienes el rol requerido para esta acción',
      );
    }
    return true;
  }
}
