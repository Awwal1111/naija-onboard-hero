import React from 'react'
import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-lg',
    md: 'w-10 h-10 text-xl',
    lg: 'w-12 h-12 text-2xl'
  }

  return (
    <div className={cn(
      "bg-primary rounded-full flex items-center justify-center font-bold text-primary-foreground",
      sizeMap[size],
      className
    )}>
      N
    </div>
  )
}

export { Logo }