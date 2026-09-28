import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    if (!request.user) {
      throw new Error(
        'CurrentUser() usado fuera de una ruta protegida por SessionAuthGuard',
      );
    }
    return request.user;
  },
);
