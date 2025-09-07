import React, { useState } from 'react'
import { Plus, Minus, Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { useWallet } from '@/hooks/useWallet'
import { DepositDialog } from './DepositDialog'
import { WithdrawalDialog } from './WithdrawalDialog'

export const WalletCard = () => {
  const { balance, loading } = useWallet()
  const [showBalance, setShowBalance] = useState(true)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showWithdrawal, setShowWithdrawal] = useState(false)

  const formatBalance = (amount: number) => {
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
            <CardTitle className="text-lg font-medium text-white/90">Wallet Balance</CardTitle>
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
                formatBalance(balance)
              ) : (
                '****'
              )}
            </div>
            
            <div className="flex gap-2">
              <BrandButton
                variant="outline"
                size="sm"
                onClick={() => setShowDeposit(true)}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Plus className="h-4 w-4 mr-2" />
                Deposit
              </BrandButton>
              <BrandButton
                variant="outline"
                size="sm"
                onClick={() => setShowWithdrawal(true)}
                disabled={balance < 500}
                className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 disabled:opacity-50"
              >
                <Minus className="h-4 w-4 mr-2" />
                Withdraw
              </BrandButton>
            </div>
            
            {balance < 500 && (
              <p className="text-xs text-white/70">
                Minimum withdrawal: ₦500
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <DepositDialog 
        open={showDeposit} 
        onOpenChange={setShowDeposit} 
      />
      <WithdrawalDialog 
        open={showWithdrawal} 
        onOpenChange={setShowWithdrawal}
        currentBalance={balance}
      />
    </>
  )
}