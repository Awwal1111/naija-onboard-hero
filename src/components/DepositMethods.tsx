import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { Badge } from '@/components/ui/badge'
import { ArrowDownUp, Send, Wallet, Sparkles, Zap } from 'lucide-react'
import { useMiniPay } from '@/hooks/useMiniPay'
import { useUserCountry } from '@/hooks/useUserCountry'

interface DepositMethodsProps {
  onSelectMethod: (method: 'ramp' | 'crypto' | 'telegram' | 'minipay') => void
}

export const DepositMethods = ({ onSelectMethod }: DepositMethodsProps) => {
  const { isMiniPay } = useMiniPay();
  const { isNigerian } = useUserCountry();

  return (
    <div className="grid gap-4">
      {/* MiniPay - Show first if in MiniPay environment */}
      {isMiniPay && (
        <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5 relative overflow-hidden">
          <Badge className="absolute top-4 right-4 bg-green-600">
            <Zap className="h-3 w-3 mr-1" />
            Instant
          </Badge>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-5 w-5 text-green-600" />
              MiniPay Deposit
            </CardTitle>
            <CardDescription>
              Pay directly from your MiniPay wallet
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandButton onClick={() => onSelectMethod('minipay')} className="w-full bg-green-600 hover:bg-green-700">
              Deposit with MiniPay
            </BrandButton>
          </CardContent>
        </Card>
      )}

      {/* Bank Deposit - Nigerian users only */}
      {isNigerian && (
        <Card className={`${!isMiniPay ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent' : ''} relative overflow-hidden`}>
          {!isMiniPay && (
            <Badge className="absolute top-4 right-4 bg-primary">
              <Sparkles className="h-3 w-3 mr-1" />
              Recommended
            </Badge>
          )}
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ArrowDownUp className="h-5 w-5 text-primary" />
              Bank Deposit (₦ Naira)
            </CardTitle>
            <CardDescription>
              Instant funding via secure banking • Nigerian banks only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BrandButton onClick={() => onSelectMethod('ramp')} className="w-full" variant={isMiniPay ? 'outline' : 'primary'}>
              Deposit Now
            </BrandButton>
          </CardContent>
        </Card>
      )}

      {/* Crypto Deposit - Recommended for international users */}
      <Card className={`${!isNigerian && !isMiniPay ? 'border-primary/20 bg-gradient-to-br from-primary/5 to-transparent' : 'hover:border-primary/40'} transition-colors relative overflow-hidden`}>
        {!isNigerian && !isMiniPay && (
          <Badge className="absolute top-4 right-4 bg-primary">
            <Sparkles className="h-3 w-3 mr-1" />
            Recommended
          </Badge>
        )}
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-5 w-5" />
            Crypto Deposit
          </CardTitle>
          <CardDescription>
            Send USDT, cUSD, or CELO to your wallet • Works globally
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BrandButton onClick={() => onSelectMethod('crypto')} variant={!isNigerian && !isMiniPay ? 'primary' : 'outline'} className="w-full">
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
