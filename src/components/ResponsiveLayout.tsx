import React from 'react'
import { cn } from '@/lib/utils'

interface ResponsiveLayoutProps {
  children: React.ReactNode
  className?: string
}

const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ children, className }) => {
  return (
    <div className={cn(
      "min-h-screen w-full",
      "px-2 sm:px-4 md:px-6 lg:px-8",
      "py-2 sm:py-4",
      "max-w-7xl mx-auto",
      "overflow-x-hidden",
      className
    )}>
      <div className="w-full max-w-full">
        {children}
      </div>
    </div>
  )
}

// Responsive Grid Component
export const ResponsiveGrid: React.FC<{
  children: React.ReactNode
  className?: string
  cols?: {
    default?: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
}> = ({ children, className, cols = { default: 1, sm: 1, md: 2, lg: 3, xl: 4 } }) => {
  const gridCols = cn(
    cols.default === 1 && "grid-cols-1",
    cols.default === 2 && "grid-cols-2",
    cols.default === 3 && "grid-cols-3",
    cols.sm && cols.sm === 2 && "sm:grid-cols-2",
    cols.sm && cols.sm === 3 && "sm:grid-cols-3",
    cols.md && cols.md === 2 && "md:grid-cols-2",
    cols.md && cols.md === 3 && "md:grid-cols-3",
    cols.md && cols.md === 4 && "md:grid-cols-4",
    cols.lg && cols.lg === 3 && "lg:grid-cols-3",
    cols.lg && cols.lg === 4 && "lg:grid-cols-4",
    cols.lg && cols.lg === 5 && "lg:grid-cols-5",
    cols.xl && cols.xl === 4 && "xl:grid-cols-4",
    cols.xl && cols.xl === 5 && "xl:grid-cols-5",
    cols.xl && cols.xl === 6 && "xl:grid-cols-6"
  )

  return (
    <div className={cn(
      "grid gap-2 sm:gap-4 md:gap-6",
      gridCols,
      className
    )}>
      {children}
    </div>
  )
}

// Responsive Card Component
export const ResponsiveCard: React.FC<{
  children: React.ReactNode
  className?: string
}> = ({ children, className }) => {
  return (
    <div className={cn(
      "w-full max-w-full",
      "p-3 sm:p-4 md:p-6",
      "rounded-lg border bg-card text-card-foreground shadow-sm",
      "overflow-hidden",
      className
    )}>
      {children}
    </div>
  )
}

// Responsive Text Component
export const ResponsiveText: React.FC<{
  children: React.ReactNode
  className?: string
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl'
}> = ({ children, className, size = 'base' }) => {
  const textSize = cn(
    size === 'xs' && "text-xs sm:text-sm",
    size === 'sm' && "text-sm sm:text-base",
    size === 'base' && "text-sm sm:text-base md:text-lg",
    size === 'lg' && "text-base sm:text-lg md:text-xl",
    size === 'xl' && "text-lg sm:text-xl md:text-2xl",
    size === '2xl' && "text-xl sm:text-2xl md:text-3xl",
    size === '3xl' && "text-2xl sm:text-3xl md:text-4xl"
  )

  return (
    <div className={cn(textSize, "leading-relaxed", className)}>
      {children}
    </div>
  )
}

// Responsive Button Component
export const ResponsiveButton: React.FC<{
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'default' | 'lg'
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}> = ({ children, className, size = 'default', ...props }) => {
  const buttonSize = cn(
    size === 'sm' && "px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm",
    size === 'default' && "px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base",
    size === 'lg' && "px-4 py-2 text-base sm:px-6 sm:py-3 sm:text-lg"
  )

  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:pointer-events-none",
        "bg-primary text-primary-foreground hover:bg-primary/90",
        "min-w-0 max-w-full truncate",
        buttonSize,
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export default ResponsiveLayout