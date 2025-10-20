import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Send, Wallet, Copy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DepositDialog = ({ open, onOpenChange }: DepositDialogProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Buy Naijacoin
          </DialogTitle>
          <DialogDescription>
            Deposit funds via Telegram bot (1 NC = ₦1)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
          <Card className="border-2 border-primary/30 hover:border-primary/50 transition-colors cursor-pointer" onClick={handleTelegramDeposit}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">Deposit via Telegram</h3>
                  <p className="text-xs text-muted-foreground">Fast & easy manual deposits</p>
                </div>
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

          {/* Instructions */}
          <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
            <p className="font-medium">How it works:</p>
            <p>1. Transfer money to the account above</p>
            <p>2. Click "Deposit via Telegram"</p>
            <p>3. Send amount and proof to the bot</p>
            <p>4. Wait for admin approval (usually within minutes)</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}