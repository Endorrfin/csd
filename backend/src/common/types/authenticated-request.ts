import { Request } from 'express';
import { UserRole } from '../../modules/users/entities/user.entity';

// === ADDED: shared typed request so controllers/guards stop reading `any.user` ===

/**
 * Shape of `req.user` after a JWT-authenticated guard has run.
 * Mirrors exactly what `JwtStrategy.validate()` returns.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Express request augmented with the authenticated user. */
export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
