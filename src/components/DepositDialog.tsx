import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, Wallet, Copy, RefreshCw, Info } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useCeloWallet } from '@/hooks/useCeloWallet'
import { toast } from 'sonner'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DepositDialog = ({ open, onOpenChange }: DepositDialogProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { address, celoBalance, cUsdBalance, loading: walletLoading, refreshBalances, isTestnet } = useCeloWallet()

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
    navigator.clipboard.writeText(address)
    toast.success('Your wallet address copied!')
  }

  const handleRefreshBalances = async () => {
    await refreshBalances()
    toast.success('Balances updated!')
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
                  Your Celo Wallet
                  <Badge variant="default">{isTestnet ? 'Testnet' : 'Mainnet'}</Badge>
                </CardTitle>
                <CardDescription>
                  Send cUSD or CELO to this address from any exchange or wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {walletLoading ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground">Loading wallet...</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Your Wallet Address</Label>
                      <div className="flex gap-2">
                        <Input 
                          value={address}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <BrandButton onClick={copyWalletAddress} variant="outline" size="icon">
                          <Copy className="h-4 w-4" />
                        </BrandButton>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                      <div>
                        <p className="text-xs text-muted-foreground">cUSD Balance</p>
                        <p className="text-lg font-bold">{parseFloat(cUsdBalance).toFixed(4)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">CELO Balance</p>
                        <p className="text-lg font-bold">{parseFloat(celoBalance).toFixed(4)}</p>
                      </div>
                    </div>

                    <BrandButton onClick={handleRefreshBalances} className="w-full" variant="outline">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh Balances
                    </BrandButton>
                  </>
                )}
              </CardContent>
            </Card>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Send cUSD or CELO from Binance, Coinbase, or any wallet</li>
                  <li>Funds appear instantly in your wallet</li>
                  <li>Convert to NC in the app to use for services</li>
                  <li>1 cUSD ≈ ₦{(1600).toLocaleString()} NC</li>
                  {isTestnet && <li className="text-orange-500 font-bold">⚠️ Using Alfajores Testnet</li>}
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
