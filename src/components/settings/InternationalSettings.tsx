import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Globe, Clock, Wallet, Languages, MapPin } from 'lucide-react'
import { useCurrency, CURRENCIES, CurrencyCode } from '@/hooks/useCurrency'
import { useTimezone, TIMEZONES } from '@/hooks/useTimezone'
import { useLanguage } from '@/hooks/useLanguage'
import { useToast } from '@/hooks/use-toast'
import { Separator } from '@/components/ui/separator'

export const InternationalSettings = () => {
  const { currency, setCurrency, currencies } = useCurrency()
  const { timezone, setTimezone, timezones, getCurrentTimezoneLabel, detectUserTimezone } = useTimezone()
  const { language, setLanguage, languageNames } = useLanguage()
  const { toast } = useToast()

  const handleCurrencyChange = (code: CurrencyCode) => {
    setCurrency(code)
    toast({
      title: 'Currency Updated',
      description: `Display currency set to ${currencies[code].name}`
    })
  }

  const handleTimezoneChange = (tz: string) => {
    setTimezone(tz)
    toast({
      title: 'Timezone Updated',
      description: `All times will now display in ${tz.split('/')[1] || tz}`
    })
  }

  const handleAutoDetectTimezone = () => {
    const detected = detectUserTimezone()
    setTimezone(detected)
    toast({
      title: 'Timezone Detected',
      description: `Set to ${detected}`
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Regional Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Display Currency */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                Display Currency
              </h4>
              <p className="text-sm text-muted-foreground">
                Show prices in your preferred currency alongside NC
              </p>
            </div>
          </div>
          <Select value={currency} onValueChange={(v) => handleCurrencyChange(v as CurrencyCode)}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  {currencies[currency]?.flag} {currencies[currency]?.name} ({currencies[currency]?.symbol})
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-[100] max-h-64">
              {Object.entries(CURRENCIES).map(([code, curr]) => (
                <SelectItem key={code} value={code}>
                  <span className="flex items-center gap-2">
                    {curr.flag} {curr.name} ({curr.symbol})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              1 {currencies[currency]?.symbol} = NC {currencies[currency]?.rateToNC.toLocaleString()}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Live rates updated regularly
            </Badge>
          </div>
        </div>

        <Separator />

        {/* Timezone */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                Timezone
              </h4>
              <p className="text-sm text-muted-foreground">
                All times will display in your timezone
              </p>
            </div>
            <button
              onClick={handleAutoDetectTimezone}
              className="text-xs text-primary hover:underline"
            >
              Auto-detect
            </button>
          </div>
          <Select value={timezone} onValueChange={handleTimezoneChange}>
            <SelectTrigger className="w-full">
              <SelectValue>
                <span className="flex items-center gap-2">
                  {timezones.find(tz => tz.value === timezone)?.flag} {getCurrentTimezoneLabel()}
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-[100] max-h-64">
              {TIMEZONES.map((tz) => (
                <SelectItem key={tz.value} value={tz.value}>
                  <span className="flex items-center gap-2">
                    {tz.flag} {tz.label} (UTC{tz.offset})
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Separator />

        {/* Language (Extended) */}
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-foreground flex items-center gap-2">
              <Languages className="h-4 w-4 text-muted-foreground" />
              Language
            </h4>
            <p className="text-sm text-muted-foreground">
              Choose your preferred language
            </p>
          </div>
          <Select 
            value={language} 
            onValueChange={(v) => {
              setLanguage(v as any)
              toast({ title: 'Language Updated', description: `Set to ${languageNames[v as keyof typeof languageNames] || v}` })
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue>{languageNames[language]}</SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-background border border-border z-[100]">
              {/* Nigerian Languages */}
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="ha">🇳🇬 Hausa</SelectItem>
              <SelectItem value="yo">🇳🇬 Yoruba</SelectItem>
              <SelectItem value="ig">🇳🇬 Igbo</SelectItem>
              <SelectItem value="pcm">🇳🇬 Nigerian Pidgin</SelectItem>
              {/* International Languages */}
              <SelectItem value="fr">🇫🇷 Français (French)</SelectItem>
              <SelectItem value="es">🇪🇸 Español (Spanish)</SelectItem>
              <SelectItem value="ar">🇸🇦 العربية (Arabic)</SelectItem>
              <SelectItem value="pt">🇧🇷 Português (Portuguese)</SelectItem>
              <SelectItem value="sw">🇰🇪 Kiswahili (Swahili)</SelectItem>
              <SelectItem value="hi">🇮🇳 हिन्दी (Hindi)</SelectItem>
              <SelectItem value="zh">🇨🇳 中文 (Chinese)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="bg-primary/5 p-4 rounded-lg text-sm">
          <p className="font-medium text-foreground flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Global Reach
          </p>
          <p className="text-muted-foreground mt-1 text-xs">
            NaijaLancers serves freelancers and clients worldwide. Your regional settings help us 
            display prices, times, and content in your preferred format.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
