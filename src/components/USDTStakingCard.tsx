import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Info, Loader2, RefreshCw, PiggyBank } from 'lucide-react'
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

  // Total available in savings (staked + earned)
  const totalAvailable = (position?.amount_staked || 0) + (position?.amount_earned || 0)

  return (
    <>
      <Card className="border-border/50 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <PiggyBank className="h-5 w-5 text-emerald-500" />
              </div>
              NC Savings
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

          {/* Savings Balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Your Savings Balance</span>
              <span className="text-xs text-emerald-600">Earning interest</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {(position?.amount_staked || 0).toLocaleString()}
              </span>
              <span className="text-sm text-muted-foreground">NC</span>
            </div>
            {position?.amount_earned && position.amount_earned > 0 && (
              <div className="flex items-center gap-1 text-sm text-emerald-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+{position.amount_earned.toFixed(2)} NC earned</span>
              </div>
            )}
          </div>

          {/* Stats Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Total Deposited</p>
              <p className="font-semibold text-foreground">
                {(position?.total_deposited || 0).toLocaleString()} NC
              </p>
            </div>
            <div className="p-3 bg-background/50 rounded-lg border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">Total Withdrawn</p>
              <p className="font-semibold text-foreground">
                {(position?.total_withdrawn || 0).toLocaleString()} NC
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
              Save
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowWithdrawDialog(true)}
              disabled={loading || totalAvailable <= 0}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowDownLeft className="h-4 w-4 mr-2" />
              )}
              Withdraw
            </Button>
          </div>

          {/* Info */}
          <p className="text-xs text-center text-muted-foreground pt-2">
            Earn daily interest on your savings. Withdraw anytime.
          </p>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-emerald-500" />
              Save NC
            </DialogTitle>
            <DialogDescription>
              Deposit NC to earn {apy}% APY. Interest is calculated daily and added automatically.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (NC)</label>
              <Input
                type="number"
                placeholder="Min 100 NC"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="100"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: {balance.withdrawable.toLocaleString()} NC</span>
                <span>Min: 100 NC</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {[500, 1000, 5000, 10000].map((amount) => (
                <Button
                  key={amount}
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmount(amount.toString())}
                  className="flex-1 text-xs"
                  disabled={balance.withdrawable < amount}
                >
                  {amount.toLocaleString()}
                </Button>
              ))}
            </div>

            <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Earn {apy}% APY</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Interest is calculated daily and compounded automatically
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeposit} 
              disabled={loading || !depositAmount || parseFloat(depositAmount) < 100 || parseFloat(depositAmount) > balance.withdrawable}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Confirm Save'
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
              Withdraw Savings
            </DialogTitle>
            <DialogDescription>
              Withdraw NC from your savings. Funds are credited instantly to your wallet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (NC)</label>
              <Input
                type="number"
                placeholder="Enter NC amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: {totalAvailable.toLocaleString()} NC</span>
                {position?.amount_earned && position.amount_earned > 0 && (
                  <span className="text-emerald-600">
                    (includes {position.amount_earned.toFixed(2)} NC earnings)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Amount Buttons */}
            {totalAvailable > 0 && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount(Math.floor(totalAvailable * 0.25).toString())}
                  className="flex-1 text-xs"
                >
                  25%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount(Math.floor(totalAvailable * 0.5).toString())}
                  className="flex-1 text-xs"
                >
                  50%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount(Math.floor(totalAvailable * 0.75).toString())}
                  className="flex-1 text-xs"
                >
                  75%
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawAmount(Math.floor(totalAvailable).toString())}
                  className="flex-1 text-xs"
                >
                  Max
                </Button>
              </div>
            )}

            <div className="p-3 bg-muted/50 rounded-lg border border-border">
              <p className="text-xs text-muted-foreground">
                Your NC will be instantly credited to your wallet balance. No fees or waiting period.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWithdraw} 
              disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > totalAvailable}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Withdrawing...
                </>
              ) : (
                'Confirm Withdraw'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
