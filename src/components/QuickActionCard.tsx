'use client'

import { LucideIcon } from 'lucide-react'
import { ChevronRight } from 'lucide-react'

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
  },
  orange: {
    iconBg: 'bg-construction-50',
    iconColor: 'text-construction-600',
    hoverBorder: 'hover:border-construction-300',
  },
  red: {
    iconBg: 'bg-red-50',
    iconColor: 'text-safety-red',
    hoverBorder: 'hover:border-red-300',
  },
  green: {
    iconBg: 'bg-green-50',
    iconColor: 'text-safety-green',
    hoverBorder: 'hover:border-green-300',
  },
  purple: {
    iconBg: 'bg-purple-50',
    iconColor: 'text-purple-600',
    hoverBorder: 'hover:border-purple-300',
  },
}

const badgeColors = {
  red: 'bg-red-500 text-white',
  amber: 'bg-amber-500 text-white',
  green: 'bg-green-500 text-white',
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
      className={`card-interactive text-left w-full flex items-center gap-4 py-5 px-4 ${v.hoverBorder} ${pulse ? 'animate-pulse-glow' : ''}`}
    >
      <div className={`w-14 h-14 rounded-2xl ${v.iconBg} flex items-center justify-center flex-shrink-0 relative`}>
        <Icon className={`w-7 h-7 ${v.iconColor}`} strokeWidth={2} />
        {badge !== undefined && badge !== 0 && (
          <span className={`absolute -top-1.5 -right-1.5 ${badgeColors[badgeColor]} text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1`}>
            {badge}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-site-800 text-base">{title}</h3>
        <p className="text-sm text-site-500 mt-0.5 truncate">{subtitle}</p>
      </div>
      <ChevronRight className="w-5 h-5 text-site-300 flex-shrink-0" />
    </button>
  )
}
