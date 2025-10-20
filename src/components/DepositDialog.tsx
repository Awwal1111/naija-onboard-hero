import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Send, Wallet, Copy, Coins, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DepositDialog = ({ open, onOpenChange }: DepositDialogProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [savingWallet, setSavingWallet] = useState(false)
  const [celoWallet, setCeloWallet] = useState('')

  const MASTER_WALLET = "0x7ed3d953ad3ef99f101f4808d4c123052c583282"

  const depositAmounts = [
    { nc: 500, naira: 500 },
    { nc: 1000, naira: 1000 },
    { nc: 1500, naira: 1500 },
    { nc: 3000, naira: 3000 },
    { nc: 5000, naira: 5000 },
    { nc: 10000, naira: 10000 },
    { nc: 15000, naira: 15000 },
    { nc: 20000, naira: 20000 },
    { nc: 50000, naira: 50000 },
    { nc: 100000, naira: 100000 }
  ]

  const handleTelegramDeposit = () => {
    if (!user || !profile) {
      toast.error('Please log in first')
      return
    }

    // Use referral code as primary identifier (more reliable than email)
    // Format: use referral code if available, otherwise email
    const identifier = profile.referral_code || user.email || ''
    
    if (!identifier) {
      toast.error('No identifier found. Please contact support.')
      return
    }

    // Don't use encodeURIComponent - Telegram handles this
    const telegramLink = `https://t.me/NaijaLancersBot?start=${identifier}`
    
    console.log('Opening Telegram with link:', telegramLink)
    
    // Open Telegram
    window.open(telegramLink, '_blank')
    
    toast.success('Opening Telegram bot...', {
      description: 'Your link: ' + identifier
    })
    
    onOpenChange(false)
  }

  const copyBankDetails = () => {
    const details = `Bank: Opay\nAccount Number: 8129002732\nAccount Name: Awwal Dayyabu`
    navigator.clipboard.writeText(details)
    toast.success('Bank details copied!')
  }

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(MASTER_WALLET)
    toast.success('Wallet address copied!')
  }

  const saveCeloWallet = async () => {
    if (!user || !celoWallet) return

    // Basic validation
    if (!celoWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error('Invalid Celo wallet address')
      return
    }

    setSavingWallet(true)
    try {
      const normalizedAddress = celoWallet.toLowerCase()
      console.log('Saving wallet address:', normalizedAddress)
      
      const { error } = await supabase
        .from('profiles')
        .update({ celo_wallet_address: normalizedAddress })
        .eq('user_id', user.id)

      if (error) throw error

      toast.success('✅ Wallet saved! Now send crypto to the deposit address above.')
      console.log('Wallet saved successfully for user:', user.id)
    } catch (error) {
      console.error('Error saving wallet:', error)
      toast.error('Failed to save wallet address')
    } finally {
      setSavingWallet(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Buy Naijacoin
          </DialogTitle>
          <DialogDescription>
            Choose your preferred deposit method (1 NC = ₦1)
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="auto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto" className="gap-2">
              <Coins className="h-4 w-4" />
              Automatic (Recommended)
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Send className="h-4 w-4 mr-2" />
              Manual (Not Recommended)
            </TabsTrigger>
          </TabsList>

          {/* Automatic Deposit (Celo) */}
          <TabsContent value="auto" className="space-y-4">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Coins className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">Deposit with Celo (cUSD/CELO)</h3>
                    <p className="text-sm text-muted-foreground">
                      Send cUSD or CELO from MiniPay or any Celo wallet to receive Naijacoin instantly!
                    </p>
                  </div>
                </div>

                {/* Master Wallet Address */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Deposit Address:</label>
                    <Button size="sm" variant="ghost" onClick={copyWalletAddress}>
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-xs font-mono break-all">{MASTER_WALLET}</p>
                  </div>
                </div>

                {/* Save User Wallet */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">🔗 Your Sending Wallet Address</label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Which Celo wallet will you send from?
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="0x..."
                      value={celoWallet}
                      onChange={(e) => setCeloWallet(e.target.value)}
                      className="flex-1 px-3 py-2 bg-background border rounded-lg text-sm"
                    />
                    <Button 
                      onClick={saveCeloWallet} 
                      disabled={savingWallet || !celoWallet}
                      size="sm"
                    >
                      Save
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    (So we know it's you when you deposit)
                  </p>
                </div>

                {/* Alert */}
                <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-medium">💡 MiniPay Recommended</p>
                    <p className="text-muted-foreground">
                      For the best experience, use <strong>MiniPay</strong> wallet. Deposits are automatic and instant!
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="space-y-2 text-xs border-t pt-3">
                  <p className="font-medium">How it works:</p>
                  <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                    <li>Save your Celo wallet address above</li>
                    <li>Send cUSD or CELO to the deposit address</li>
                    <li>Your NC balance updates automatically (within 1-2 minutes)</li>
                    <li>Start earning immediately!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Suggested Amounts */}
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground text-center">Suggested amounts:</p>
              <div className="grid grid-cols-5 gap-2">
                {depositAmounts.slice(0, 5).map(({ nc }) => (
                  <Badge key={nc} variant="secondary" className="justify-center py-2 text-xs">
                    {nc.toLocaleString()}
                  </Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Manual Deposit (Telegram) */}
          <TabsContent value="manual" className="space-y-4">
            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Manual Bank Transfer (Slower)</p>
                    <p className="text-muted-foreground">
                      Requires admin approval. May take 5-30 minutes.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bank Details Card */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm">Bank Details</h3>
                  <Button size="sm" variant="ghost" onClick={copyBankDetails}>
                    <Copy className="h-4 w-4 mr-1" />
                    Copy
                  </Button>
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

            {/* Telegram Deposit Button */}
            <Button 
              onClick={handleTelegramDeposit} 
              className="w-full gap-2"
              size="lg"
            >
              <Send className="h-5 w-5" />
              Continue with Telegram
            </Button>

            {/* Instructions */}
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