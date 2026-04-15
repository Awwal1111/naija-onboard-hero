import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, Wallet, Copy, Info, AlertCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { DepositMethods } from './DepositMethods'
import { MiniPayDepositCard } from './MiniPayDepositCard'
import { IvoryPayDepositCard } from './IvoryPayDepositCard'
import { useMiniPay } from '@/hooks/useMiniPay'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DepositDialog = ({ open, onOpenChange }: DepositDialogProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { isMiniPay } = useMiniPay()
  const [walletAddress, setWalletAddress] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [creatingWallet, setCreatingWallet] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<'main' | 'ramp' | 'crypto' | 'telegram' | 'minipay' | 'ivorypay'>('main')

  useEffect(() => {
    console.log('[DEPOSIT] 🎯 Effect triggered. User:', !!user, 'Profile:', !!profile)
    if (user && profile) {
      console.log('[DEPOSIT] 🚀 Loading wallet...')
      loadWalletAddress()
    } else {
      console.warn('[DEPOSIT] ⚠️ No user or profile, skipping load')
    }
  }, [user, profile])

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
    const botUsername = 'NaijaLancersBot'
    const telegramUrl = `https://t.me/${botUsername}?start=${identifier}`
    
    window.open(telegramUrl, '_blank')
    toast.success('Opening Telegram bot...')
  }

  const copyWalletAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress)
      toast.success('Wallet address copied!')
    }
  }

  const handleOpenQuidaxWidget = () => {
    onOpenChange(false)
    const event = new CustomEvent('open-quidax-widget', { detail: { mode: 'buy' } })
    window.dispatchEvent(event)
  }

  const handleMethodSelect = (method: 'ramp' | 'crypto' | 'telegram' | 'minipay' | 'ivorypay') => {
    if (method === 'ramp') {
      handleOpenQuidaxWidget()
    } else {
      setSelectedMethod(method)
    }
  }

  const handleMiniPaySuccess = () => {
    onOpenChange(false)
    setSelectedMethod('main')
  }

  const handleBack = () => {
    setSelectedMethod('main')
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) setSelectedMethod('main')
    }}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {selectedMethod !== 'main' && (
              <button onClick={handleBack} className="hover:bg-accent rounded-lg p-1">
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
            <DialogTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                {selectedMethod === 'main' ? 'Add Funds' : 
                 selectedMethod === 'crypto' ? 'Crypto Deposit' : 
                 selectedMethod === 'minipay' ? 'MiniPay Deposit' :
                 selectedMethod === 'ivorypay' ? 'IvoryPay Deposit' :
                 'Telegram Bot'}
              </DialogTitle>
              <DialogDescription>
                {selectedMethod === 'main' ? 'Choose your preferred deposit method' :
                 selectedMethod === 'crypto' ? 'Send crypto to your wallet address' :
                 selectedMethod === 'minipay' ? 'Deposit directly from MiniPay' :
                 selectedMethod === 'ivorypay' ? 'Pay via bank or crypto through IvoryPay' :
                 'Deposit via Telegram bot'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {selectedMethod === 'main' && (
          <DepositMethods onSelectMethod={handleMethodSelect} />
        )}

        {selectedMethod === 'crypto' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5 text-primary" />
                  Your Deposit Address
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
          </div>
        )}

        {selectedMethod === 'telegram' && (
          <div className="space-y-4">
            <Card className="bg-blue-500/5 border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-blue-500" />
                  Deposit via Telegram Bot
                </CardTitle>
                <CardDescription>
                  Chat with our bot to deposit funds securely
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>How it works:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1">
                      <li>Click the button below to open our Telegram bot</li>
                      <li>Follow the bot's instructions to make a deposit</li>
                      <li>Funds will be credited to your account within minutes</li>
                      <li>Get instant support from our automated assistant</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                <BrandButton 
                  onClick={handleTelegramDeposit}
                  className="w-full bg-blue-500 hover:bg-blue-600"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Open Telegram Bot
                </BrandButton>
              </CardContent>
            </Card>
          </div>
        )}

        {selectedMethod === 'minipay' && (
          <MiniPayDepositCard onSuccess={handleMiniPaySuccess} />
        )}

        {selectedMethod === 'ivorypay' && (
          <IvoryPayDepositCard onSuccess={() => {
            onOpenChange(false)
            setSelectedMethod('main')
          }} />
        )}
      </DialogContent>
    </Dialog>
  )
}
