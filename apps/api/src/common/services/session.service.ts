import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service.js';
import { TokenService } from './token.service.js';
import type { AuthenticatedUser } from '../types.js';

export interface SessionMeta {
  userAgent?: string;
  ipHash?: string;
}

export interface CreatedSession {
  sessionId: string;
  rawRefreshToken: string;
  expiresAt: Date;
  refreshExpiresAt: Date;
}

export type RotateResult =
  | { outcome: 'rotated'; session: CreatedSession }
  | { outcome: 'invalid' }
  | { outcome: 'reused_revoked_token'; userId: string };

@Injectable()
export class SessionService {
  private readonly sessionTtlSeconds: number;
  private readonly refreshTtlSeconds: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {
    this.sessionTtlSeconds = Number(
      this.config.get('SESSION_TTL_SECONDS') ?? 900,
    );
    this.refreshTtlSeconds = Number(
      this.config.get('REFRESH_TTL_SECONDS') ?? 1_209_600,
    );
  }

  async createSession(
    userId: string,
    meta: SessionMeta = {},
  ): Promise<CreatedSession> {
    const now = Date.now();
    const expiresAt = new Date(now + this.sessionTtlSeconds * 1000);
    const refreshExpiresAt = new Date(now + this.refreshTtlSeconds * 1000);
    const rawRefreshToken = this.tokens.generateRawToken();

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: this.tokens.hashToken(rawRefreshToken),
        userAgent: meta.userAgent,
        ipHash: meta.ipHash,
        expiresAt,
        refreshExpiresAt,
      },
    });

    return {
      sessionId: session.id,
      rawRefreshToken,
      expiresAt,
      refreshExpiresAt,
    };
  }

  /** Usado por el guard de autenticación: sesión vigente (no vencida, no revocada). */
  async loadAuthenticatedUser(
    sessionId: string,
  ): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() < Date.now()
    ) {
      return null;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: session.userId },
      include: { userRoles: true },
    });
    // 'pending' (verificación de email no obligatoria en esta pasada, ver ADR
    // 0002) sigue pudiendo autenticarse; solo 'suspended' bloquea la sesión.
    if (!user || user.deletedAt || user.status === 'suspended') {
      return null;
    }

    const roles = await this.prisma.role.findMany({
      where: { id: { in: user.userRoles.map((ur) => ur.roleId) } },
    });
    const roleById = new Map(roles.map((r) => [r.id, r.key]));

    return {
      id: user.id,
      email: user.email,
      roles: user.userRoles.map((ur) => ({
        roleKey: (roleById.get(ur.roleId) ??
          'student') as AuthenticatedUser['roles'][number]['roleKey'],
        organizationId: ur.organizationId,
      })),
    };
  }

  /**
   * Rota el refresh token: revoca la sesión presentada y crea una nueva. Si el
   * token presentado corresponde a una sesión YA revocada, se interpreta como
   * reuso de un token robado/rotado y se señaliza para revocar toda la cadena
   * del usuario (ver docs/adr/0002).
   */
  async rotate(
    sessionId: string,
    rawRefreshToken: string,
    meta: SessionMeta = {},
  ): Promise<RotateResult> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) return { outcome: 'invalid' };

    const presentedHash = this.tokens.hashToken(rawRefreshToken);
    if (presentedHash !== session.refreshTokenHash)
      return { outcome: 'invalid' };

    if (session.revokedAt) {
      return { outcome: 'reused_revoked_token', userId: session.userId };
    }
    if (session.refreshExpiresAt.getTime() < Date.now()) {
      return { outcome: 'invalid' };
    }

    await this.prisma.session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    const next = await this.createSession(session.userId, meta);
    return { outcome: 'rotated', session: next };
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
