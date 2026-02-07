'use client'

import { LucideIcon, ChevronRight } from 'lucide-react'
import clsx from 'clsx'

type Props = {
  icon: LucideIcon
  title: string
  subtitle: string
  onClick: () => void
  variant?: 'default' | 'orange' | 'red' | 'green' | 'purple'
  badge?: string | number
  badgeColor?: 'red' | 'amber' | 'green' | 'blue'
  pulse?: boolean
}

const variants = {
  default: {
    iconBg: 'bg-brand-50',
    iconColor: 'text-brand-600',
    hoverBorder: 'hover:border-brand-300',
    activeBg: 'active:bg-brand-50/50',
  },
  orange: {
    iconBg: 'bg-construction-50',
    iconColor: 'text-construction-600',
    hoverBorder: 'hover:border-construction-300',
    activeBg: 'active:bg-construction-50/50',
  },
  red: {
    iconBg: 'bg-red-50',
    iconColor: 'text-safety-red',
    hoverBorder: 'hover:border-red-300',
    activeBg: 'active:bg-red-50/50',
  },
  green: {
    iconBg: 'bg-green-50',
    iconColor: 'text-safety-green',
    hoverBorder: 'hover:border-green-300',
    activeBg: 'active:bg-green-50/50',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    hoverBorder: 'hover:border-purple-300',
    activeBg: 'active:bg-purple-50/50',
  },
}

const badgeColors = {
  red: 'bg-safety-red text-white',
  amber: 'bg-safety-amber text-white',
  green: 'bg-safety-green text-white',
  blue: 'bg-brand-500 text-white',
}

export default function QuickActionCard({
  icon: Icon,
  title,
  subtitle,
  onClick,
  variant = 'default',
  badge,
  badgeColor = 'blue',
  pulse,
}: Props) {
  const v = variants[variant]

  return (
    <button
      onClick={onClick}
      className={clsx(
        'w-full flex items-center gap-4 min-h-[120px] p-4',
        'bg-white rounded-2xl border-2 border-site-100',
        'shadow-card hover:shadow-card-hover',
        'active:scale-[0.98] transition-all duration-150',
        v.hoverBorder,
        v.activeBg,
        pulse && 'animate-pulse-glow'
      )}
    >
      {/* Large icon container */}
      <div
        className={clsx(
          'w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 relative',
          v.iconBg
        )}
      >
        <Icon className={clsx('w-8 h-8', v.iconColor)} strokeWidth={1.75} />
        {badge !== undefined && badge !== 0 && (
          <span
            className={clsx(
              'absolute -top-2 -right-2 text-xs font-bold rounded-full',
              'min-w-[24px] h-[24px] flex items-center justify-center px-1.5',
              'shadow-sm',
              badgeColors[badgeColor]
            )}
          >
            {badge}
          </span>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 text-left">
        <h3 className="font-bold text-site-800 text-mobile-lg leading-tight">{title}</h3>
        <p className="text-mobile-sm text-site-500 mt-1 line-clamp-2">{subtitle}</p>
      </div>

      {/* Chevron */}
      <ChevronRight className="w-5 h-5 text-site-300 flex-shrink-0" />
    </button>
  )
}
