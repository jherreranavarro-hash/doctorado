import type { Role } from '@doctorado/shared';

export interface AuthenticatedUserRole {
  roleKey: Role;
  organizationId: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: AuthenticatedUserRole[];
}

declare module 'express' {
  interface Request {
    user?: AuthenticatedUser;
    sessionId?: string;
  }
}
