import React, { useState } from 'react'
import { Plus, Minus, Eye, EyeOff, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { useWallet, WalletBalance } from '@/hooks/useWallet'
import { DepositDialog } from './DepositDialog'
import { WithdrawalDialog } from './WithdrawalDialog'
import { TransferDialog } from './TransferDialog'

export const WalletCard = () => {
  const { balance, loading } = useWallet()
  const [showBalance, setShowBalance] = useState(true)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdrawal, setShowWithdrawal] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  const formatBalance = (amount: number) => {
    return `NC ${amount.toLocaleString()}`
  }

  const formatNaira = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(amount)
  }

  return (
    <>
      <Card className="bg-gradient-to-br from-primary to-primary-glow border-none text-white">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-medium text-white/90">Naijacoin Wallet</CardTitle>
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
            <div className="text-3xl font-bold text-white">
              {loading ? (
                <div className="animate-pulse bg-white/20 h-8 w-32 rounded"></div>
              ) : showBalance ? (
                formatBalance(balance.total)
              ) : (
                '****'
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
                disabled={balance.withdrawable < 3000}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Minus className="h-4 w-4 mr-1" />
                Withdraw
              </BrandButton>
            </div>
            
            {balance.withdrawable < 3000 && (
              <p className="text-xs text-white/70">
                Minimum withdrawal: NC 3,000
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