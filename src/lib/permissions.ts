import { SessionUser } from './auth'
import { verifySiteAssignment } from './site-mode'

export class PermissionError extends Error {
  status: number
  constructor(message: string) {
    super(message)
    this.name = 'PermissionError'
    this.status = 403
  }
}

/**
 * Ensure user has one of the required roles.
 */
export function assertRole(user: SessionUser, ...allowedRoles: string[]) {
  if (!allowedRoles.includes(user.role)) {
    throw new PermissionError(`Role '${user.role}' is not authorized for this operation`)
  }
}

/**
 * Ensure foreman is assigned to the given site.
 * PMs and admins skip this check (they have org-wide access).
 */
export async function assertSiteAccess(user: SessionUser, siteId: string) {
  if (user.role === 'admin' || user.role === 'owner' || user.role === 'pm') return

  const hasAccess = await verifySiteAssignment(user.id, siteId)
  if (!hasAccess) {
    throw new PermissionError('You are not assigned to this site')
  }
}

/**
 * Ensure the user owns a specific record (for foreman edit operations).
 */
export function assertOwnership(user: SessionUser, recordCreatedById: string) {
  if (user.role === 'admin' || user.role === 'owner') return // Management-class can access anything
  if (user.id !== recordCreatedById) {
    throw new PermissionError('You can only modify your own records')
  }
}
