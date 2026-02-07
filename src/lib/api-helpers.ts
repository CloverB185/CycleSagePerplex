import { NextResponse } from 'next/server'
import { AuthError } from './auth'
import { PermissionError } from './permissions'
import { SiteModeError } from './site-mode'

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
