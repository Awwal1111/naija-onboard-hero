import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Wallet, ArrowUpRight, ArrowDownLeft, TrendingUp, Send, Download, Plus, Eye, EyeOff } from 'lucide-react'
import { WalletBalance } from '@/hooks/useWallet'
import { TransferDialog } from '@/components/TransferDialog'
import { DepositDialog } from '@/components/DepositDialog'

interface NaijaLanceWalletCardProps {
  balance: WalletBalance
  showBreakdown?: boolean
  className?: string
}

const NaijaLanceWalletCard: React.FC<NaijaLanceWalletCardProps> = ({ 
  balance, 
  showBreakdown = true, 
  className = '' 
}) => {
  const [showTransfer, setShowTransfer] = useState(false)
  const [showDeposit, setShowDeposit] = useState(false)
  const [showBalances, setShowBalances] = useState(true)

  const formatCurrency = (amount: number) => {
    return `NC ${amount.toLocaleString()}`
  }

  return (
    <>
      <Card className={`bg-gradient-to-br from-primary/10 to-secondary/10 border-primary/20 ${className}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              NaijaLance Wallet
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showBalances ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Total Balance */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Total Balance</p>
            <p className="text-3xl font-bold text-primary">
              {showBalances ? formatCurrency(balance.total) : 'NC ****'}
            </p>
            <p className="text-sm text-muted-foreground">
              {showBalances ? `₦${balance.total.toLocaleString()}` : '₦ ****'}
            </p>
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowDeposit(true)}
              className="flex-1 gap-2"
              variant="default"
            >
              <Plus className="h-4 w-4" />
              Buy NC
            </Button>
            
            <Button
              onClick={() => setShowTransfer(true)}
              className="flex-1 gap-2"
              variant="outline"
            >
              <Send className="h-4 w-4" />
              Send
            </Button>
          </div>

          {/* Exchange Rate Info */}
          <div className="text-center">
            <Badge variant="secondary" className="text-xs">
              1 NC = ₦1 • Instant transactions
            </Badge>
          </div>
        </CardContent>
      </Card>

      <TransferDialog open={showTransfer} onOpenChange={setShowTransfer} />
      <DepositDialog open={showDeposit} onOpenChange={setShowDeposit} />
    </>
  )
}

export default NaijaLanceWalletCard