import React, { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'

const COUNTRY_CODES = [
  { code: '+234', country: 'Nigeria', flag: '🇳🇬', format: '### ### ####' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸', format: '### ### ####' },
  { code: '+44', country: 'UK', flag: '🇬🇧', format: '#### ######' },
  { code: '+254', country: 'Kenya', flag: '🇰🇪', format: '### ######' },
  { code: '+233', country: 'Ghana', flag: '🇬🇭', format: '## ### ####' },
  { code: '+27', country: 'South Africa', flag: '🇿🇦', format: '## ### ####' },
  { code: '+91', country: 'India', flag: '🇮🇳', format: '##### #####' },
  { code: '+971', country: 'UAE', flag: '🇦🇪', format: '## ### ####' },
  { code: '+33', country: 'France', flag: '🇫🇷', format: '# ## ## ## ##' },
  { code: '+49', country: 'Germany', flag: '🇩🇪', format: '#### #######' },
  { code: '+86', country: 'China', flag: '🇨🇳', format: '### #### ####' },
  { code: '+55', country: 'Brazil', flag: '🇧🇷', format: '## # #### ####' },
  { code: '+34', country: 'Spain', flag: '🇪🇸', format: '### ## ## ##' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬', format: '### ### ####' },
  { code: '+212', country: 'Morocco', flag: '🇲🇦', format: '## ### ####' },
  { code: '+251', country: 'Ethiopia', flag: '🇪🇹', format: '## ### ####' },
  { code: '+256', country: 'Uganda', flag: '🇺🇬', format: '## ### ####' },
  { code: '+255', country: 'Tanzania', flag: '🇹🇿', format: '### ### ###' },
  { code: '+221', country: 'Senegal', flag: '🇸🇳', format: '## ### ## ##' },
  { code: '+225', country: "Côte d'Ivoire", flag: '🇨🇮', format: '## ## ## ## ##' }
]

interface InternationalPhoneInputProps {
  value: string
  onChange: (fullNumber: string, countryCode: string) => void
  label?: string
  required?: boolean
  error?: string
  className?: string
}

export const InternationalPhoneInput: React.FC<InternationalPhoneInputProps> = ({
  value,
  onChange,
  label = 'Phone Number',
  required = false,
  error,
  className = ''
}) => {
  // Parse initial value to extract country code
  const parseInitialValue = () => {
    for (const country of COUNTRY_CODES) {
      if (value.startsWith(country.code)) {
        return {
          countryCode: country.code,
          number: value.slice(country.code.length).trim()
        }
      }
    }
    return { countryCode: '+234', number: value.replace(/^\+\d+\s*/, '') }
  }

  const initial = parseInitialValue()
  const [countryCode, setCountryCode] = useState(initial.countryCode)
  const [number, setNumber] = useState(initial.number)

  const handleCountryChange = (code: string) => {
    setCountryCode(code)
    onChange(`${code}${number}`, code)
  }

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/[^0-9]/g, '')
    setNumber(rawValue)
    onChange(`${countryCode}${rawValue}`, countryCode)
  }

  const selectedCountry = COUNTRY_CODES.find(c => c.code === countryCode)

  return (
    <div className={className}>
      {label && (
        <Label className="text-sm font-medium mb-2 block">
          {label} {required && <span className="text-destructive">*</span>}
        </Label>
      )}
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={handleCountryChange}>
          <SelectTrigger className="w-28 shrink-0">
            <SelectValue>
              <span className="flex items-center gap-1">
                {selectedCountry?.flag} {countryCode}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-background border border-border z-[100] max-h-64">
            {COUNTRY_CODES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                <span className="flex items-center gap-2">
                  {country.flag} {country.code} <span className="text-xs text-muted-foreground">({country.country})</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="tel"
          inputMode="numeric"
          value={number}
          onChange={handleNumberChange}
          placeholder={selectedCountry?.format.replace(/#/g, '0') || '000 000 0000'}
          className="flex-1"
        />
      </div>
      {error && <p className="text-sm text-destructive mt-1">{error}</p>}
    </div>
  )
}

// Utility to format phone number for display
export const formatPhoneNumber = (phone: string): string => {
  if (!phone) return ''
  
  for (const country of COUNTRY_CODES) {
    if (phone.startsWith(country.code)) {
      const number = phone.slice(country.code.length)
      return `${country.flag} ${country.code} ${number}`
    }
  }
  
  return phone
}

// Validate international phone number
export const isValidInternationalPhone = (phone: string): boolean => {
  if (!phone) return false
  
  // Check if starts with a valid country code
  const hasValidCode = COUNTRY_CODES.some(c => phone.startsWith(c.code))
  if (!hasValidCode) return false
  
  // Check minimum length (country code + at least 6 digits)
  const digitsOnly = phone.replace(/\D/g, '')
  return digitsOnly.length >= 8 && digitsOnly.length <= 15
}
