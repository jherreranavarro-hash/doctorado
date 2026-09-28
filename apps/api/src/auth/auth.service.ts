import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  SessionService,
  type SessionMeta,
  type CreatedSession,
} from '../common/services/session.service.js';
import { TokenService } from '../common/services/token.service.js';
import type { LoginDto } from './dto/login.dto.js';

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

// Hash "señuelo" contra el que se compara cuando el email no existe, para que
// login() tome un tiempo similar tanto si el usuario existe como si no
// (mitiga enumeración de cuentas por temporización). Se calcula una vez.
let decoyHashPromise: Promise<string> | null = null;
function getDecoyHash(): Promise<string> {
  decoyHashPromise ??= argon2.hash('decoy-password-never-used', {
    type: argon2.argon2id,
  });
  return decoyHashPromise;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly argonOptions: argon2.Options;

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: SessionService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {
    this.argonOptions = {
      type: argon2.argon2id,
      memoryCost: Number(this.config.get('ARGON2_MEMORY_COST_KIB') ?? 19_456),
      timeCost: Number(this.config.get('ARGON2_TIME_COST') ?? 2),
      parallelism: Number(this.config.get('ARGON2_PARALLELISM') ?? 1),
    };
  }

  /**
   * Expuesto para DoctoralAdmin (alta de personas): usa exactamente el mismo
   * costo argon2 que resetPassword, en vez de duplicar la configuración de
   * ConfigService en otro servicio.
   */
  async hashPassword(password: string): Promise<string> {
    return argon2.hash(password, this.argonOptions);
  }

  async login(
    dto: LoginDto,
    meta: SessionMeta,
  ): Promise<{ userId: string; session: CreatedSession }> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });

    const hashToCompare = user?.passwordHash ?? (await getDecoyHash());
    const passwordOk = await argon2
      .verify(hashToCompare, dto.password)
      .catch(() => false);

    if (!user || !passwordOk || user.deletedAt || user.status === 'suspended') {
      await this.prisma.securityEvent.create({
        data: { userId: user?.id, eventType: 'login_failed', severity: 'info' },
      });
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const session = await this.sessions.createSession(user.id, meta);
    await this.prisma.auditLog.create({
      data: {
        actorUserId: user.id,
        action: 'user.login',
        entityType: 'user',
        entityId: user.id,
      },
    });
    return { userId: user.id, session };
  }

  async logout(sessionId: string): Promise<void> {
    await this.sessions.revoke(sessionId);
  }

  async refresh(
    sessionId: string,
    rawRefreshToken: string,
    meta: SessionMeta,
  ): Promise<{ session: CreatedSession }> {
    const result = await this.sessions.rotate(sessionId, rawRefreshToken, meta);
    if (result.outcome === 'invalid') {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
    if (result.outcome === 'reused_revoked_token') {
      this.logger.warn(
        `Reuso de refresh token detectado para usuario ${result.userId} — revocando todas sus sesiones`,
      );
      await this.sessions.revokeAllForUser(result.userId);
      await this.prisma.securityEvent.create({
        data: {
          userId: result.userId,
          eventType: 'refresh_token_reuse',
          severity: 'high',
        },
      });
      throw new UnauthorizedException(
        'Sesión inválida — por seguridad, vuelve a iniciar sesión',
      );
    }
    return { session: result.session };
  }

  async requestPasswordReset(email: string): Promise<void> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });
    // Respuesta idéntica exista o no el usuario, para no permitir enumeración.
    if (!user) return;

    const rawToken = this.tokens.generateRawToken();
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.tokens.hashToken(rawToken),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });
    this.logger.warn(
      `[dev] Token de reset de password para ${normalized}: ${rawToken}`,
    );
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<void> {
    const tokenHash = this.tokens.hashToken(rawToken);
    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt.getTime() < Date.now()
    ) {
      throw new UnauthorizedException('Token de reset inválido o expirado');
    }

    const passwordHash = await argon2.hash(newPassword, this.argonOptions);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);
    await this.sessions.revokeAllForUser(resetToken.userId);
    await this.prisma.auditLog.create({
      data: {
        actorUserId: resetToken.userId,
        action: 'user.password_reset',
        entityType: 'user',
        entityId: resetToken.userId,
      },
    });
  }
}
