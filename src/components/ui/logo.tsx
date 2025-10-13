import React from 'react'
import { cn } from '@/lib/utils'
import logoImage from '@/assets/naijalancers-logo.png'

interface LogoProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

const Logo: React.FC<LogoProps> = ({ className, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  }

  return (
    <img 
      src={logoImage} 
      alt="NaijaLancers Logo" 
      className={cn(
        "rounded-full object-cover",
        sizeMap[size],
        className
      )}
    />
  )
}

export { Logo }