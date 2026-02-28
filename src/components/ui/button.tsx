'use client'

import { forwardRef, ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'brand' | 'secondary' | 'ghost' | 'destructive'

const variantStyles: Record<Variant, string> = {
  primary: 'bg-accent text-gray-900 hover:bg-accent/90 font-semibold',
  brand: 'bg-brand text-white hover:bg-brand-light font-semibold',
  secondary: 'border border-surface-border bg-transparent hover:bg-surface text-gray-700',
  ghost: 'bg-transparent hover:bg-surface text-gray-600',
  destructive: 'bg-status-critical text-white hover:bg-status-critical/90 font-semibold',
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
      lg: 'px-6 py-3.5 text-base min-h-[48px]',
    }

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center rounded-btn transition-colors disabled:opacity-50 disabled:pointer-events-none ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'
