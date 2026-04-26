import React, { useState } from 'react'
import { Plus, Minus, Eye, EyeOff, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { useWallet, WalletBalance } from '@/hooks/useWallet'
import { useUserCountry } from '@/hooks/useUserCountry'
import { useCurrency, CURRENCIES, CurrencyCode } from '@/hooks/useCurrency'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DepositDialog } from './DepositDialog'
import { WithdrawalDialog } from './WithdrawalDialog'
import { TransferDialog } from './TransferDialog'

export const WalletCard = () => {
  const { balance, loading } = useWallet()
  const { isNigerian } = useUserCountry()
  const { currency, setCurrency, formatPreferred, convertFromNC } = useCurrency()
  const [showBalance, setShowBalance] = useState(true)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  const curr = CURRENCIES[currency]

  const formatBalance = (amount: number) => {
    if (currency === 'NC') return `NC ${amount.toLocaleString()}`
    const converted = convertFromNC(amount, currency)
    return `${curr.symbol}${converted.toLocaleString(undefined, {
      minimumFractionDigits: currency === 'NGN' ? 0 : 2,
      maximumFractionDigits: 2,
    })}`
  }

  const formatSecondary = (amount: number) => {
    if (currency === 'NC') {
      const usd = convertFromNC(amount, 'USD')
      return `~$${usd.toFixed(2)} USD`
    }
    return `NC ${amount.toLocaleString()}`
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-primary to-primary-glow border-none text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-white/90">Wallet</CardTitle>
            <button
              onClick={() => setShowBalance(!showBalance)}
              className="p-1 hover:bg-white/10 rounded"
            >
              {showBalance ? (
                <EyeOff className="h-4 w-4 text-white/70" />
              ) : (
                <Eye className="h-4 w-4 text-white/70" />
              )}
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div>
              <div className="text-3xl font-bold text-white">
                {loading ? (
                  <div className="animate-pulse bg-white/20 h-8 w-32 rounded"></div>
                ) : showBalance ? (
                  formatBalance(balance.total)
                ) : (
                  '****'
                )}
              </div>
              {showBalance && !loading && (
                <div className="text-sm text-white/70">
                  {formatUsd(balance.total)} USD
                </div>
              )}
            </div>

            {showBalance && balance.escrow_hold > 0 && (
              <div className="text-xs text-white/70 bg-white/10 rounded px-2 py-1">
                🔒 Escrow Hold: NC {balance.escrow_hold.toLocaleString()}
                <p className="text-[10px] mt-0.5">Locked in SafePay transactions</p>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-2">
              <BrandButton
                variant="outline"
                size="sm"
                onClick={() => setShowDeposit(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Plus className="h-4 w-4 mr-1" />
                Buy
              </BrandButton>
              <BrandButton
                variant="outline"
                size="sm"
                onClick={() => setShowTransfer(true)}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Send className="h-4 w-4 mr-1" />
                Send
              </BrandButton>
              <BrandButton
                variant="outline"
                size="sm"
                onClick={() => setShowWithdrawal(true)}
                disabled={balance.withdrawable < 100}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Minus className="h-4 w-4 mr-1" />
                Withdraw
              </BrandButton>
            </div>
            
            {balance.withdrawable < 100 && (
              <p className="text-xs text-white/70">
                Minimum withdrawal: NC 100 (~$0.06)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <DepositDialog 
        open={showDeposit} 
        onOpenChange={setShowDeposit} 
      />
      <TransferDialog 
        open={showTransfer} 
        onOpenChange={setShowTransfer}
      />
      <WithdrawalDialog 
        open={showWithdrawal} 
        onOpenChange={setShowWithdrawal}
        currentBalance={balance.withdrawable}
      />
    </>
  )
}