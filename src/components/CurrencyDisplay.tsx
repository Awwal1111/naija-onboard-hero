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
  const { currency, formatPreferred, currencies } = useCurrency()
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-bold'
  }
  const preferred = formatPreferred(amount, !compact && showEquivalent)
  const nativeAmount = `NC ${amount.toLocaleString()}`

  if (compact) {
    return <span className={`${sizeClasses[size]} ${className}`}>{formatPreferred(amount, false)}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 ${className}`}>
          <span className={sizeClasses[size]}>{preferred}</span>
          {showEquivalent && amount >= 100 && currency !== 'NC' && currency !== 'NGN' && (
            <Badge variant="secondary" className="text-xs">{nativeAmount}</Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p>{nativeAmount} (₦{amount.toLocaleString()})</p>
          {currency !== 'NC' && currency !== 'NGN' && (
            <p className="text-muted-foreground">
              Indicative rate: 1 {currency} = NC {currencies[currency].rateToNC.toLocaleString()}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

/** Legacy formatters remain NC-based because they are also used in payment logic and exports. */
export const formatAmount = (amount: number, _showEquivalent = false): string =>
  `NC ${amount.toLocaleString()}`

export const formatUsdOnly = (amount: number): string =>
  `$${(amount / 1600).toFixed(2)}`

export const formatPriceForDisplay = (amount: number, isNigerian: boolean): string =>
  isNigerian ? `₦${amount.toLocaleString()}` : `NC ${amount.toLocaleString()} (~$${(amount / 1600).toFixed(2)})`

export const formatPriceCompact = (amount: number, isNigerian: boolean): string =>
  isNigerian ? `₦${amount.toLocaleString()}` : `~$${(amount / 1600).toFixed(2)}`
