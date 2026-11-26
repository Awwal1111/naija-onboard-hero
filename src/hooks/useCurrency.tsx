import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'

export type CurrencyCode = 'NC' | 'USD' | 'USDT' | 'EUR' | 'GBP' | 'NGN' | 'KES' | 'GHS' | 'ZAR' | 'INR' | 'AED'

interface Currency {
  code: CurrencyCode
  symbol: string
  name: string
  flag: string
  rateToNC: number // How many NC per 1 unit of this currency
}

// Indicative display conversion rates only. These are not live FX quotes and must never
// be used to calculate charges, payouts, escrow, or blockchain transaction amounts.
// NC remains pegged 1:1 to NGN for the platform's internal accounting.
export const CURRENCIES: Record<CurrencyCode, Currency> = {
  NC: { code: 'NC', symbol: 'NC', name: 'NaijaCoin', flag: '🪙', rateToNC: 1 },
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬', rateToNC: 1 },
  USD: { code: 'USD', symbol: ' { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rateToNC: 2050 },
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
  ratesAvailable: boolean
  rateUpdatedAt: string | null
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('preferred_currency') as CurrencyCode
    return saved && CURRENCIES[saved] ? saved : 'NC'
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(() => {
    try {
      const cached = localStorage.getItem('naijalancers_fx_rates_v1')
      if (!cached) return null
      const parsed = JSON.parse(cached)
      const isFresh = parsed?.updatedAt && Date.now() - new Date(parsed.updatedAt).getTime() < 24 * 60 * 60 * 1000
      return isFresh && parsed?.rates && typeof parsed.rates === 'object' ? parsed.rates : null
    } catch { return null }
  })
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(() => {
    try { return JSON.parse(localStorage.getItem('naijalancers_fx_rates_v1') || 'null')?.updatedAt || null } catch { return null }
  })
  const ratesAvailable = !!liveRates
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Fetch current indicative NGN-based FX rates. NC is an internal display unit
  // pegged 1:1 to NGN; these rates are never used for charges or settlement.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    fetch('https://open.er-api.com/v6/latest/NGN', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('FX request failed')))
      .then(payload => {
        const source = payload?.rates
        if (payload?.result !== 'success' || !source || typeof source.USD !== 'number') throw new Error('Invalid FX response')
        const next: Record<string, number> = { NC: 1, NGN: 1 }
        for (const code of ['USD', 'EUR', 'GBP', 'KES', 'GHS', 'ZAR', 'INR', 'AED']) {
          const unitsPerNGN = source[code]
          if (typeof unitsPerNGN === 'number' && unitsPerNGN > 0) next[code] = 1 / unitsPerNGN
        }
        if (next.USD) next.USDT = next.USD // USDT is shown as a USD-pegged reference, not a redemption quote.
        setLiveRates(next)
        const updatedAt = new Date().toISOString()
        setRateUpdatedAt(updatedAt)
        localStorage.setItem('naijalancers_fx_rates_v1', JSON.stringify({ rates: next, updatedAt }))
      })
      .catch(() => { /* Keep a previously cached rate; never invent a fresh quote. */ })
      .finally(() => window.clearTimeout(timeout))
    return () => { controller.abort(); window.clearTimeout(timeout) }
  }, [])

  const currencies = liveRates
    ? Object.fromEntries(Object.entries(CURRENCIES).map(([code, curr]) => [code, {
        ...curr,
        rateToNC: liveRates[code] || curr.rateToNC
      }])) as typeof CURRENCIES
    : CURRENCIES

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) {
        setCurrencyState(next)
        localStorage.setItem('detected_currency_v1', next)
      }
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
    }
  }

  const formatNC = (amount: number): string => {
    return `NC ${amount.toLocaleString()}`
  }

  const formatPreferred = (ncAmount: number, showNC = true): string => {
    if (currency === 'NC') return `NC ${ncAmount.toLocaleString()}`
    if (currency === 'NGN') return showNC ? `₦${ncAmount.toLocaleString()} (NC ${ncAmount.toLocaleString()})` : `₦${ncAmount.toLocaleString()}`

    if (!liveRates || !liveRates[currency]) {
      return `NC ${ncAmount.toLocaleString()} (USDT reference unavailable)`
    }

    const curr = currencies[currency]
    const convertedAmount = ncAmount / curr.rateToNC
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code === 'USDT' ? 'USD' : curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)
    const displayAmount = currency === 'USDT' ? `USDT ${convertedAmount.toFixed(2)}` : formatted

    if (showNC && ncAmount > 0) {
      return `${displayAmount} (NC ${ncAmount.toLocaleString()})`
    }
    return displayAmount
  }

  const convertToNC = (amount: number, fromCurrency: CurrencyCode): number => {
    const curr = currencies[fromCurrency]
    return Math.round(amount * curr.rateToNC)
  }

  const convertFromNC = (ncAmount: number, toCurrency: CurrencyCode): number => {
    const curr = currencies[toCurrency]
    return ncAmount / curr.rateToNC
  }

  const getRate = (currencyCode: CurrencyCode): number => {
    return currencies[currencyCode]?.rateToNC || 1
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      currencies,
      formatNC,
      formatPreferred,
      convertToNC,
      convertFromNC,
      getRate,
      ratesAvailable,
      rateUpdatedAt
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
, name: 'US Dollar', flag: '🇺🇸', rateToNC: 1600 },
  USDT: { code: 'USDT', symbol: 'USDT', name: 'Tether USD (reference)', flag: '🟢', rateToNC: 1600 },
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
  const [userId, setUserId] = useState<string | null>(null)
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) setCurrencyState(next)
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
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
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)

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
, name: 'US Dollar', flag: '🇺🇸', rateToNC: 1 },
  USDT: { code: 'USDT', symbol: 'USDT', name: 'Tether USD (reference)', flag: '🌐', rateToNC: 1 },
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
  ratesAvailable: boolean
  rateUpdatedAt: string | null
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('preferred_currency') as CurrencyCode
    return saved && CURRENCIES[saved] ? saved : 'NC'
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(() => {
    try {
      const cached = localStorage.getItem('naijalancers_fx_rates_v1')
      if (!cached) return null
      const parsed = JSON.parse(cached)
      const isFresh = parsed?.updatedAt && Date.now() - new Date(parsed.updatedAt).getTime() < 24 * 60 * 60 * 1000
      return isFresh && parsed?.rates && typeof parsed.rates === 'object' ? parsed.rates : null
    } catch { return null }
  })
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(() => {
    try { return JSON.parse(localStorage.getItem('naijalancers_fx_rates_v1') || 'null')?.updatedAt || null } catch { return null }
  })
  const ratesAvailable = !!liveRates
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Fetch current indicative NGN-based FX rates. NC is an internal display unit
  // pegged 1:1 to NGN; these rates are never used for charges or settlement.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    fetch('https://open.er-api.com/v6/latest/NGN', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('FX request failed')))
      .then(payload => {
        const source = payload?.rates
        if (payload?.result !== 'success' || !source || typeof source.USD !== 'number') throw new Error('Invalid FX response')
        const next: Record<string, number> = { NC: 1, NGN: 1 }
        for (const code of ['USD', 'EUR', 'GBP', 'KES', 'GHS', 'ZAR', 'INR', 'AED']) {
          const unitsPerNGN = source[code]
          if (typeof unitsPerNGN === 'number' && unitsPerNGN > 0) next[code] = 1 / unitsPerNGN
        }
        if (next.USD) next.USDT = next.USD // USDT is shown as a USD-pegged reference, not a redemption quote.
        setLiveRates(next)
        const updatedAt = new Date().toISOString()
        setRateUpdatedAt(updatedAt)
        localStorage.setItem('naijalancers_fx_rates_v1', JSON.stringify({ rates: next, updatedAt }))
      })
      .catch(() => { /* Keep a previously cached rate; never invent a fresh quote. */ })
      .finally(() => window.clearTimeout(timeout))
    return () => { controller.abort(); window.clearTimeout(timeout) }
  }, [])

  const currencies = liveRates
    ? Object.fromEntries(Object.entries(CURRENCIES).map(([code, curr]) => [code, {
        ...curr,
        rateToNC: liveRates[code] || curr.rateToNC
      }])) as typeof CURRENCIES
    : CURRENCIES

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) {
        setCurrencyState(next)
        localStorage.setItem('detected_currency_v1', next)
      }
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
    }
  }

  const formatNC = (amount: number): string => {
    return `NC ${amount.toLocaleString()}`
  }

  const formatPreferred = (ncAmount: number, showNC = true): string => {
    if (currency === 'NC') return `NC ${ncAmount.toLocaleString()}`
    if (currency === 'NGN') return showNC ? `₦${ncAmount.toLocaleString()} (NC ${ncAmount.toLocaleString()})` : `₦${ncAmount.toLocaleString()}`

    if (!liveRates || !liveRates[currency]) {
      return `NC ${ncAmount.toLocaleString()} (USDT reference unavailable)`
    }

    const curr = currencies[currency]
    const convertedAmount = ncAmount / curr.rateToNC
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code === 'USDT' ? 'USD' : curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)
    const displayAmount = currency === 'USDT' ? `USDT ${convertedAmount.toFixed(2)}` : formatted

    if (showNC && ncAmount > 0) {
      return `${displayAmount} (NC ${ncAmount.toLocaleString()})`
    }
    return displayAmount
  }

  const convertToNC = (amount: number, fromCurrency: CurrencyCode): number => {
    const curr = currencies[fromCurrency]
    return Math.round(amount * curr.rateToNC)
  }

  const convertFromNC = (ncAmount: number, toCurrency: CurrencyCode): number => {
    const curr = currencies[toCurrency]
    return ncAmount / curr.rateToNC
  }

  const getRate = (currencyCode: CurrencyCode): number => {
    return currencies[currencyCode]?.rateToNC || 1
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      currencies,
      formatNC,
      formatPreferred,
      convertToNC,
      convertFromNC,
      getRate,
      ratesAvailable,
      rateUpdatedAt
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
, name: 'US Dollar', flag: '🇺🇸', rateToNC: 1600 },
  USDT: { code: 'USDT', symbol: 'USDT', name: 'Tether USD (reference)', flag: '🟢', rateToNC: 1600 },
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
  const [userId, setUserId] = useState<string | null>(null)
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) setCurrencyState(next)
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
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
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)

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
, name: 'US Dollar', flag: '🇺🇸', rateToNC: 1 },
  USDT: { code: 'USDT', symbol: 'USDT', name: 'Tether USD (reference)', flag: '🌐', rateToNC: 1 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rateToNC: 1 },
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
  ratesAvailable: boolean
  rateUpdatedAt: string | null
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('preferred_currency') as CurrencyCode
    return saved && CURRENCIES[saved] ? saved : 'NC'
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(() => {
    try {
      const cached = localStorage.getItem('naijalancers_fx_rates_v1')
      if (!cached) return null
      const parsed = JSON.parse(cached)
      const isFresh = parsed?.updatedAt && Date.now() - new Date(parsed.updatedAt).getTime() < 24 * 60 * 60 * 1000
      return isFresh && parsed?.rates && typeof parsed.rates === 'object' ? parsed.rates : null
    } catch { return null }
  })
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(() => {
    try { return JSON.parse(localStorage.getItem('naijalancers_fx_rates_v1') || 'null')?.updatedAt || null } catch { return null }
  })
  const ratesAvailable = !!liveRates
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Fetch current indicative NGN-based FX rates. NC is an internal display unit
  // pegged 1:1 to NGN; these rates are never used for charges or settlement.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    fetch('https://open.er-api.com/v6/latest/NGN', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('FX request failed')))
      .then(payload => {
        const source = payload?.rates
        if (payload?.result !== 'success' || !source || typeof source.USD !== 'number') throw new Error('Invalid FX response')
        const next: Record<string, number> = { NC: 1, NGN: 1 }
        for (const code of ['USD', 'EUR', 'GBP', 'KES', 'GHS', 'ZAR', 'INR', 'AED']) {
          const unitsPerNGN = source[code]
          if (typeof unitsPerNGN === 'number' && unitsPerNGN > 0) next[code] = 1 / unitsPerNGN
        }
        if (next.USD) next.USDT = next.USD // USDT is shown as a USD-pegged reference, not a redemption quote.
        setLiveRates(next)
        const updatedAt = new Date().toISOString()
        setRateUpdatedAt(updatedAt)
        localStorage.setItem('naijalancers_fx_rates_v1', JSON.stringify({ rates: next, updatedAt }))
      })
      .catch(() => { /* Keep a previously cached rate; never invent a fresh quote. */ })
      .finally(() => window.clearTimeout(timeout))
    return () => { controller.abort(); window.clearTimeout(timeout) }
  }, [])

  const currencies = liveRates
    ? Object.fromEntries(Object.entries(CURRENCIES).map(([code, curr]) => [code, {
        ...curr,
        rateToNC: liveRates[code] || curr.rateToNC
      }])) as typeof CURRENCIES
    : CURRENCIES

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) {
        setCurrencyState(next)
        localStorage.setItem('detected_currency_v1', next)
      }
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
    }
  }

  const formatNC = (amount: number): string => {
    return `NC ${amount.toLocaleString()}`
  }

  const formatPreferred = (ncAmount: number, showNC = true): string => {
    if (currency === 'NC') return `NC ${ncAmount.toLocaleString()}`
    if (currency === 'NGN') return showNC ? `₦${ncAmount.toLocaleString()} (NC ${ncAmount.toLocaleString()})` : `₦${ncAmount.toLocaleString()}`

    if (!liveRates || !liveRates[currency]) {
      return `NC ${ncAmount.toLocaleString()} (USDT reference unavailable)`
    }

    const curr = currencies[currency]
    const convertedAmount = ncAmount / curr.rateToNC
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code === 'USDT' ? 'USD' : curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)
    const displayAmount = currency === 'USDT' ? `USDT ${convertedAmount.toFixed(2)}` : formatted

    if (showNC && ncAmount > 0) {
      return `${displayAmount} (NC ${ncAmount.toLocaleString()})`
    }
    return displayAmount
  }

  const convertToNC = (amount: number, fromCurrency: CurrencyCode): number => {
    const curr = currencies[fromCurrency]
    return Math.round(amount * curr.rateToNC)
  }

  const convertFromNC = (ncAmount: number, toCurrency: CurrencyCode): number => {
    const curr = currencies[toCurrency]
    return ncAmount / curr.rateToNC
  }

  const getRate = (currencyCode: CurrencyCode): number => {
    return currencies[currencyCode]?.rateToNC || 1
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      currencies,
      formatNC,
      formatPreferred,
      convertToNC,
      convertFromNC,
      getRate,
      ratesAvailable,
      rateUpdatedAt
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
, name: 'US Dollar', flag: '🇺🇸', rateToNC: 1600 },
  USDT: { code: 'USDT', symbol: 'USDT', name: 'Tether USD (reference)', flag: '🟢', rateToNC: 1600 },
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
  const [userId, setUserId] = useState<string | null>(null)
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) setCurrencyState(next)
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
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
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)

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
, name: 'US Dollar', flag: '🇺🇸', rateToNC: 1 },
  USDT: { code: 'USDT', symbol: 'USDT', name: 'Tether USD (reference)', flag: '🌐', rateToNC: 1 },
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
  ratesAvailable: boolean
  rateUpdatedAt: string | null
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined)

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<CurrencyCode>(() => {
    const saved = localStorage.getItem('preferred_currency') as CurrencyCode
    return saved && CURRENCIES[saved] ? saved : 'NC'
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [liveRates, setLiveRates] = useState<Record<string, number> | null>(() => {
    try {
      const cached = localStorage.getItem('naijalancers_fx_rates_v1')
      if (!cached) return null
      const parsed = JSON.parse(cached)
      const isFresh = parsed?.updatedAt && Date.now() - new Date(parsed.updatedAt).getTime() < 24 * 60 * 60 * 1000
      return isFresh && parsed?.rates && typeof parsed.rates === 'object' ? parsed.rates : null
    } catch { return null }
  })
  const [rateUpdatedAt, setRateUpdatedAt] = useState<string | null>(() => {
    try { return JSON.parse(localStorage.getItem('naijalancers_fx_rates_v1') || 'null')?.updatedAt || null } catch { return null }
  })
  const ratesAvailable = !!liveRates
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Fetch current indicative NGN-based FX rates. NC is an internal display unit
  // pegged 1:1 to NGN; these rates are never used for charges or settlement.
  useEffect(() => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)
    fetch('https://open.er-api.com/v6/latest/NGN', { signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('FX request failed')))
      .then(payload => {
        const source = payload?.rates
        if (payload?.result !== 'success' || !source || typeof source.USD !== 'number') throw new Error('Invalid FX response')
        const next: Record<string, number> = { NC: 1, NGN: 1 }
        for (const code of ['USD', 'EUR', 'GBP', 'KES', 'GHS', 'ZAR', 'INR', 'AED']) {
          const unitsPerNGN = source[code]
          if (typeof unitsPerNGN === 'number' && unitsPerNGN > 0) next[code] = 1 / unitsPerNGN
        }
        if (next.USD) next.USDT = next.USD // USDT is shown as a USD-pegged reference, not a redemption quote.
        setLiveRates(next)
        const updatedAt = new Date().toISOString()
        setRateUpdatedAt(updatedAt)
        localStorage.setItem('naijalancers_fx_rates_v1', JSON.stringify({ rates: next, updatedAt }))
      })
      .catch(() => { /* Keep a previously cached rate; never invent a fresh quote. */ })
      .finally(() => window.clearTimeout(timeout))
    return () => { controller.abort(); window.clearTimeout(timeout) }
  }, [])

  const currencies = liveRates
    ? Object.fromEntries(Object.entries(CURRENCIES).map(([code, curr]) => [code, {
        ...curr,
        rateToNC: liveRates[code] || curr.rateToNC
      }])) as typeof CURRENCIES
    : CURRENCIES

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) {
        setCurrencyState(next)
        localStorage.setItem('detected_currency_v1', next)
      }
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
    }
  }

  const formatNC = (amount: number): string => {
    return `NC ${amount.toLocaleString()}`
  }

  const formatPreferred = (ncAmount: number, showNC = true): string => {
    if (currency === 'NC') return `NC ${ncAmount.toLocaleString()}`
    if (currency === 'NGN') return showNC ? `₦${ncAmount.toLocaleString()} (NC ${ncAmount.toLocaleString()})` : `₦${ncAmount.toLocaleString()}`

    if (!liveRates || !liveRates[currency]) {
      return `NC ${ncAmount.toLocaleString()} (USDT reference unavailable)`
    }

    const curr = currencies[currency]
    const convertedAmount = ncAmount / curr.rateToNC
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code === 'USDT' ? 'USD' : curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)
    const displayAmount = currency === 'USDT' ? `USDT ${convertedAmount.toFixed(2)}` : formatted

    if (showNC && ncAmount > 0) {
      return `${displayAmount} (NC ${ncAmount.toLocaleString()})`
    }
    return displayAmount
  }

  const convertToNC = (amount: number, fromCurrency: CurrencyCode): number => {
    const curr = currencies[fromCurrency]
    return Math.round(amount * curr.rateToNC)
  }

  const convertFromNC = (ncAmount: number, toCurrency: CurrencyCode): number => {
    const curr = currencies[toCurrency]
    return ncAmount / curr.rateToNC
  }

  const getRate = (currencyCode: CurrencyCode): number => {
    return currencies[currencyCode]?.rateToNC || 1
  }

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      currencies,
      formatNC,
      formatPreferred,
      convertToNC,
      convertFromNC,
      getRate,
      ratesAvailable,
      rateUpdatedAt
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
, name: 'US Dollar', flag: '🇺🇸', rateToNC: 1600 },
  USDT: { code: 'USDT', symbol: 'USDT', name: 'Tether USD (reference)', flag: '🟢', rateToNC: 1600 },
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
  const [userId, setUserId] = useState<string | null>(null)
  const [hasExplicitChoice, setHasExplicitChoice] = useState<boolean>(
    () => !!localStorage.getItem('preferred_currency')
  )

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when authenticated. A currency explicitly chosen on this
  // device takes priority; otherwise load the saved account preference.
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    supabase
      .from('profiles')
      .select('preferred_currency')
      .eq('user_id', userId)
      .maybeSingle()
      .then(async ({ data }) => {
        if (cancelled) return

        const localPreference = localStorage.getItem('preferred_currency') as CurrencyCode | null
        const validLocalPreference = localPreference && CURRENCIES[localPreference] ? localPreference : null
        const profilePreference = data?.preferred_currency as CurrencyCode | null
        const validProfilePreference = profilePreference && CURRENCIES[profilePreference] ? profilePreference : null

        if (hasExplicitChoice && validLocalPreference) {
          setCurrencyState(validLocalPreference)
          if (validLocalPreference !== validProfilePreference) {
            await supabase
              .from('profiles')
              .update({ preferred_currency: validLocalPreference } as any)
              .eq('user_id', userId)
          }
          return
        }

        if (validProfilePreference) {
          setCurrencyState(validProfilePreference)
          localStorage.setItem('preferred_currency', validProfilePreference)
          setHasExplicitChoice(true)
        }
      })

    return () => { cancelled = true }
  }, [userId, hasExplicitChoice])

  // Auto-detect currency from IP geolocation when user has no explicit choice
  useEffect(() => {
    if (hasExplicitChoice) return
    let cancelled = false
    const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
      NG: 'NGN', US: 'USD', GB: 'GBP', KE: 'KES', GH: 'GHS', ZA: 'ZAR',
      IN: 'INR', AE: 'AED',
      DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
      PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
      EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
    }
    const apply = (cc: string) => {
      if (cancelled) return
      const next = COUNTRY_TO_CURRENCY[cc.toUpperCase()]
      if (next && CURRENCIES[next]) setCurrencyState(next)
    }
    try {
      const cached = localStorage.getItem('geo_location_v1')
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed?.data?.countryCode) {
          apply(parsed.data.countryCode)
          return
        }
      }
    } catch {}
    const ctrl = new AbortController()
    const tid = setTimeout(() => ctrl.abort(), 4000)
    fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(j => { if (j?.country_code) apply(j.country_code) })
      .catch(() => {})
      .finally(() => clearTimeout(tid))
    return () => { cancelled = true; ctrl.abort() }
  }, [hasExplicitChoice])

  const setCurrency = async (code: CurrencyCode) => {
    setCurrencyState(code)
    localStorage.setItem('preferred_currency', code)
    setHasExplicitChoice(true)

    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ preferred_currency: code } as any)
        .eq('user_id', userId)
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
    const formatted = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: curr.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(convertedAmount)

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
