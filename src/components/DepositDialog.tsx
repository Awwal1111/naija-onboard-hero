import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, Wallet, Copy, Info, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DepositDialog = ({ open, onOpenChange }: DepositDialogProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [creatingWallet, setCreatingWallet] = useState(false)
  
  // Quidax On-Ramp state
  const [fiatAmount, setFiatAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [quote, setQuote] = useState<any>(null)
  const [isLoadingQuote, setIsLoadingQuote] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    console.log('[DEPOSIT] 🎯 Effect triggered. User:', !!user, 'Profile:', !!profile)
    if (user && profile) {
      console.log('[DEPOSIT] 🚀 Loading wallet and payment methods...')
      loadWalletAddress()
      loadPaymentMethods()
    } else {
      console.warn('[DEPOSIT] ⚠️ No user or profile, skipping load')
    }
  }, [user, profile])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (fiatAmount && parseFloat(fiatAmount) >= 2000) {
        fetchQuote()
      } else {
        setQuote(null)
      }
    }, 500) // Debounce to avoid too many API calls
    
    return () => clearTimeout(timer)
  }, [fiatAmount])

  const loadWalletAddress = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      
      // Fetch the user's wallet address from their profile
      const { data, error } = await supabase
        .from('profiles')
        .select('celo_wallet_address')
        .eq('user_id', user.id)
        .single()
      
      if (error) throw error
      
      if (data?.celo_wallet_address) {
        setWalletAddress(data.celo_wallet_address)
      } else {
        // No wallet yet, create one
        await createWallet()
      }
    } catch (error: any) {
      console.error('Error loading wallet:', error)
      toast.error('Failed to load wallet address')
    } finally {
      setLoading(false)
    }
  }

  const createWallet = async () => {
    if (!user) return
    
    setCreatingWallet(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-user-wallet')
      
      if (error) throw error
      
      if (data?.success && data?.address) {
        setWalletAddress(data.address)
        toast.success('Your wallet has been created!')
      } else {
        throw new Error('Failed to create wallet')
      }
    } catch (error: any) {
      console.error('Error creating wallet:', error)
      toast.error('Failed to create wallet. Please contact support.')
    } finally {
      setCreatingWallet(false)
    }
  }

  const handleTelegramDeposit = () => {
    if (!user || !profile) {
      toast.error('Please log in first')
      return
    }

    const identifier = profile.referral_code || user.email || ''
    
    if (!identifier) {
      toast.error('No identifier found. Please contact support.')
      return
    }

    const telegramLink = `https://t.me/NaijaLancersBot?start=${identifier}`
    window.open(telegramLink, '_blank')
    toast.success('Opening Telegram bot...')
    onOpenChange(false)
  }

  const copyBankDetails = () => {
    const details = `Bank: Opay\nAccount Number: 8129002732\nAccount Name: Awwal Dayyabu`
    navigator.clipboard.writeText(details)
    toast.success('Bank details copied!')
  }

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success('Wallet address copied!')
    }
  }

  const loadPaymentMethods = async () => {
    try {
      console.log('[DEPOSIT] 🔄 Loading payment methods...')
      console.log('[DEPOSIT] User ID:', user?.id)
      
      const { data, error } = await supabase.functions.invoke('quidax-on-ramp', {
        body: { action: 'get_payment_methods' }
      })
      
      console.log('[DEPOSIT] ✅ Raw response:', JSON.stringify(data, null, 2))
      console.log('[DEPOSIT] ❌ Error:', error)
      
      if (error) {
        console.error('[DEPOSIT] Failed to load payment methods:', error)
        toast.error(`Failed to load payment methods: ${error.message}`)
        return
      }
      
      // Handle Quidax API response format
      const methods = data?.data || []
      console.log('[DEPOSIT] 📋 Extracted methods:', methods)
      console.log('[DEPOSIT] 📊 Methods count:', methods.length)
      console.log('[DEPOSIT] 🔍 Methods type:', typeof methods, Array.isArray(methods))
      
      if (Array.isArray(methods) && methods.length > 0) {
        console.log('[DEPOSIT] ✅ Setting payment methods:', methods)
        setPaymentMethods(methods)
        setPaymentMethod(methods[0].code)
        console.log('[DEPOSIT] ✅ Payment method set to:', methods[0].code)
        toast.success(`${methods.length} payment method(s) loaded`)
      } else {
        console.warn('[DEPOSIT] ⚠️ No payment methods in response')
        console.warn('[DEPOSIT] data?.data:', data?.data)
        console.warn('[DEPOSIT] data?.status:', data?.status)
        toast.error('No payment methods available from Quidax')
      }
    } catch (error: any) {
      console.error('[DEPOSIT] 💥 Exception:', error)
      toast.error(`Error: ${error.message}`)
    }
  }

  const fetchQuote = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) < 2000) return
    
    setIsLoadingQuote(true)
    try {
      const { data, error } = await supabase.functions.invoke('quidax-on-ramp', {
        body: { 
          action: 'get_quote',
          fiatAmount: parseFloat(fiatAmount)
        }
      })
      
      if (error) throw error
      if (data?.data) {
        setQuote(data.data)
      }
    } catch (error: any) {
      console.error('Error fetching quote:', error)
      toast.error('Failed to get quote')
    } finally {
      setIsLoadingQuote(false)
    }
  }

  const handleBankDeposit = async () => {
    if (!fiatAmount || parseFloat(fiatAmount) < 2000) {
      toast.error('Minimum deposit is ₦2,000')
      return
    }

    if (!walletAddress) {
      toast.error('Please wait for your wallet to be generated before proceeding.')
      return
    }

    if (!paymentMethod) {
      toast.error('Please select a payment method')
      return
    }

    setIsProcessing(true)
    try {
      console.log('[DEPOSIT] Initiating Quidax purchase...', {
        fiatAmount: parseFloat(fiatAmount),
        paymentMethod,
        walletAddress
      })

      const { data, error } = await supabase.functions.invoke('quidax-on-ramp', {
        body: {
          action: 'initiate_purchase',
          fiatAmount: parseFloat(fiatAmount),
          paymentMethod,
          walletAddress
        }
      })

      console.log('[DEPOSIT] Quidax response:', data)

      if (error) {
        console.error('[DEPOSIT] Quidax error:', error)
        throw error
      }

      if (data?.data?.payment_url) {
        toast.success('Redirecting to payment page...')
        window.open(data.data.payment_url, '_blank')
        onOpenChange(false)
      } else if (data?.data?.reference || data?.reference) {
        const reference = data?.data?.reference || data?.reference
        toast.success(`Deposit initiated! Reference: ${reference}. You will be notified when USDT arrives.`)
        onOpenChange(false)
      } else {
        console.warn('[DEPOSIT] Unexpected response format:', data)
        toast.error('Unexpected response from payment provider. Please contact support.')
      }
    } catch (error: any) {
      console.error('Bank deposit error:', error)
      toast.error(error.message || 'Failed to initiate deposit')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Deposit Funds
          </DialogTitle>
          <DialogDescription>
            Send crypto to your wallet or use bank transfer
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposit">
              Deposit
            </TabsTrigger>
            <TabsTrigger value="manual">
              Buy with Bank
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Your Permanent Celo Wallet
                  <Badge variant="default">Mainnet</Badge>
                </CardTitle>
                <CardDescription>
                  This is your permanent wallet address. Send cUSD, CELO, or USDT here from any exchange or wallet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading || creatingWallet ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      {creatingWallet ? 'Creating your wallet...' : 'Loading wallet...'}
                    </p>
                  </div>
                ) : walletAddress ? (
                  <>
                    <div className="space-y-2">
                      <Label>Your Wallet Address (Celo Mainnet)</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={walletAddress}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <BrandButton onClick={copyWalletAddress} variant="outline" size="icon">
                          <Copy className="h-4 w-4" />
                        </BrandButton>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This address is unique to you. You can share it to receive deposits.
                      </p>
                    </div>

                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-sm">
                        <strong>Important:</strong> Deposits are automatically converted to NC and moved to our secure system. 
                        The conversion rate is approximately 1 cUSD = ₦1,600 NC.
                      </AlertDescription>
                    </Alert>
                  </>
                ) : (
                  <div className="text-center py-8 space-y-4">
                    <AlertCircle className="h-12 w-12 mx-auto text-orange-500" />
                    <div>
                      <p className="font-medium">Wallet Generation in Progress</p>
                      <p className="text-sm text-muted-foreground">Your wallet is being created. Please refresh this page in a moment.</p>
                    </div>
                    <BrandButton onClick={loadWalletAddress}>
                      Refresh Wallet Status
                    </BrandButton>
                  </div>
                )}
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Send cUSD, CELO, or USDT from Binance, Coinbase, or any wallet</li>
                  <li>Deposits are detected automatically within minutes</li>
                  <li>Funds are converted to NC and credited to your balance</li>
                  <li>1 cUSD ≈ ₦{(1600).toLocaleString()} NC</li>
                  <li>Your unique address works across all Celo-compatible wallets</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-500" />
                  Buy NC with Bank Transfer
                  <Badge variant="default" className="bg-green-500">Instant</Badge>
                </CardTitle>
                <CardDescription>
                  Pay with your bank account and receive USDT automatically
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!walletAddress && (
                  <Alert className="bg-orange-500/10 border-orange-500/20">
                    <AlertCircle className="h-4 w-4 text-orange-500" />
                    <AlertDescription className="text-xs">
                      <p className="font-medium">Wallet Required</p>
                      <p>Please go to the <strong>Deposit</strong> tab and wait for your wallet to be generated before proceeding with bank payments.</p>
                    </AlertDescription>
                  </Alert>
                )}

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-medium mb-1">How it works:</p>
                    <p>• Enter amount in Naira you want to deposit</p>
                    <p>• Pay securely with your bank account or card</p>
                    <p>• USDT (Celo Network) is sent directly to your wallet</p>
                    <p>• Automatically converted to NC within minutes</p>
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <Label htmlFor="fiat-amount">Amount (₦)</Label>
                  <Input
                    id="fiat-amount"
                    type="number"
                    placeholder="Enter amount in Naira"
                    min="2000"
                    step="100"
                    value={fiatAmount}
                    onChange={(e) => setFiatAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Minimum: ₦2,000 | Maximum: ₦2,000,000 | Powered by Quidax
                  </p>
                </div>

                {paymentMethods.length > 0 ? (
                  <div className="space-y-2">
                    <Label htmlFor="payment-method">Payment Method</Label>
                    <select
                      id="payment-method"
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {paymentMethods.map((method, index) => {
                        console.log('[DEPOSIT] 🎨 Rendering method:', method)
                        return (
                          <option key={method.code || index} value={method.code}>
                            {method.title}
                          </option>
                        )
                      })}
                    </select>
                  </div>
                ) : (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      <p className="font-medium">Loading payment methods...</p>
                      <p>If this persists, please check the console logs.</p>
                    </AlertDescription>
                  </Alert>
                )}

{isLoadingQuote && fiatAmount && parseFloat(fiatAmount) >= 2000 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs text-muted-foreground">Fetching quote...</p>
                  </div>
                )}

                {quote && !isLoadingQuote && (
                  <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg space-y-1">
                    <p className="text-xs text-muted-foreground">You will receive approximately:</p>
                    <p className="text-lg font-bold text-primary">{quote.token_amount} USDT</p>
                    <p className="text-xs text-muted-foreground">
                      Rate: ₦{quote.rate} per USDT • Network: Celo
                    </p>
                  </div>
                )}

                <BrandButton 
                  className="w-full gap-2"
                  size="lg"
                  onClick={handleBankDeposit}
                  disabled={isProcessing || !fiatAmount || parseFloat(fiatAmount) < 2000 || !walletAddress}
                >
                  <Send className="h-5 w-5" />
                  {isProcessing ? 'Processing...' : 'Continue with Bank Payment'}
                </BrandButton>

                <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                  <p className="font-medium">Benefits:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>No manual approval needed</li>
                    <li>Instant conversion to crypto</li>
                    <li>Secure payment processing</li>
                    <li>Multiple payment methods supported</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
