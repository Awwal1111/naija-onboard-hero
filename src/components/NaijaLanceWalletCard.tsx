import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, Send, Download } from 'lucide-react'
import { WalletBalance } from '@/hooks/useWallet'

interface NaijaLanceWalletCardProps {
  balance: WalletBalance
  showBreakdown?: boolean
  onTransfer?: () => void
  onWithdraw?: () => void
  className?: string
}

const NaijaLanceWalletCard: React.FC<NaijaLanceWalletCardProps> = ({ 
  balance, 
  showBreakdown = true, 
  onTransfer,
  onWithdraw,
  className = '' 
}) => {
  const formatCurrency = (amount: number) => {
    return `NC ${amount.toLocaleString()}`
  }

  return (
    <Card className={`bg-gradient-to-br from-primary via-primary to-brand-green text-white ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-white">
          <Wallet className="h-5 w-5" />
          Naijacoin Wallet
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Total Balance */}
        <div className="text-center">
          <p className="text-sm text-white/80 mb-1">Total Balance</p>
          <p className="text-3xl font-bold text-white">
            {formatCurrency(balance.total)}
          </p>
          <p className="text-sm text-white/70">
            ₦{balance.total.toLocaleString()}
          </p>
        </div>

        {/* Balance Breakdown */}
        {showBreakdown && (
          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/20">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ArrowUpRight className="h-4 w-4 text-green-300" />
                <span className="text-sm text-white/80">Withdrawable</span>
              </div>
              <p className="font-semibold text-white">
                {formatCurrency(balance.withdrawable)}
              </p>
              <p className="text-xs text-white/60">
                Can withdraw & transfer
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="h-4 w-4 text-blue-300" />
                <span className="text-sm text-white/80">Bonus</span>
              </div>
              <p className="font-semibold text-white">
                {formatCurrency(balance.non_withdrawable)}
              </p>
              <p className="text-xs text-white/60">
                From daily sign-in
              </p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onTransfer}
            className="bg-white/20 text-white hover:bg-white/30 flex-1 border-0"
          >
            <Send className="h-4 w-4 mr-1" />
            Send
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onWithdraw}
            disabled={balance.withdrawable < 3000}
            className="bg-white/20 text-white hover:bg-white/30 flex-1 border-0 disabled:opacity-50"
          >
            <Download className="h-4 w-4 mr-1" />
            Withdraw
          </Button>
        </div>

        {balance.withdrawable < 3000 && (
          <p className="text-center text-xs text-white/70 mt-2">
            Minimum withdrawal: NC 3,000
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default NaijaLanceWalletCard