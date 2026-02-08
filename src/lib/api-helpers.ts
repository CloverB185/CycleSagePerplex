import { NextResponse } from 'next/server'
import { AuthError } from './auth'
import { PermissionError } from './permissions'
import { SiteModeError } from './site-mode'
import { prisma } from './prisma'

/**
 * Check syncActionId for idempotent PATCH/write operations.
 * Uses SyncAction table as a dedup log for operations that don't store syncActionId on the entity.
 * Returns true if already processed (caller should return early), false if new.
 */
export async function checkSyncDedup(syncActionId: string | undefined): Promise<boolean> {
  if (!syncActionId) return false
  const existing = await prisma.syncAction.findUnique({ where: { syncActionId } })
  return !!existing
}

/**
 * Record a completed sync action for idempotency tracking.
 */
export async function recordSyncAction(
  syncActionId: string,
  userId: string,
  actionType: string,
  payload: Record<string, unknown> = {}
) {
  await prisma.syncAction.create({
    data: {
      syncActionId,
      userId,
      actionType,
      payload: JSON.stringify(payload),
      status: 'completed',
      processedAt: new Date(),
    },
  }).catch(() => {
    // Ignore duplicate — race condition safe
  })
}

/**
 * Wraps an API handler with standardized error handling.
 */
export function apiHandler(
  handler: (req: Request, context?: unknown) => Promise<NextResponse>
) {
  return async (req: Request, context?: unknown) => {
    try {
      return await handler(req, context)
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        return NextResponse.json(
          { error: error.message, code: 'AUTH_ERROR' },
          { status: error.status }
        )
      }
      if (error instanceof PermissionError) {
        return NextResponse.json(
          { error: error.message, code: 'PERMISSION_ERROR' },
          { status: error.status }
        )
      }
      if (error instanceof SiteModeError) {
        return NextResponse.json(
          { error: error.message, code: error.code },
          { status: error.status }
        )
      }
      if (error instanceof ImmutabilityError) {
        return NextResponse.json(
          { error: error.message, code: 'IMMUTABILITY_VIOLATION' },
          { status: 409 }
        )
      }
      console.error('Unhandled API error:', error)
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
}

export class ImmutabilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ImmutabilityError'
  }
}
