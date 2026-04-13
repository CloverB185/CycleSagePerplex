import { prisma } from './prisma'

export type AuditAction = 'create' | 'update' | 'archive' | 'submit' | 'status_change' | 'close' | 'override' | 'reassign' | 'membership_add' | 'membership_remove' | 'role_change' | 'login' | 'logout' | 'login_failed'

export async function logAudit(params: {
  entityType: string
  entityId: string
  action: AuditAction
  performedById: string
  changesBefore?: Record<string, unknown> | null
  changesAfter?: Record<string, unknown> | null
  comment?: string | null
}) {
  await prisma.auditLog.create({
    data: {
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      performedById: params.performedById,
      changesBefore: params.changesBefore ? JSON.stringify(params.changesBefore) : null,
      changesAfter: params.changesAfter ? JSON.stringify(params.changesAfter) : null,
      comment: params.comment ?? null,
    },
  })
}
