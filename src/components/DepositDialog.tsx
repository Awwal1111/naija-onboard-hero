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

  useEffect(() => {
    if (user && profile) {
      loadWalletAddress()
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
              Manual/Bank Transfer
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
                      <p className="font-medium">No Wallet Found</p>
                      <p className="text-sm text-muted-foreground">Contact support to create your wallet</p>
                    </div>
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
            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Manual Bank Transfer (Slower)</p>
                    <p className="text-muted-foreground">
                      Requires admin approval. May take 5-30 minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Bank Details</h3>
                  <BrandButton size="sm" variant="ghost" onClick={copyBankDetails}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </BrandButton>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-medium">Opay</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="font-medium font-mono">8129002732</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Account Name:</span>
                    <span className="font-medium">Awwal Dayyabu</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <BrandButton 
              onClick={handleTelegramDeposit} 
              className="w-full gap-2"
              size="lg"
            >
              <Send className="h-5 w-5" />
              Continue with Telegram
            </BrandButton>

            <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
              <p className="font-medium">How it works:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Transfer money to the bank account above</li>
                <li>Click "Continue with Telegram"</li>
                <li>Send amount and proof screenshot to the bot</li>
                <li>Wait for admin approval (5-30 minutes)</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
