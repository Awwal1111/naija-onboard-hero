import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowRightLeft, Calculator, Globe } from 'lucide-react'
import { useCurrency, CURRENCIES, CurrencyCode } from '@/hooks/useCurrency'
import { Badge } from '@/components/ui/badge'

export const CurrencyConverterDialog = () => {
  const { currencies, currency: userCurrency } = useCurrency()
  const [ncAmount, setNcAmount] = useState<string>('')
  const [fromCurrency, setFromCurrency] = useState<CurrencyCode>('NC')
  const [toCurrency, setToCurrency] = useState<CurrencyCode>(userCurrency === 'NC' ? 'USD' : userCurrency)
  const [isOpen, setIsOpen] = useState(false)

  const handleNCChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, '')
    setNcAmount(numValue)
  }

  const convertAmount = (): string => {
    if (!ncAmount) return '0.00'
    const amount = parseFloat(ncAmount)
    if (isNaN(amount)) return '0.00'

    // Convert from source currency to NC, then to target
    const fromRate = currencies[fromCurrency].rateToNC
    const toRate = currencies[toCurrency].rateToNC
    
    const ncValue = fromCurrency === 'NC' ? amount : amount * fromRate
    const result = toCurrency === 'NC' ? ncValue : ncValue / toRate

    return result.toLocaleString(undefined, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })
  }

  const swapCurrencies = () => {
    const temp = fromCurrency
    setFromCurrency(toCurrency)
    setToCurrency(temp)
  }

  const quickAmounts = [1000, 5000, 10000, 50000, 100000]

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10">
          <Calculator className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Currency Converter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* From Currency */}
          <div className="space-y-2">
            <Label>From</Label>
            <div className="flex gap-2">
              <Select value={fromCurrency} onValueChange={(v) => setFromCurrency(v as CurrencyCode)}>
                <SelectTrigger className="w-32">
                  <SelectValue>
                    {currencies[fromCurrency]?.flag} {fromCurrency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-[100]">
                  {Object.entries(CURRENCIES).map(([code, curr]) => (
                    <SelectItem key={code} value={code}>
                      {curr.flag} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={ncAmount}
                onChange={(e) => handleNCChange(e.target.value)}
                className="flex-1 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              size="icon"
              onClick={swapCurrencies}
              className="rounded-full"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* To Currency */}
          <div className="space-y-2">
            <Label>To</Label>
            <div className="flex gap-2">
              <Select value={toCurrency} onValueChange={(v) => setToCurrency(v as CurrencyCode)}>
                <SelectTrigger className="w-32">
                  <SelectValue>
                    {currencies[toCurrency]?.flag} {toCurrency}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="bg-background border border-border z-[100]">
                  {Object.entries(CURRENCIES).map(([code, curr]) => (
                    <SelectItem key={code} value={code}>
                      {curr.flag} {code}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex-1 p-3 bg-muted rounded-md text-lg font-semibold">
                {currencies[toCurrency]?.symbol}{convertAmount()}
              </div>
            </div>
          </div>

          {/* Exchange Rate Info */}
          <div className="bg-primary/10 rounded-lg p-3 text-center space-y-1">
            <p className="text-sm text-muted-foreground">Exchange Rate</p>
            <p className="font-bold text-primary">
              1 {fromCurrency} = {currencies[fromCurrency]?.symbol}1 → {
                fromCurrency === toCurrency ? '1' :
                (currencies[fromCurrency].rateToNC / currencies[toCurrency].rateToNC).toFixed(4)
              } {toCurrency}
            </p>
          </div>

          {/* Quick Amounts (NC) */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Convert (NC)</Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFromCurrency('NC')
                    handleNCChange(amount.toString())
                  }}
                  className="text-xs"
                >
                  NC {amount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* Supported Currencies */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Supported Currencies</Label>
            <div className="flex flex-wrap gap-1">
              {Object.entries(CURRENCIES).map(([code, curr]) => (
                <Badge key={code} variant="secondary" className="text-xs">
                  {curr.flag} {code}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
