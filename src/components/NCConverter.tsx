import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ArrowRightLeft, Calculator } from 'lucide-react'

// NC to Naira rate (1 NC = 1 Naira by default, can be configured)
const NC_TO_NAIRA_RATE = 1

export const NCConverter = () => {
  const [ncAmount, setNcAmount] = useState<string>('')
  const [nairaAmount, setNairaAmount] = useState<string>('')
  const [isOpen, setIsOpen] = useState(false)

  const handleNCChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, '')
    setNcAmount(numValue)
    if (numValue) {
      const converted = parseFloat(numValue) * NC_TO_NAIRA_RATE
      setNairaAmount(converted.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    } else {
      setNairaAmount('')
    }
  }

  const handleNairaChange = (value: string) => {
    const numValue = value.replace(/[^0-9.]/g, '')
    setNairaAmount(numValue)
    if (numValue) {
      const converted = parseFloat(numValue) / NC_TO_NAIRA_RATE
      setNcAmount(converted.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))
    } else {
      setNcAmount('')
    }
  }

  const quickAmounts = [100, 500, 1000, 5000, 10000, 50000]

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
            <Calculator className="h-5 w-5 text-primary" />
            NC ↔ Naira Converter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Conversion Rate Info */}
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <p className="text-sm text-muted-foreground">Current Rate</p>
            <p className="text-lg font-bold text-primary">1 NC = ₦{NC_TO_NAIRA_RATE.toFixed(2)}</p>
          </div>

          {/* NC Input */}
          <div className="space-y-2">
            <Label htmlFor="nc-amount">NaijaCoins (NC)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">NC</span>
              <Input
                id="nc-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={ncAmount}
                onChange={(e) => handleNCChange(e.target.value)}
                className="pl-12 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <div className="bg-muted rounded-full p-2">
              <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>

          {/* Naira Input */}
          <div className="space-y-2">
            <Label htmlFor="naira-amount">Nigerian Naira (₦)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">₦</span>
              <Input
                id="naira-amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={nairaAmount}
                onChange={(e) => handleNairaChange(e.target.value)}
                className="pl-10 text-lg font-semibold"
              />
            </div>
          </div>

          {/* Quick Amounts */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Quick Convert</Label>
            <div className="flex flex-wrap gap-2">
              {quickAmounts.map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => handleNCChange(amount.toString())}
                  className="text-xs"
                >
                  {amount.toLocaleString()} NC
                </Button>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
