import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * CSRF por "synchronizer token" derivado de la sesión, NO por cookie
 * doble-submit: apps/web y apps/api viven en dominios distintos en
 * producción (vercel.app / railway.app), y `document.cookie` nunca puede
 * leer una cookie de un dominio distinto al de la página — el patrón
 * clásico de doble-submit-cookie es inviable aquí (ver ADR 0011). En su
 * lugar, el token es HMAC(sessionId) con un secreto que solo el servidor
 * conoce: se entrega en el cuerpo de la respuesta de login/registro/refresh
 * (nunca en una cookie), el cliente lo guarda en memoria y lo reenvía en el
 * header X-CSRF-Token — el servidor lo recalcula a partir del sessionId de
 * la propia sesión (ver SessionAuthGuard) y compara.
 */
@Injectable()
export class CsrfService {
  private readonly secret: string;

  constructor(private readonly config: ConfigService) {
    this.secret =
      this.config.get('SESSION_SECRET') ??
      'dev-only-insecure-csrf-secret-nunca-usar-en-produccion';
  }

  computeToken(sessionId: string): string {
    return createHmac('sha256', this.secret).update(sessionId).digest('hex');
  }

  verifyToken(sessionId: string, candidate: string): boolean {
    const expected = this.computeToken(sessionId);
    const expectedBuf = Buffer.from(expected, 'hex');
    const candidateBuf = Buffer.from(candidate, 'hex');
    if (expectedBuf.length !== candidateBuf.length) return false;
    return timingSafeEqual(expectedBuf, candidateBuf);
  }
}
