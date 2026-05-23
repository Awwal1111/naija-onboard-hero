import { useEffect, useState } from 'react'
import type { CurrencyCode } from './useCurrency'

interface GeoData {
  countryCode: string // ISO-2 e.g. 'NG'
  countryName: string
  currency: CurrencyCode
}

// Map ISO country code -> supported display currency
const COUNTRY_TO_CURRENCY: Record<string, CurrencyCode> = {
  NG: 'NGN',
  US: 'USD', UM: 'USD', PR: 'USD', VI: 'USD',
  GB: 'GBP',
  KE: 'KES',
  GH: 'GHS',
  ZA: 'ZAR',
  IN: 'INR',
  AE: 'AED',
  // Eurozone
  DE: 'EUR', FR: 'EUR', IT: 'EUR', ES: 'EUR', NL: 'EUR', BE: 'EUR', IE: 'EUR',
  PT: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', SK: 'EUR', SI: 'EUR',
  EE: 'EUR', LT: 'EUR', LV: 'EUR', MT: 'EUR', CY: 'EUR', HR: 'EUR',
}

const CACHE_KEY = 'geo_location_v1'
const CACHE_TTL = 1000 * 60 * 60 * 24 * 7 // 7 days

let inflight: Promise<GeoData | null> | null = null

async function fetchGeo(): Promise<GeoData | null> {
  // Try cache first
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.expiry > Date.now() && parsed.data) return parsed.data
    }
  } catch {}

  // Try multiple free endpoints with fallback
  const endpoints = [
    { url: 'https://ipapi.co/json/', map: (j: any) => ({ countryCode: j.country_code, countryName: j.country_name }) },
    { url: 'https://ipwho.is/', map: (j: any) => ({ countryCode: j.country_code, countryName: j.country }) },
    { url: 'https://get.geojs.io/v1/ip/country.json', map: (j: any) => ({ countryCode: j.country, countryName: j.name }) },
  ]

  for (const ep of endpoints) {
    try {
      const ctrl = new AbortController()
      const tid = setTimeout(() => ctrl.abort(), 4000)
      const res = await fetch(ep.url, { signal: ctrl.signal })
      clearTimeout(tid)
      if (!res.ok) continue
      const json = await res.json()
      const { countryCode, countryName } = ep.map(json)
      if (!countryCode) continue
      const cc = String(countryCode).toUpperCase()
      const data: GeoData = {
        countryCode: cc,
        countryName: countryName || cc,
        currency: COUNTRY_TO_CURRENCY[cc] || 'USD',
      }
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ expiry: Date.now() + CACHE_TTL, data }))
      } catch {}
      return data
    } catch {
      continue
    }
  }
  return null
}

export const useGeoLocation = () => {
  const [geo, setGeo] = useState<GeoData | null>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached)
        if (parsed.expiry > Date.now()) return parsed.data
      }
    } catch {}
    return null
  })
  const [loading, setLoading] = useState(!geo)

  useEffect(() => {
    if (geo) return
    if (!inflight) inflight = fetchGeo()
    inflight.then(d => {
      if (d) setGeo(d)
      setLoading(false)
      inflight = null
    })
  }, [geo])

  return { geo, loading, isNigerian: geo?.countryCode === 'NG' }
}
