import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrency } from '@/hooks/useCurrency'

interface CurrencyDisplayProps {
  amount: number
  showEquivalent?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  compact?: boolean
}

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ 
  amount, 
  showEquivalent = true,
  className = '',
  size = 'md',
  compact = false
}) => {
  const { currency, formatPreferred, currencies, convertFromNC } = useCurrency()
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-bold'
  }

  const ncDisplay = `NC ${amount.toLocaleString()}`

  // Compact mode - just show the amount in preferred currency
  if (compact) {
    if (currency === 'NC' || currency === 'NGN') {
      return (
        <span className={`${sizeClasses[size]} ${className}`}>
          {currency === 'NGN' ? `₦${amount.toLocaleString()}` : ncDisplay}
        </span>
      )
    }
    const converted = convertFromNC(amount, currency)
    return (
      <span className={`${sizeClasses[size]} ${className}`}>
        {currencies[currency].symbol}{converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
    )
  }

  // For NC or NGN, show simple NC with naira tooltip
  if (currency === 'NC' || currency === 'NGN') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${sizeClasses[size]} ${className}`}>
            {ncDisplay}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>₦{amount.toLocaleString()} (1 NC = ₦1)</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // For international currencies, show converted amount with NC badge
  const converted = convertFromNC(amount, currency)
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 ${className}`}>
          <span className={sizeClasses[size]}>
            {currencies[currency].symbol}{converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          {showEquivalent && amount >= 100 && (
            <Badge variant="secondary" className="text-xs">
              NC {amount.toLocaleString()}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p>NC {amount.toLocaleString()} (₦{amount.toLocaleString()})</p>
          <p className="text-muted-foreground">
            Rate: 1 {currency} = NC {currencies[currency].rateToNC.toLocaleString()}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Format amount for display based on context
 */
export const formatAmount = (amount: number, showEquivalent = false): string => {
  return `NC ${amount.toLocaleString()}`
}

export const formatUsdOnly = (amount: number): string => {
  const usdAmount = amount / 1600 // NC to USD rate
  return `$${usdAmount.toFixed(2)}`
}

/**
 * Simple price formatter for use in components
 * Shows NC by default, can show in user's preferred currency
 */
export const formatPriceForDisplay = (amount: number, isNigerian: boolean): string => {
  if (isNigerian) {
    return `₦${amount.toLocaleString()}`
  }
  const usdAmount = amount / 1600
  return `NC ${amount.toLocaleString()} (~$${usdAmount.toFixed(2)})`
}

/**
 * Compact price formatter - shorter format for tight spaces
 */
export const formatPriceCompact = (amount: number, isNigerian: boolean): string => {
  if (isNigerian) {
    return `₦${amount.toLocaleString()}`
  }
  const usdAmount = amount / 1600
  return `~$${usdAmount.toFixed(2)}`
}
