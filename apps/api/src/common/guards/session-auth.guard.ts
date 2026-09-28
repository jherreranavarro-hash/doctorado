import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { SessionService } from '../services/session.service.js';

const SESSION_COOKIE = 'sid';

@Injectable()
export class SessionAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly sessions: SessionService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const sessionId = request.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!sessionId) {
      throw new UnauthorizedException('No hay sesión activa');
    }

    const user = await this.sessions.loadAuthenticatedUser(sessionId);
    if (!user) {
      throw new UnauthorizedException('Sesión inválida o expirada');
    }

    request.user = user;
    request.sessionId = sessionId;
    return true;
  }
}
