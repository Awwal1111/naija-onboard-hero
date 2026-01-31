import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { useProfile } from './useProfile'
import { supabase } from '@/integrations/supabase/client'

export type CurrencyCode = 'NC' | 'USD' | 'EUR' | 'GBP' | 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'INR' | 'AED'

interface Currency {
  code: CurrencyCode
  symbol: string
  name: string
  flag: string
  rateToNC: number // How many NC per 1 unit of this currency
}

// Exchange rates (NC is pegged 1:1 to NGN)
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  NC: { code: 'NC', symbol: 'NC', name: 'NaijaCoin', flag: '🪙', rateToNC: 1 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', rateToNC: 1 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rateToNC: 1600 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rateToNC: 1750 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rateToNC: 2050 },
  KES: { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪', rateToNC: 12 },
  GHS: { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', flag: '🇬🇭', rateToNC: 130 },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', rateToNC: 85 },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rateToNC: 19 },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', flag: '🇦🇪', rateToNC: 435 }
}

interface CurrencyContextType {
  currency: CurrencyCode
  setCurrency: (code: CurrencyCode) => void
  currencies: typeof CURRENCIES
  formatNC: (amount: number) => string
  formatPreferred: (ncAmount: number, showNC?: boolean) => string
  convertToNC: (amount: number, fromCurrency: CurrencyCode) => number
  convertFromNC: (ncAmount: number, toCurrency: CurrencyCode) => number
  getRate: (currencyCode: CurrencyCode) => number
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('preferred_currency') as CurrencyCode
    return saved && CURRENCIES[saved] ? saved : 'NC'
  })
  const { profile } = useProfile()

  // Sync with profile when available
  useEffect(() => {
    if (profile && (profile as any).preferred_currency) {
      const profileCurrency = (profile as any).preferred_currency as CurrencyCode
      if (CURRENCIES[profileCurrency]) {
        setCurrencyState(profileCurrency)
      }
    }
  }, [profile])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    
    // Save to profile if authenticated
    if (profile) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', profile.user_id)
    }
  }

  const formatNC = (amount: number): string => {
    return `NC ${amount.toLocaleString()}`
  }

  const formatPreferred = (ncAmount: number, showNC = true): string => {
    if (currency === 'NC' || currency === 'NGN') {
      const symbol = currency === 'NC' ? 'NC ' : '₦'
      return `${symbol}${ncAmount.toLocaleString()}`
    }

    const curr = CURRENCIES[currency]
    const convertedAmount = ncAmount / curr.rateToNC
    const formatted = `${curr.symbol}${convertedAmount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`

    if (showNC && ncAmount > 0) {
      return `${formatted} (NC ${ncAmount.toLocaleString()})`
    }
    return formatted
  }

  const convertToNC = (amount: number, fromCurrency: CurrencyCode): number => {
    const curr = CURRENCIES[fromCurrency]
    return Math.round(amount * curr.rateToNC)
  }

  const convertFromNC = (ncAmount: number, toCurrency: CurrencyCode): number => {
    const curr = CURRENCIES[toCurrency]
    return ncAmount / curr.rateToNC
  }

  const getRate = (currencyCode: CurrencyCode): number => {
    return CURRENCIES[currencyCode]?.rateToNC || 1
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      currencies: CURRENCIES,
      formatNC,
      formatPreferred,
      convertToNC,
      convertFromNC,
      getRate
    }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export const useCurrency = () => {
  const context = useContext(CurrencyContext)
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider')
  }
  return context
}
