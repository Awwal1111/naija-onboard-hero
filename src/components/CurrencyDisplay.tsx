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
  const { currency, formatPreferred, currencies, ratesAvailable } = useCurrency()
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-2xl font-bold'
  }
  const preferred = formatPreferred(amount, false)
  const nativeAmount = `NC ${amount.toLocaleString()}`
  const showNative = currency !== 'NC' && (currency === 'NGN' || ratesAvailable)

  if (compact) {
    return <span className={`inline-flex flex-wrap items-baseline gap-x-1 ${className}`}><span className={sizeClasses[size]}>{preferred}</span>{showNative && <span className="text-[10px] text-muted-foreground">({nativeAmount})</span>}</span>
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={`flex items-center gap-2 ${className}`}>
          <span className={sizeClasses[size]}>{preferred}</span>
          {showEquivalent && showNative && (
            <Badge variant="secondary" className="text-xs">{nativeAmount}</Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="text-xs space-y-1">
          <p>{nativeAmount} (₦{amount.toLocaleString()})</p>
          {currency !== 'NC' && currency !== 'NGN' && ratesAvailable && (
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

const getDisplayCurrency = (isNigerian: boolean): string => {
  try {
    const saved = localStorage.getItem('preferred_currency')
    if (saved) return saved
  } catch { /* Ignore unavailable browser storage. */ }
  try {
    const detected = localStorage.getItem('detected_currency_v1')
    if (detected) return detected
    const geo = JSON.parse(localStorage.getItem('geo_location_v1') || 'null')
    if (geo?.data?.countryCode?.toUpperCase() === 'NG') return 'NGN'
    if (geo?.data?.countryCode) return isNigerian ? 'NGN' : 'USD'
  } catch { /* Ignore unavailable browser storage. */ }
  return isNigerian ? 'NGN' : 'NC'
}

const getCachedRate = (code: string): number | null => {
  try {
    const cached = JSON.parse(localStorage.getItem('naijalancers_fx_rates_v1') || 'null')
    const fresh = cached?.updatedAt && Date.now() - new Date(cached.updatedAt).getTime() < 24 * 60 * 60 * 1000
    const rate = cached?.rates?.[code]
    return fresh && typeof rate === 'number' && rate > 0 ? rate : null
  } catch { return null }
}

const formatGlobalAmount = (amount: number, isNigerian: boolean, includeNC: boolean): string => {
  const code = getDisplayCurrency(isNigerian)
  if (code === 'NC' || code === 'NGN') return code === 'NGN' ? `₦${amount.toLocaleString()} (NC ${amount.toLocaleString()})` : `NC ${amount.toLocaleString()}`
  const rate = getCachedRate(code)
  if (!rate) return `NC ${amount.toLocaleString()} (USDT reference unavailable)`
  const currencyCode = code === 'USDT' ? 'USD' : code
  const converted = amount / rate
  const formatted = code === 'USDT'
    ? `USDT ${converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : new Intl.NumberFormat(undefined, { style: 'currency', currency: currencyCode, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted)
  return includeNC ? `${formatted} (NC ${amount.toLocaleString()})` : formatted
}

export const formatUsdOnly = (amount: number): string => formatGlobalAmount(amount, false, false)
export const formatPriceForDisplay = (amount: number, isNigerian: boolean): string => formatGlobalAmount(amount, isNigerian, true)
export const formatPriceCompact = (amount: number, isNigerian: boolean): string => formatGlobalAmount(amount, isNigerian, true)

/** Display-only formatter for all NC-denominated financial UI. */
export const formatNCDisplay = (amount: number): string => formatGlobalAmount(amount, false, true)
