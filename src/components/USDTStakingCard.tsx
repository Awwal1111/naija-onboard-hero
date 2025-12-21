import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownLeft, Info, Loader2, RefreshCw, PiggyBank, DollarSign } from 'lucide-react'
import { useCeloWallet } from '@/hooks/useCeloWallet'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const USDTStakingCard = () => {
  const { cUsdBalance } = useCeloWallet()
  const [position, setPosition] = useState<any>(null)
  const [apy, setApy] = useState('4.50')
  const [apyLoading, setApyLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [depositAmount, setDepositAmount] = useState('')
  const [withdrawAmount, setWithdrawAmount] = useState('')

  const fetchData = async () => {
    try {
      // Get APY
      setApyLoading(true)
      const { data: apyData } = await supabase.functions.invoke('moola-staking', {
        body: { action: 'get_apy' }
      })
      if (apyData?.apy) setApy(apyData.apy)

      // Get balance
      const session = await supabase.auth.getSession()
      if (session.data.session) {
        const { data: balanceData } = await supabase.functions.invoke('moola-staking', {
          body: { action: 'get_balance' },
          headers: { Authorization: `Bearer ${session.data.session.access_token}` }
        })
        if (balanceData?.position) setPosition(balanceData.position)
      }
    } catch (error) {
      console.error('[MOOLA] Error fetching data:', error)
    } finally {
      setApyLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount)
    if (isNaN(amount) || amount < 1) {
      toast.error('Minimum deposit is 1 cUSD')
      return
    }
    
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) throw new Error('Please log in')

      const { data, error } = await supabase.functions.invoke('moola-staking', {
        body: { action: 'deposit', amount: amount.toString() },
        headers: { Authorization: `Bearer ${session.data.session.access_token}` }
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Deposit failed')

      toast.success(`Deposited ${amount} cUSD to Moola Savings`)
      setShowDepositDialog(false)
      setDepositAmount('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Deposit failed')
    } finally {
      setLoading(false)
    }
  }

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    
    setLoading(true)
    try {
      const session = await supabase.auth.getSession()
      if (!session.data.session) throw new Error('Please log in')

      const { data, error } = await supabase.functions.invoke('moola-staking', {
        body: { action: 'withdraw', amount: amount.toString() },
        headers: { Authorization: `Bearer ${session.data.session.access_token}` }
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Withdrawal failed')

      toast.success(`Withdrew ${amount} cUSD from Moola`)
      setShowWithdrawDialog(false)
      setWithdrawAmount('')
      fetchData()
    } catch (error: any) {
      toast.error(error.message || 'Withdrawal failed')
    } finally {
      setLoading(false)
    }
  }

  const totalAvailable = (position?.amount_staked || 0) + (position?.amount_earned || 0)
  const cusdBalanceNum = parseFloat(cUsdBalance) || 0

  return (
    <>
      <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <DollarSign className="h-5 w-5 text-blue-500" />
              </div>
              cUSD Savings (Moola)
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchData}
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
              <span className="text-sm text-muted-foreground">Live APY</span>
              <Info className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            {apyLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-600 font-bold">
                {apy}%
              </Badge>
            )}
          </div>

          {/* Savings Balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Staked in Moola</span>
              <span className="text-xs text-blue-600">Earning DeFi yield</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-foreground">
                {(position?.amount_staked || 0).toFixed(4)}
              </span>
              <span className="text-sm text-muted-foreground">cUSD</span>
            </div>
            {position?.amount_earned > 0 && (
              <div className="flex items-center gap-1 text-sm text-blue-600">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>+{position.amount_earned.toFixed(4)} cUSD earned</span>
              </div>
            )}
          </div>

          {/* Available cUSD */}
          <div className="p-3 bg-background/50 rounded-lg border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Available cUSD in Wallet</p>
            <p className="font-semibold text-foreground">{cusdBalanceNum.toFixed(4)} cUSD</p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button 
              onClick={() => setShowDepositDialog(true)} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading || cusdBalanceNum < 1}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowUpRight className="h-4 w-4 mr-2" />
              )}
              Deposit
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
            Real DeFi yield from Moola Market lending. Withdraw anytime.
          </p>
        </CardContent>
      </Card>

      {/* Deposit Dialog */}
      <Dialog open={showDepositDialog} onOpenChange={setShowDepositDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              Deposit cUSD to Moola
            </DialogTitle>
            <DialogDescription>
              Earn {apy}% APY from real DeFi lending activity.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (cUSD)</label>
              <Input
                type="number"
                placeholder="Min 1 cUSD"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                min="1"
                step="0.01"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: {cusdBalanceNum.toFixed(4)} cUSD</span>
                <span>Min: 1 cUSD</span>
              </div>
            </div>

            {/* Quick Amount Buttons */}
            <div className="flex gap-2">
              {[25, 50, 75, 100].map((pct) => (
                <Button
                  key={pct}
                  variant="outline"
                  size="sm"
                  onClick={() => setDepositAmount((cusdBalanceNum * pct / 100).toFixed(4))}
                  className="flex-1 text-xs"
                  disabled={cusdBalanceNum < 1}
                >
                  {pct}%
                </Button>
              ))}
            </div>

            <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-blue-600 font-medium">Earn {apy}% APY</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Interest from Moola Market DeFi lending
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDepositDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleDeposit} 
              disabled={loading || !depositAmount || parseFloat(depositAmount) < 1 || parseFloat(depositAmount) > cusdBalanceNum}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Deposit
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
              Withdraw from Moola
            </DialogTitle>
            <DialogDescription>
              Withdraw cUSD + earned interest to your wallet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount (cUSD)</label>
              <Input
                type="number"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                step="0.01"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Available: {totalAvailable.toFixed(4)} cUSD</span>
                {position?.amount_earned > 0 && (
                  <span className="text-blue-600">
                    (includes {position.amount_earned.toFixed(4)} earnings)
                  </span>
                )}
              </div>
            </div>

            {/* Quick Amount Buttons */}
            {totalAvailable > 0 && (
              <div className="flex gap-2">
                {[25, 50, 75, 100].map((pct) => (
                  <Button
                    key={pct}
                    variant="outline"
                    size="sm"
                    onClick={() => setWithdrawAmount((totalAvailable * pct / 100).toFixed(4))}
                    className="flex-1 text-xs"
                  >
                    {pct}%
                  </Button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWithdrawDialog(false)}>Cancel</Button>
            <Button 
              onClick={handleWithdraw} 
              disabled={loading || !withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > totalAvailable}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
