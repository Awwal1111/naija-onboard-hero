import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Info, Loader2, ExternalLink, RefreshCw } from 'lucide-react'
import { useUSDTStaking } from '@/hooks/useUSDTStaking'
import { useWallet } from '@/hooks/useWallet'

export const USDTStakingCard = () => {
  const { position, apy, apyLoading, loading, deposit, withdraw, refresh } = useUSDTStaking()
  const { balance } = useWallet()
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount <= 0) return
    
    const result = await deposit(amount)
    if (result.success) {
      setShowDepositDialog(false)
      setDepositAmount('')
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) return
    
    const result = await withdraw(amount)
    if (result.success) {
      setShowWithdrawDialog(false)
      setWithdrawAmount('')
    }
  }

  // Estimate USDT from NC (using approximate rate)
  const estimatedUSDT = (nc: number) => {
    const rate = 1600 // Approximate NGN/USDT
    return (nc / rate).toFixed(4)
  }

  return (
    <>
      <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              USDT Savings
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={refresh}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* APY Display */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Current APY</span>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {apyLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-600 font-bold">
                {apy}%
              </Badge>
            )}
          </div>

          {/* Staked Balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Staked Balance</span>
              <span className="text-xs text-muted-foreground">Powered by Moola Market</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                ${position?.amount_staked?.toFixed(2) || '0.00'}
              </span>
              <span className="text-sm text-muted-foreground">USDT</span>
            </div>
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Total Deposited</p>
              <p className="font-semibold text-foreground">
                ${position?.total_deposited?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Total Withdrawn</p>
              <p className="font-semibold text-foreground">
                ${position?.total_withdrawn?.toFixed(2) || '0.00'}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              onClick={() => setShowDepositDialog(true)} 
              className="w-full bg-emerald-600 hover:bg-emerald-700"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowUpRight className="h-4 w-4 mr-2" />
              )}
              Stake
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowWithdrawDialog(true)}
              disabled={loading || !position || position.amount_staked <= 0}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 mr-2" />
              )}
              Unstake
            </Button>
          </div>

          {/* Info Link */}
          <a 
            href="https://moola.market" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors pt-2"
          >
            Learn more about Moola Market
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
              Stake USDT
            </DialogTitle>
            <DialogDescription>
              Deposit NC to earn interest on Moola Market. Your NC will be converted to USDT and staked.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (NC)</label>
              <Input
                type="number"
                placeholder="Enter NC amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: NC {balance.withdrawable.toLocaleString()}</span>
                <span>≈ ${estimatedUSDT(parseFloat(depositAmount) || 0)} USDT</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {[1000, 5000, 10000, 20000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmount(amount.toString())}
                  className="flex-1 text-xs"
                >
                  {amount.toLocaleString()}
                </Button>
              ))}
            </div>

            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Earn up to {apy}% APY</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Interest is calculated and added automatically
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeposit} 
              disabled={loading || !depositAmount || parseFloat(depositAmount) <= 0}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Staking...
                </>
              ) : (
                'Confirm Stake'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Withdraw Dialog */}
      <Dialog open={showWithdrawDialog} onOpenChange={setShowWithdrawDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Unstake USDT
            </DialogTitle>
            <DialogDescription>
              Withdraw your staked USDT. It will be converted back to NC and credited to your wallet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (USDT)</label>
              <Input
                type="number"
                placeholder="Enter USDT amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                step="0.01"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Staked: ${position?.amount_staked?.toFixed(4) || '0'} USDT</span>
                <span>≈ NC {Math.round((parseFloat(withdrawAmount) || 0) * 1600).toLocaleString()}</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            {position && position.amount_staked > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount((position.amount_staked * 0.25).toFixed(4))}
                  className="flex-1 text-xs"
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount((position.amount_staked * 0.5).toFixed(4))}
                  className="flex-1 text-xs"
                >
                  50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount((position.amount_staked * 0.75).toFixed(4))}
                  className="flex-1 text-xs"
                >
                  75%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount(position.amount_staked.toFixed(4))}
                  className="flex-1 text-xs"
                >
                  Max
                </Button>
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">
                Your USDT will be withdrawn from Moola Market and the equivalent NC will be credited to your wallet balance.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWithdraw} 
              disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > (position?.amount_staked || 0)}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Withdrawing...
                </>
              ) : (
                'Confirm Unstake'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
