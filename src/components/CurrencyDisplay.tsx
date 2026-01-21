import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useUserCountry } from '@/hooks/useUserCountry'

interface CurrencyDisplayProps {
  amount: number
  showUsdEquivalent?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

// NC is pegged 1:1 to NGN, approximate USD rate
const NGN_TO_USD_RATE = 1600 // 1 USD ≈ 1600 NGN

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({ 
  amount, 
  showUsdEquivalent = true,
  className = '',
  size = 'md'
}) => {
  const { isNigerian } = useUserCountry()
  
  const usdAmount = amount / NGN_TO_USD_RATE
  
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-bold'
  }

  const formatNC = (amt: number) => `NC ${amt.toLocaleString()}`
  const formatUSD = (amt: number) => `$${amt.toFixed(2)}`
  const formatNGN = (amt: number) => `₦${amt.toLocaleString()}`

  if (isNigerian) {
    // For Nigerian users, show NC with Naira equivalent
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${sizeClasses[size]} ${className}`}>
            {formatNC(amount)}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{formatNGN(amount)} (1 NC = ₦1)</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  // For international users, show NC with USD equivalent
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className={sizeClasses[size]}>{formatNC(amount)}</span>
      {showUsdEquivalent && amount >= 100 && (
        <Badge variant="secondary" className="text-xs">
          ≈ {formatUSD(usdAmount)}
        </Badge>
      )}
    </div>
  )
}

/**
 * Format amount for display based on context
 */
export const formatAmount = (amount: number, showUsd = false): string => {
  const usdAmount = amount / NGN_TO_USD_RATE
  if (showUsd) {
    return `NC ${amount.toLocaleString()} (~$${usdAmount.toFixed(2)})`
  }
  return `NC ${amount.toLocaleString()}`
}

export const formatUsdOnly = (amount: number): string => {
  const usdAmount = amount / NGN_TO_USD_RATE
  return `$${usdAmount.toFixed(2)}`
}

/**
 * Simple price formatter for use in components
 * Shows ₦ for Nigerian users, NC with USD for international
 */
export const formatPriceForDisplay = (amount: number, isNigerian: boolean): string => {
  if (isNigerian) {
    return `₦${amount.toLocaleString()}`
  }
  const usdAmount = amount / NGN_TO_USD_RATE
  return `NC ${amount.toLocaleString()} (~$${usdAmount.toFixed(2)})`
}

/**
 * Compact price formatter - shorter format for tight spaces
 */
export const formatPriceCompact = (amount: number, isNigerian: boolean): string => {
  if (isNigerian) {
    return `₦${amount.toLocaleString()}`
  }
  const usdAmount = amount / NGN_TO_USD_RATE
  return `~$${usdAmount.toFixed(2)}`
}
