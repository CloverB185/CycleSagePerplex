'use client'

import { useState } from 'react'
import {
  Smartphone,
  Tablet,
  Monitor,
  Sun,
  CloudRain,
  Battery,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Wrench,
} from 'lucide-react'
import clsx from 'clsx'

type Viewport = 'mobile' | 'tablet' | 'desktop'
type FieldCondition = 'sunny' | 'rainy' | 'dusty'

const VIEWPORTS: Record<Viewport, { width: string; label: string; icon: typeof Smartphone }> = {
  mobile: { width: '390px', label: '390px', icon: Smartphone },
  tablet: { width: '768px', label: '768px', icon: Tablet },
  desktop: { width: '100%', label: 'Full', icon: Monitor },
}

const FIELD_CONDITIONS: Record<FieldCondition, { label: string; className: string }> = {
  sunny: { label: 'Sunny', className: '' },
  rainy: { label: 'Rain', className: 'brightness-90 contrast-110' },
  dusty: { label: 'Dusty', className: 'brightness-95 sepia-[0.15]' },
}

export type DevToolbarState = {
  viewport: Viewport
  fieldCondition: FieldCondition
  lowBattery: boolean
  offline: boolean
  visible: boolean
}

type Props = {
  state: DevToolbarState
  onChange: (state: DevToolbarState) => void
}

export default function DevToolbar({ state, onChange }: Props) {
  const [expanded, setExpanded] = useState(false)

  const update = (partial: Partial<DevToolbarState>) => {
    onChange({ ...state, ...partial })
  }

  if (!state.visible) {
    return (
      <button
        onClick={() => update({ visible: true })}
        className="fixed bottom-4 right-4 z-[9999] w-10 h-10 bg-site-800 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-site-700 transition-colors"
        title="Show DevToolbar"
      >
        <Wrench className="w-4 h-4" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-site-900 text-white border-t border-site-700 shadow-lg">
      {/* Compact bar */}
      <div className="flex items-center justify-between px-3 py-2 gap-2">
        <div className="flex items-center gap-1">
          <Wrench className="w-3.5 h-3.5 text-construction-400" />
          <span className="text-mobile-xs font-bold text-construction-400 uppercase tracking-wider">Dev</span>
        </div>

        {/* Viewport switcher */}
        <div className="flex items-center gap-0.5 bg-site-800 rounded-lg p-0.5">
          {(Object.entries(VIEWPORTS) as [Viewport, typeof VIEWPORTS.mobile][]).map(([key, vp]) => {
            const Icon = vp.icon
            return (
              <button
                key={key}
                onClick={() => update({ viewport: key })}
                className={clsx(
                  'flex items-center gap-1 px-2 py-1 rounded-md text-mobile-xs font-medium transition-all',
                  state.viewport === key
                    ? 'bg-construction-500 text-white'
                    : 'text-site-400 hover:text-white'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{vp.label}</span>
              </button>
            )
          })}
        </div>

        {/* Quick indicators */}
        <div className="flex items-center gap-2">
          {state.lowBattery && <Battery className="w-3.5 h-3.5 text-safety-red" />}
          {state.offline && <WifiOff className="w-3.5 h-3.5 text-safety-amber" />}
          {state.fieldCondition !== 'sunny' && (
            <CloudRain className="w-3.5 h-3.5 text-blue-400" />
          )}
        </div>

        {/* Expand/collapse */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded hover:bg-site-700 transition-colors"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={() => update({ visible: false })}
            className="p-1 rounded hover:bg-site-700 transition-colors"
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-site-700 space-y-3 animate-slide-up">
          {/* Field conditions */}
          <div>
            <p className="text-mobile-xs font-bold text-site-400 uppercase tracking-wider mb-1.5">
              Field Conditions
            </p>
            <div className="flex gap-1.5">
              {(Object.entries(FIELD_CONDITIONS) as [FieldCondition, typeof FIELD_CONDITIONS.sunny][]).map(
                ([key, cond]) => (
                  <button
                    key={key}
                    onClick={() => update({ fieldCondition: key })}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-mobile-xs font-medium transition-all',
                      state.fieldCondition === key
                        ? 'bg-construction-500 text-white'
                        : 'bg-site-800 text-site-400 hover:text-white'
                    )}
                  >
                    {key === 'sunny' && <Sun className="w-3.5 h-3.5" />}
                    {key === 'rainy' && <CloudRain className="w-3.5 h-3.5" />}
                    {key === 'dusty' && <Eye className="w-3.5 h-3.5" />}
                    {cond.label}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Simulators */}
          <div>
            <p className="text-mobile-xs font-bold text-site-400 uppercase tracking-wider mb-1.5">
              Simulators
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => update({ lowBattery: !state.lowBattery })}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-mobile-xs font-medium transition-all',
                  state.lowBattery
                    ? 'bg-safety-red text-white'
                    : 'bg-site-800 text-site-400 hover:text-white'
                )}
              >
                <Battery className="w-3.5 h-3.5" />
                Low Battery
              </button>
              <button
                onClick={() => update({ offline: !state.offline })}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-mobile-xs font-medium transition-all',
                  state.offline
                    ? 'bg-safety-amber text-white'
                    : 'bg-site-800 text-site-400 hover:text-white'
                )}
              >
                {state.offline ? <WifiOff className="w-3.5 h-3.5" /> : <Wifi className="w-3.5 h-3.5" />}
                Offline
              </button>
            </div>
          </div>

          {/* Viewport info */}
          <div className="flex items-center justify-between text-mobile-xs text-site-500">
            <span>Viewport: {VIEWPORTS[state.viewport].label}</span>
            <span className="text-site-600">OnsitePro Dev Mode</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Utility: get CSS filter for field condition
export function getFieldConditionFilter(condition: FieldCondition): string {
  return FIELD_CONDITIONS[condition]?.className || ''
}

// Utility: get viewport max-width
export function getViewportWidth(viewport: Viewport): string {
  return VIEWPORTS[viewport]?.width || '100%'
}
