import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrency } from '@/hooks/useCurrency'
import { useUserCountry } from '@/hooks/useUserCountry'

interface InternationalCurrencyDisplayProps {
  amount: number // Always in NC
  showTooltip?: boolean
  showBadge?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  compact?: boolean
}

export const InternationalCurrencyDisplay: React.FC<InternationalCurrencyDisplayProps> = ({
  amount,
  showTooltip = true,
  showBadge = true,
  className = '',
  size = 'md',
  compact = false
}) => {
  const { currency, formatPreferred, currencies, convertFromNC } = useCurrency()
  const { isNigerian } = useUserCountry()

  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-bold'
  }

  const ncDisplay = `NC ${amount.toLocaleString()}`
  const preferredDisplay = formatPreferred(amount, false)
  const convertedAmount = convertFromNC(amount, currency)

  // For Nigerian users or NC currency, show simple NC display
  if (isNigerian || currency === 'NC' || currency === 'NGN') {
    if (compact) {
      return (
        <span className={`${sizeClasses[size]} ${className}`}>
          {isNigerian ? `₦${amount.toLocaleString()}` : ncDisplay}
        </span>
      )
    }

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={`${sizeClasses[size]} ${className}`}>
            {ncDisplay}
          </span>
        </TooltipTrigger>
        {showTooltip && (
          <TooltipContent>
            <p>₦{amount.toLocaleString()} (1 NC = ₦1)</p>
          </TooltipContent>
        )}
      </Tooltip>
    )
  }

  // For international users, show preferred currency with NC equivalent
  if (compact) {
    return (
      <span className={`${sizeClasses[size]} ${className}`}>
        {currencies[currency].symbol}{convertedAmount.toLocaleString(undefined, { 
          minimumFractionDigits: 2, 
          maximumFractionDigits: 2 
        })}
      </span>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 ${className}`}>
          <span className={sizeClasses[size]}>
            {currencies[currency].symbol}{convertedAmount.toLocaleString(undefined, { 
              minimumFractionDigits: 2, 
              maximumFractionDigits: 2 
            })}
          </span>
          {showBadge && amount >= 100 && (
            <Badge variant="secondary" className="text-xs">
              NC {amount.toLocaleString()}
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      {showTooltip && (
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>NC {amount.toLocaleString()} (₦{amount.toLocaleString()})</p>
            <p className="text-muted-foreground">
              Rate: 1 {currencies[currency].code} = NC {currencies[currency].rateToNC.toLocaleString()}
            </p>
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}

// Quick price formatter for lists
export const formatInternationalPrice = (
  amount: number,
  currency: string,
  currencies: Record<string, { symbol: string; rateToNC: number }>
): string => {
  if (currency === 'NC' || currency === 'NGN') {
    return `NC ${amount.toLocaleString()}`
  }
  
  const curr = currencies[currency]
  if (!curr) return `NC ${amount.toLocaleString()}`
  
  const converted = amount / curr.rateToNC
  return `${curr.symbol}${converted.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`
}
