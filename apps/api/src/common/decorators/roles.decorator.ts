import { SetMetadata } from '@nestjs/common';
import type { Role } from '@doctorado/shared';

export const ROLES_KEY = 'roles';

/** Restringe un endpoint a usuarios que tengan al menos uno de estos roles (en alguna organización). */
export const Roles = (...roles: Role[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
