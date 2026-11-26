import React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useCurrency } from '@/hooks/useCurrency'

interface InternationalCurrencyDisplayProps {
  amount: number
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
  const { currency, formatPreferred, currencies } = useCurrency()
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-bold'
  }
  const preferredDisplay = formatPreferred(amount, false)
  const nativeDisplay = `NC ${amount.toLocaleString()}`

  if (compact) {
    return <span className={`${sizeClasses[size]} ${className}`}>{preferredDisplay}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 ${className}`}>
          <span className={sizeClasses[size]}>{preferredDisplay}</span>
          {showBadge && amount >= 100 && currency !== 'NC' && currency !== 'NGN' && (
            <Badge variant="secondary" className="text-xs">{nativeDisplay}</Badge>
          )}
        </div>
      </TooltipTrigger>
      {showTooltip && (
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>{nativeDisplay} (₦{amount.toLocaleString()})</p>
            {currency !== 'NC' && currency !== 'NGN' && (
              <p className="text-muted-foreground">
                Indicative rate: 1 {currency} = NC {currencies[currency].rateToNC.toLocaleString()}
              </p>
            )}
          </div>
        </TooltipContent>
      )}
    </Tooltip>
  )
}

export const formatInternationalPrice = (
  amount: number,
  currency: string,
  currencies: Record<string, { symbol: string; rateToNC: number }>
): string => {
  if (currency === 'NC' || currency === 'NGN') return `NC ${amount.toLocaleString()}`
  const curr = currencies[currency]
  if (!curr) return `NC ${amount.toLocaleString()}`
  const converted = amount / curr.rateToNC
  return `${curr.symbol}${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
