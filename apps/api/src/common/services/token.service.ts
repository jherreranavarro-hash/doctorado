import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Utilidades para tokens opacos de un solo uso (refresh, reset de password,
 * verificación de email, CSRF). No confundir con el hashing de contraseñas de
 * usuario (ver AuthService, que usa Argon2id) — estos tokens ya tienen entropía
 * completa por construcción, así que un hash rápido (SHA-256) es apropiado y es
 * la práctica estándar para "lookup secrets" de este tipo.
 */
@Injectable()
export class TokenService {
  generateRawToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }

  hashToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
