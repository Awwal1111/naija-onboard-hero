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
import { Coins, Send, AlertCircle, Wallet, Info, ArrowDownUp, Smartphone, ExternalLink, Copy, Check, ShieldAlert, Globe } from 'lucide-react'
import { SecurePinInput } from './SecurePinInput'
import { useWallet } from '@/hooks/useWallet'
import { useProfile } from '@/hooks/useProfile'
import { useUserSecrets } from '@/hooks/useUserSecrets'
import { useCeloWallet } from '@/hooks/useCeloWallet'
import { useMiniPay } from '@/hooks/useMiniPay'
import { useUserCountry } from '@/hooks/useUserCountry'
import { useVerification } from '@/hooks/useVerification'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { IvoryPayWithdrawalCard } from './IvoryPayWithdrawalCard'
import { PretiumWithdrawalCard } from './PretiumWithdrawalCard'

interface WithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
}

export const WithdrawalDialog = ({ open, onOpenChange, currentBalance }: WithdrawalDialogProps) => {
  const { initiateWithdrawal } = useWallet()
  const { profile } = useProfile()
  const { transactionPin } = useUserSecrets()
  const { address: celoAddress, celoBalance, cUsdBalance, usdtBalance, loading: walletLoading } = useCeloWallet()
  const { isMiniPay } = useMiniPay()
  const { isNigerian } = useUserCountry()
  const { requireAction, status: verificationStatus } = useVerification()

  // Block withdrawal for unverified users
  const isVerifiedForWithdrawal = verificationStatus && (verificationStatus.level === 'verified' || verificationStatus.level === 'fully_verified')

  // Crypto withdrawal state
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState<'cUSD' | 'CELO' | 'USDT'>('cUSD')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState(false)

  const handleContinueToPIN = () => {
    // Check verification before allowing withdrawal
    if (!requireAction('withdraw_funds', 'withdraw funds')) return

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
    if (pin !== transactionPin) {
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

  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(true)
    toast.success('Address copied!')
    setTimeout(() => setCopiedAddress(false), 2000)
  }

  // Calculate USD equivalent
  const usdEquivalent = currentBalance / 1600

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Balance: NC {currentBalance.toLocaleString()} (~${usdEquivalent.toFixed(2)} USD)
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="crypto" className="w-full">
          <TabsList className={`grid w-full ${isNigerian ? 'grid-cols-4' : 'grid-cols-3'} h-auto`}>
            <TabsTrigger value="crypto" className="gap-1 text-xs py-2">
              <Coins className="h-3 w-3" />
              <span>Crypto</span>
            </TabsTrigger>
            {isNigerian && (
              <TabsTrigger value="pretium" className="gap-1 text-xs py-2">
                <Globe className="h-3 w-3" />
                <span>Pretium</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="ivorypay" className="gap-1 text-xs py-2">
              <Globe className="h-3 w-3" />
              <span>IvoryPay</span>
            </TabsTrigger>
            {isNigerian ? (
              <TabsTrigger value="ramp" className="gap-1 text-xs py-2">
                <ArrowDownUp className="h-3 w-3" />
                <span>Quidax</span>
              </TabsTrigger>
            ) : (
              <TabsTrigger value="minipay-guide" className="gap-1 text-xs py-2">
                <Smartphone className="h-3 w-3" />
                <span>MiniPay</span>
              </TabsTrigger>
            )}
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
                    <p>• Funds are sent to your specified wallet address</p>
                    <p>• Transaction is instant and final</p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Available Balance</Label>
                    <div className="text-2xl font-bold text-primary">
                      NC {currentBalance.toLocaleString()}
                      <span className="text-sm font-normal text-muted-foreground ml-2">
                        (~${usdEquivalent.toFixed(2)} USD)
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="crypto-currency">Currency</Label>
                    <Select value={cryptoCurrency} onValueChange={(value: any) => setCryptoCurrency(value)}>
                      <SelectTrigger id="crypto-currency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cUSD">cUSD (Celo Dollar)</SelectItem>
                        <SelectItem value="USDT">USDT (Celo Network)</SelectItem>
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
                    <p className="text-xs text-muted-foreground">
                      Minimum: NC 100 (~$0.06 USD)
                    </p>
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

          <TabsContent value="ivorypay" className="space-y-4">
            <IvoryPayWithdrawalCard
              currentBalance={currentBalance}
              onSuccess={() => onOpenChange(false)}
            />
          </TabsContent>

          {/* Bank Transfer Tab - Nigerian users only */}
          {isNigerian && (
            <TabsContent value="ramp" className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Withdraw to your bank account securely. Minimum withdrawal: ₦3,000 (~$2 USD).
                </AlertDescription>
              </Alert>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowDownUp className="h-5 w-5" />
                    Bank Withdrawal
                  </CardTitle>
                  <CardDescription>
                    Fast withdrawal to your Nigerian bank account
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
          )}

          {/* MiniPay Guide Tab - International users only */}
          {!isNigerian && (
            <TabsContent value="minipay-guide" className="space-y-4">
              <Card className="border-green-500/30 bg-gradient-to-br from-green-500/5 to-transparent">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <Smartphone className="h-5 w-5" />
                    Withdraw via MiniPay
                    <Badge variant="secondary">Recommended</Badge>
                  </CardTitle>
                  <CardDescription>
                    Use Opera MiniPay to receive your crypto and convert to local currency
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert className="bg-green-500/10 border-green-500/30">
                    <Info className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-sm">
                      <p className="font-semibold mb-2">How to withdraw using MiniPay:</p>
                      <ol className="list-decimal list-inside space-y-2">
                        <li><strong>Open MiniPay</strong> on your phone (via Opera Mini browser)</li>
                        <li>Tap <strong>"Receive"</strong> or <strong>"Deposit"</strong></li>
                        <li>Select <strong>"Wallet"</strong> → <strong>"Manual"</strong></li>
                        <li>Copy your MiniPay wallet address</li>
                        <li>Use the <strong>Crypto tab</strong> here to withdraw to that address</li>
                        <li>Once received, use MiniPay to <strong>cash out</strong> to your local currency</li>
                      </ol>
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">Don't have MiniPay?</p>
                        <p className="text-sm text-muted-foreground">Download Opera Mini to get started</p>
                      </div>
                      <BrandButton
                        variant="outline"
                        size="sm"
                        onClick={() => window.open('https://www.opera.com/mini', '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Get MiniPay
                      </BrandButton>
                    </div>

                    <p className="text-xs text-muted-foreground text-center">
                      MiniPay supports withdrawals to mobile money, bank accounts, and more in 10+ countries
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}