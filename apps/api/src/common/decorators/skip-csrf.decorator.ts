import { SetMetadata } from '@nestjs/common';

export const SKIP_CSRF_KEY = 'skipCsrf';

/**
 * Exime a un endpoint del chequeo de CSRF de doble-submit. Úsese solo en
 * endpoints que aún no tienen una sesión establecida (login, registro,
 * refresh) — todo lo demás que mute estado debe quedar protegido.
 */
export const SkipCsrf = (): ReturnType<typeof SetMetadata> =>
  SetMetadata(SKIP_CSRF_KEY, true);
