import { createHash } from 'node:crypto';
import type { Request } from 'express';
import type { SessionMeta } from './session.service.js';

/** IP pseudonimizada (hash), nunca se persiste la IP en texto claro. */
export function extractSessionMeta(request: Request): SessionMeta {
  const ip = request.ip ?? request.socket.remoteAddress ?? '';
  return {
    userAgent: request.headers['user-agent'],
    ipHash: ip ? createHash('sha256').update(ip).digest('hex') : undefined,
  };
}
