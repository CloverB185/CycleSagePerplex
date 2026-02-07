'use client'

import { useState } from 'react'
import DevToolbar, { DevToolbarState, getFieldConditionFilter, getViewportWidth } from './DevToolbar'
import clsx from 'clsx'

export function DevToolbarWrapper({ children }: { children: React.ReactNode }) {
  const [devState, setDevState] = useState<DevToolbarState>({
    viewport: 'mobile',
    fieldCondition: 'sunny',
    lowBattery: false,
    offline: false,
    visible: false,
  })

  const isDev = process.env.NODE_ENV === 'development'
  const viewportWidth = getViewportWidth(devState.viewport)
  const fieldFilter = getFieldConditionFilter(devState.fieldCondition)
  const isConstrained = isDev && devState.visible && devState.viewport !== 'desktop'

  return (
    <>
      {/* Viewport container */}
      <div
        className={clsx(
          'min-h-screen transition-all duration-300',
          fieldFilter,
          isConstrained && 'mx-auto border-x border-site-200 shadow-lg bg-white'
        )}
        style={isConstrained ? { maxWidth: viewportWidth } : undefined}
      >
        {/* Low battery indicator */}
        {isDev && devState.visible && devState.lowBattery && (
          <div className="bg-safety-red text-white text-center text-mobile-xs font-bold py-1">
            Low Battery Mode — Reduced animations
          </div>
        )}

        {/* Offline indicator */}
        {isDev && devState.visible && devState.offline && (
          <div className="bg-safety-amber text-white text-center text-mobile-xs font-bold py-1">
            Offline Mode — Queuing changes
          </div>
        )}

        {children}

        {/* Bottom padding when DevToolbar is visible */}
        {isDev && devState.visible && <div className="h-14" />}
      </div>

      {/* DevToolbar (dev only) */}
      {isDev && (
        <DevToolbar state={devState} onChange={setDevState} />
      )}
    </>
  )
}
