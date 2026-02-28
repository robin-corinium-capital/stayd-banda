import { ReactNode } from 'react'

type Variant = 'light' | 'dark'

const variantStyles: Record<Variant, string> = {
  light: 'bg-surface-card border-surface-border',
  dark: 'bg-dark-card border-dark-border',
}

export function Card({
  variant = 'light',
  className = '',
  children,
  onClick,
}: {
  variant?: Variant
  className?: string
  children: ReactNode
  onClick?: () => void
}) {
  const interactive = onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''

  return (
    <div
      className={`rounded-card border ${variantStyles[variant]} ${interactive} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  )
}
