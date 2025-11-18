import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowUpDown, AlertCircle, Wallet, Info, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'
import { useCeloWallet } from '@/hooks/useCeloWallet'

interface QuidaxRampWidgetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'buy' | 'sell'
}

export const QuidaxRampWidget = ({ open, onOpenChange, mode }: QuidaxRampWidgetProps) => {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const { address: celoAddress, usdtBalance } = useCeloWallet()

  const handleCopyWalletAddress = () => {
    if (!celoAddress) {
      toast.error('Wallet not initialized')
      return
    }
    navigator.clipboard.writeText(celoAddress)
    toast.success('Wallet address copied!', {
      description: 'Send USDT (Celo network) to this address. You\'ll get ₦1,600 NC per 1 USDT automatically.'
    })
  }

  const handleWithdrawToBank = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid NC amount to withdraw')
      return
    }

    const ncAmount = parseFloat(amount)

    if (ncAmount < 1600) {
      toast.error('Minimum withdrawal is ₦1,600 NC (1 USDT)')
      return
    }

    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please login to continue')
        return
      }

      // Calculate USDT amount (1 USDT = 1600 NC)
      const usdtAmount = (ncAmount / 1600).toFixed(2)

      // Call the withdrawal edge function
      const { data, error } = await supabase.functions.invoke('quidax-bank-withdrawal', {
        body: {
          ncAmount,
          usdtAmount: parseFloat(usdtAmount)
        }
      })

      if (error) throw error

      toast.success(`Withdrawal initiated! ${usdtAmount} USDT will be converted to NGN and sent to your bank`)
      onOpenChange(false)
    } catch (error: any) {
      console.error('[QUIDAX] Withdrawal error:', error)
      toast.error(error.message || 'Withdrawal failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpDown className="h-5 w-5" />
            {mode === 'buy' ? 'Buy NC with USDT' : 'Withdraw NC to Bank'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'buy' 
              ? 'Send USDT to your wallet address to get NC instantly'
              : 'Convert your NC to Naira via USDT and receive in your bank account'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === 'buy' ? (
            <>
              <Alert>
                <Wallet className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-semibold">Your USDT Deposit Address (Celo Network):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-2 bg-muted rounded text-xs break-all">
                      {celoAddress || 'Loading...'}
                    </code>
                    <BrandButton
                      size="sm"
                      variant="outline"
                      onClick={handleCopyWalletAddress}
                      disabled={!celoAddress}
                    >
                      <Copy className="h-3 w-3" />
                    </BrandButton>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Send USDT on the <strong>Celo network</strong> to this address. 
                    Your NC balance will update automatically when the transaction confirms.
                  </p>
                </AlertDescription>
              </Alert>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-1">
                  <div><strong>Current Balance:</strong> {parseFloat(usdtBalance || '0').toFixed(4)} USDT</div>
                  <div><strong>Exchange Rate:</strong> 1 USDT = ₦1,600 NC</div>
                  <div><strong>Example:</strong> Send 5 USDT → Receive ₦8,000 NC</div>
                </AlertDescription>
              </Alert>

              <div className="bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-1">⚠️ Important:</p>
                <ul className="text-xs text-yellow-700 dark:text-yellow-300 space-y-1 list-disc list-inside">
                  <li>Only send USDT on the <strong>Celo network</strong></li>
                  <li>Sending on other networks (ETH, BSC, TRC20) will result in loss of funds</li>
                  <li>Credits appear automatically within 2-5 minutes</li>
                </ul>
              </div>

              <BrandButton
                onClick={handleCopyWalletAddress}
                disabled={!celoAddress}
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Wallet Address
              </BrandButton>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount in NC to Withdraw</Label>
                <BrandInput
                  id="amount"
                  type="number"
                  placeholder="Enter NC amount (minimum ₦1,600)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">
                  Minimum withdrawal: ₦1,600 NC (1 USDT)
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs space-y-1">
                  <div><strong>Withdrawal Process:</strong></div>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>Your NC is converted to USDT (₦1,600 NC = 1 USDT)</li>
                    <li>USDT is sent to Quidax exchange</li>
                    <li>Quidax converts USDT to NGN</li>
                    <li>NGN is sent to your bank account</li>
                  </ol>
                  <div className="mt-2 pt-2 border-t border-border">
                    <strong>Example:</strong> ₦16,000 NC → 10 USDT → ~₦15,500 NGN in bank
                  </div>
                </AlertDescription>
              </Alert>

              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Make sure your bank details are updated in Settings. 
                  Withdrawals typically take 10-30 minutes to complete.
                </AlertDescription>
              </Alert>

              <BrandButton
                onClick={handleWithdrawToBank}
                disabled={loading || !amount}
                className="w-full"
              >
                {loading ? 'Processing Withdrawal...' : 'Withdraw to Bank Account'}
              </BrandButton>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
