import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Coins, Send, AlertCircle, Wallet, Info, ArrowDownUp } from 'lucide-react'
import { SecurePinInput } from './SecurePinInput'
import { useWallet } from '@/hooks/useWallet'
import { useProfile } from '@/hooks/useProfile'
import { useCeloWallet } from '@/hooks/useCeloWallet'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface WithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
}

export const WithdrawalDialog = ({ open, onOpenChange, currentBalance }: WithdrawalDialogProps) => {
  const { initiateWithdrawal } = useWallet()
  const { profile } = useProfile()
  const { address: celoAddress, celoBalance, cUsdBalance, usdtBalance, loading: walletLoading } = useCeloWallet()

  // Crypto withdrawal state
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState<'cUSD' | 'CELO' | 'USDT'>('cUSD')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)

  const handleContinueToPIN = () => {
    if (!cryptoWalletAddress) {
      toast.error("Please enter a valid wallet address")
      return
    }

    if (!cryptoWalletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("Invalid wallet address")
      return
    }

    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      toast.error("Please enter a valid NC amount")
      return
    }

    const ncAmount = parseFloat(cryptoAmount)
    
    // Check NC balance (withdrawable balance)
    if (ncAmount > currentBalance) {
      toast.error(`Insufficient balance. You have NC ${currentBalance.toLocaleString()}`)
      return
    }

    if (ncAmount < 100) {
      toast.error("Minimum withdrawal is NC 100")
      return
    }

    setShowPinInput(true)
  }

  const handlePinVerified = async (pin: string) => {
    // Verify PIN
    if (pin !== (profile as any)?.transaction_pin) {
      toast.error('Incorrect PIN')
      return
    }

    setShowPinInput(false)
    await handleCryptoWithdraw()
  }

  const handleCryptoWithdraw = async () => {
    const ncAmount = parseFloat(cryptoAmount)
    setIsLoading(true)

    try {
      // Call the backend edge function to process withdrawal
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await supabase.functions.invoke('celo-withdrawal', {
        body: {
          walletAddress: cryptoWalletAddress,
          ncAmount: ncAmount,
          currency: cryptoCurrency
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      })

      if (response.error) throw new Error(response.error.message)

      toast.success(`Withdrawal successful! ${response.data.cryptoAmount.toFixed(4)} ${cryptoCurrency} sent`)
      setCryptoAmount("")
      setCryptoWalletAddress("")
      onOpenChange(false)
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      toast.error(error.message || "Withdrawal failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenQuidaxWidget = () => {
    onOpenChange(false)
    const event = new CustomEvent('open-quidax-widget', { detail: { mode: 'sell' } })
    window.dispatchEvent(event)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Choose your preferred withdrawal method
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="crypto" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="crypto" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Crypto</span>
            </TabsTrigger>
            <TabsTrigger value="ramp" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <ArrowDownUp className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Bank Transfer</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="crypto" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Crypto Withdrawal
                  <Badge variant="default">Instant</Badge>
                </CardTitle>
                <CardDescription>
                  Convert your NC balance to {cryptoCurrency} and send to any wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-medium mb-1">How it works:</p>
                    <p>• Your NC balance will be converted to crypto at current rates</p>
                    <p>• If you have crypto in your personal wallet, it will be used first</p>
                    <p>• Otherwise, funds will be sent from our master wallet</p>
                    <p>• Transaction is instant and final</p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Available Balance</Label>
                    <div className="text-2xl font-bold text-primary">
                      NC {currentBalance.toLocaleString()}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crypto-currency">Currency</Label>
                    <Select value={cryptoCurrency} onValueChange={(value: any) => setCryptoCurrency(value)}>
                      <SelectTrigger id="crypto-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cUSD">cUSD</SelectItem>
                        <SelectItem value="USDT">USDT (Celo)</SelectItem>
                        <SelectItem value="CELO">CELO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crypto-amount">Amount (NC)</Label>
                    <BrandInput
                      id="crypto-amount"
                      type="number"
                      placeholder="Enter amount to withdraw"
                      value={cryptoAmount}
                      onChange={(e) => setCryptoAmount(e.target.value)}
                      min="100"
                    />
                    <p className="text-xs text-muted-foreground">Minimum: NC 100</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crypto-address">Recipient Wallet Address</Label>
                    <BrandInput
                      id="crypto-address"
                      placeholder="0x..."
                      value={cryptoWalletAddress}
                      onChange={(e) => setCryptoWalletAddress(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter a valid Celo network wallet address
                    </p>
                  </div>

                  {showPinInput ? (
                    <SecurePinInput
                      onVerified={handlePinVerified}
                      onCancel={() => setShowPinInput(false)}
                      title="Confirm Withdrawal"
                      description={`Withdraw ${cryptoAmount} NC as ${cryptoCurrency}`}
                    />
                  ) : (
                    <BrandButton
                      onClick={handleContinueToPIN}
                      disabled={isLoading}
                      className="w-full"
                    >
                      Continue to PIN
                    </BrandButton>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Quidax Ramp Sell Tab */}
          <TabsContent value="ramp" className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Withdraw to your bank account securely. Minimum withdrawal: $2 USD (3,000 NC).
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ArrowDownUp className="h-5 w-5" />
                  Bank Withdrawal
                </CardTitle>
                <CardDescription>
                  Fast withdrawal to your bank account (Min: $2 / 3,000 NC)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BrandButton
                  onClick={handleOpenQuidaxWidget}
                  className="w-full"
                >
                  <Coins className="mr-2 h-4 w-4" />
                  Proceed to Withdrawal
                </BrandButton>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}