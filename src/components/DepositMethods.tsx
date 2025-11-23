import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { ArrowDownUp, Send, Wallet, Sparkles } from 'lucide-react'

interface DepositMethodsProps {
  onSelectMethod: (method: 'ramp' | 'crypto' | 'telegram') => void
}

export const DepositMethods = ({ onSelectMethod }: DepositMethodsProps) => {
  return (
    <div className="grid gap-4">
      {/* Recommended: Bank Deposit */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent relative overflow-hidden">
        <Badge className="absolute top-4 right-4 bg-primary">
          <Sparkles className="h-3 w-3 mr-1" />
          Recommended
        </Badge>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ArrowDownUp className="h-5 w-5 text-primary" />
            Bank Deposit
          </CardTitle>
          <CardDescription>
            Instant funding via secure banking • Min: ₦3,000
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandButton onClick={() => onSelectMethod('ramp')} className="w-full">
            Deposit Now
          </BrandButton>
        </CardContent>
      </Card>

      {/* Crypto Deposit */}
      <Card className="hover:border-primary/40 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            Crypto Deposit
          </CardTitle>
          <CardDescription>
            Send USDT, cUSD, or CELO to your wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandButton onClick={() => onSelectMethod('crypto')} variant="outline" className="w-full">
            View Wallet Address
          </BrandButton>
        </CardContent>
      </Card>

      {/* Telegram Bot */}
      <Card className="hover:border-blue-500/40 transition-colors">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Send className="h-5 w-5 text-blue-500" />
            Telegram Bot
          </CardTitle>
          <CardDescription>
            Deposit & get support via Telegram
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandButton onClick={() => onSelectMethod('telegram')} variant="outline" className="w-full">
            Open Telegram
          </BrandButton>
        </CardContent>
      </Card>
    </div>
  )
}
