import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import {
  RequestPasswordResetDto,
  ResetPasswordDto,
} from './dto/password-reset.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { SkipCsrf } from '../common/decorators/skip-csrf.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { extractSessionMeta } from '../common/services/request-meta.util.js';
import { CsrfService } from '../common/services/csrf.service.js';
import type { CreatedSession } from '../common/services/session.service.js';
import type { AuthenticatedUser } from '../common/types.js';

const SESSION_COOKIE = 'sid';
const REFRESH_COOKIE = 'rt';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
    private readonly csrf: CsrfService,
  ) {}

  private get isProd(): boolean {
    return this.config.get('NODE_ENV') === 'production';
  }

  private setSessionCookies(res: Response, session: CreatedSession): void {
    const secure = this.isProd;
    // apps/web y apps/api viven en dominios distintos en producción
    // (vercel.app / railway.app) — eso hace que el fetch del frontend sea
    // cross-site, y SameSite=Lax bloquea el envío de la cookie en ese caso.
    // None (que exige Secure) es el ajuste correcto aquí; la protección CSRF
    // ya no depende de una cookie legible (ver CsrfService/ADR 0011), así
    // que None no reabre ese riesgo. En dev (mismo host, solo puertos
    // distintos) Lax basta y evita depender de HTTPS local.
    const sameSite = this.isProd ? 'none' : 'lax';
    const refreshMaxAge = session.refreshExpiresAt.getTime() - Date.now();

    res.cookie(SESSION_COOKIE, session.sessionId, {
      httpOnly: true,
      secure,
      sameSite,
      path: '/',
      maxAge: refreshMaxAge,
    });
    res.cookie(
      REFRESH_COOKIE,
      `${session.sessionId}:${session.rawRefreshToken}`,
      {
        httpOnly: true,
        secure,
        sameSite,
        path: '/auth',
        maxAge: refreshMaxAge,
      },
    );
  }

  private clearSessionCookies(res: Response): void {
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.clearCookie(REFRESH_COOKIE, { path: '/auth' });
  }

  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ userId: string; csrfToken: string }> {
    const { userId, session } = await this.auth.login(
      dto,
      extractSessionMeta(req),
    );
    this.setSessionCookies(res, session);
    return { userId, csrfToken: this.csrf.computeToken(session.sessionId) };
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    if (req.sessionId) {
      await this.auth.logout(req.sessionId);
    }
    this.clearSessionCookies(res);
  }

  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true; csrfToken: string }> {
    const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!raw || !raw.includes(':')) {
      throw new UnauthorizedException('Falta el refresh token');
    }
    const [sessionId, rawRefreshToken] = raw.split(':', 2);
    const { session } = await this.auth.refresh(
      sessionId,
      rawRefreshToken,
      extractSessionMeta(req),
    );
    this.setSessionCookies(res, session);
    return { ok: true, csrfToken: this.csrf.computeToken(session.sessionId) };
  }

  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('request-password-reset')
  async requestPasswordReset(
    @Body() dto: RequestPasswordResetDto,
  ): Promise<{ message: string }> {
    await this.auth.requestPasswordReset(dto.email);
    return {
      message:
        'Si el correo existe, se enviarán instrucciones para restablecer la contraseña.',
    };
  }

  @Public()
  @SkipCsrf()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ ok: true }> {
    await this.auth.resetPassword(dto.token, dto.newPassword);
    return { ok: true };
  }

  @Get('me')
  me(
    @CurrentUser() user: AuthenticatedUser,
    @Req() req: Request,
  ): AuthenticatedUser & { csrfToken: string } {
    // req.sessionId siempre está poblado aquí (ruta protegida por
    // SessionAuthGuard) — se usa para que el cliente pueda recuperar un
    // token CSRF válido tras recargar la página, sin volver a autenticarse.
    return { ...user, csrfToken: this.csrf.computeToken(req.sessionId!) };
  }
}
