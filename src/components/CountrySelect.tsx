import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Globe, MapPin } from 'lucide-react'

export const COUNTRIES = [
  { code: 'ALL', name: 'All Countries', flag: '🌍' },
  { code: 'REMOTE', name: 'Remote Worldwide', flag: '🌐' },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'AE', name: 'UAE', flag: '🇦🇪' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮' },
  { code: 'MA', name: 'Morocco', flag: '🇲🇦' }
]

interface CountrySelectProps {
  value: string
  onChange: (value: string) => void
  label?: string
  showRemote?: boolean
  className?: string
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  label = 'Country',
  showRemote = true,
  className = ''
}) => {
  const selectedCountry = COUNTRIES.find(c => c.code === value)

  return (
    <div className={className}>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue>
            <span className="flex items-center gap-2">
              {selectedCountry?.flag} {selectedCountry?.name || 'Select Country'}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="bg-background border border-border z-[100] max-h-64">
          <SelectItem value="ALL">
            <span className="flex items-center gap-2">🌍 All Countries</span>
          </SelectItem>
          {showRemote && (
            <SelectItem value="REMOTE">
              <span className="flex items-center gap-2">🌐 Remote Worldwide</span>
            </SelectItem>
          )}
          <div className="border-t my-1" />
          {COUNTRIES.filter(c => c.code !== 'ALL' && c.code !== 'REMOTE').map((country) => (
            <SelectItem key={country.code} value={country.code}>
              <span className="flex items-center gap-2">
                {country.flag} {country.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

interface JobLocationBadgeProps {
  countryCode?: string
  isRemote?: boolean
  city?: string
  className?: string
}

export const JobLocationBadge: React.FC<JobLocationBadgeProps> = ({
  countryCode,
  isRemote = false,
  city,
  className = ''
}) => {
  const country = COUNTRIES.find(c => c.code === countryCode)

  if (isRemote) {
    return (
      <Badge variant="secondary" className={`flex items-center gap-1 ${className}`}>
        <Globe className="h-3 w-3" />
        Remote
        {countryCode && countryCode !== 'REMOTE' && country && (
          <span className="text-muted-foreground">({country.flag})</span>
        )}
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${className}`}>
      <MapPin className="h-3 w-3" />
      {country?.flag} {city || country?.name || 'On-site'}
    </Badge>
  )
}

// Utility to get country name from code
export const getCountryName = (code: string): string => {
  const country = COUNTRIES.find(c => c.code === code)
  return country?.name || code
}

// Utility to get country flag from code
export const getCountryFlag = (code: string): string => {
  const country = COUNTRIES.find(c => c.code === code)
  return country?.flag || '🌍'
}
