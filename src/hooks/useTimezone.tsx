import { useState, useEffect, createContext, useContext, ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { format, formatDistance, parseISO } from 'date-fns'
import { toZonedTime, format as formatTz } from 'date-fns-tz'

export const TIMEZONES = [
  { value: 'Africa/Lagos', label: 'Lagos (WAT)', offset: '+01:00', flag: '🇳🇬' },
  { value: 'Africa/Nairobi', label: 'Nairobi (EAT)', offset: '+03:00', flag: '🇰🇪' },
  { value: 'Africa/Accra', label: 'Accra (GMT)', offset: '+00:00', flag: '🇬🇭' },
  { value: 'Africa/Johannesburg', label: 'Johannesburg (SAST)', offset: '+02:00', flag: '🇿🇦' },
  { value: 'Africa/Cairo', label: 'Cairo (EET)', offset: '+02:00', flag: '🇪🇬' },
  { value: 'Europe/London', label: 'London (GMT/BST)', offset: '+00:00', flag: '🇬🇧' },
  { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00', flag: '🇫🇷' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: '+01:00', flag: '🇩🇪' },
  { value: 'America/New_York', label: 'New York (EST)', offset: '-05:00', flag: '🇺🇸' },
  { value: 'America/Los_Angeles', label: 'Los Angeles (PST)', offset: '-08:00', flag: '🇺🇸' },
  { value: 'America/Toronto', label: 'Toronto (EST)', offset: '-05:00', flag: '🇨🇦' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00', flag: '🇦🇪' },
  { value: 'Asia/Kolkata', label: 'Mumbai (IST)', offset: '+05:30', flag: '🇮🇳' },
  { value: 'Asia/Singapore', label: 'Singapore (SGT)', offset: '+08:00', flag: '🇸🇬' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)', offset: '+09:00', flag: '🇯🇵' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: '+10:00', flag: '🇦🇺' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)', offset: '+12:00', flag: '🇳🇿' }
]

interface TimezoneContextType {
  timezone: string
  setTimezone: (tz: string) => void
  timezones: typeof TIMEZONES
  formatDateTime: (date: string | Date, formatStr?: string) => string
  formatRelative: (date: string | Date) => string
  formatTime: (date: string | Date) => string
  formatDate: (date: string | Date) => string
  getCurrentTimezoneLabel: () => string
  detectUserTimezone: () => string
}

const TimezoneContext = createContext<TimezoneContextType | undefined>(undefined)

export const TimezoneProvider = ({ children }: { children: ReactNode }) => {
  const [timezone, setTimezoneState] = useState<string>(() => {
    const saved = localStorage.getItem('user_timezone')
    return saved || Intl.DateTimeFormat().resolvedOptions().timeZone
  })
  const [userId, setUserId] = useState<string | null>(null)

  // Get user ID from auth state changes only (no getSession call to avoid race conditions)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => subscription.unsubscribe()
  }, [])

  // Sync with profile when user is authenticated
  useEffect(() => {
    if (userId) {
      supabase
        .from('profiles')
        .select('timezone')
        .eq('user_id', userId)
        .maybeSingle()
        .then(({ data }) => {
          if (data?.timezone) {
            setTimezoneState(data.timezone)
          }
        })
    }
  }, [userId])

  const setTimezone = async (tz: string) => {
    setTimezoneState(tz)
    localStorage.setItem('user_timezone', tz)
    
    // Save to profile if authenticated
    if (userId) {
      await supabase
        .from('profiles')
        .update({ timezone: tz } as any)
        .eq('user_id', userId)
    }
  }

  const detectUserTimezone = (): string => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  }

  const formatDateTime = (date: string | Date, formatStr = 'PPpp'): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      const zonedDate = toZonedTime(dateObj, timezone)
      return formatTz(zonedDate, formatStr, { timeZone: timezone })
    } catch {
      return String(date)
    }
  }

  const formatRelative = (date: string | Date): string => {
    try {
      const dateObj = typeof date === 'string' ? parseISO(date) : date
      return formatDistance(dateObj, new Date(), { addSuffix: true })
    } catch {
      return String(date)
    }
  }

  const formatTime = (date: string | Date): string => {
    return formatDateTime(date, 'h:mm a')
  }

  const formatDate = (date: string | Date): string => {
    return formatDateTime(date, 'MMM d, yyyy')
  }

  const getCurrentTimezoneLabel = (): string => {
    const found = TIMEZONES.find(tz => tz.value === timezone)
    return found?.label || timezone
  }

  return (
    <TimezoneContext.Provider value={{
      timezone,
      setTimezone,
      timezones: TIMEZONES,
      formatDateTime,
      formatRelative,
      formatTime,
      formatDate,
      getCurrentTimezoneLabel,
      detectUserTimezone
    }}>
      {children}
    </TimezoneContext.Provider>
  )
}

export const useTimezone = () => {
  const context = useContext(TimezoneContext)
  if (!context) {
    throw new Error('useTimezone must be used within a TimezoneProvider')
  }
  return context
}
