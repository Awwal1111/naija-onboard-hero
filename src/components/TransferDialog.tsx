import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircle, Send, User, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'

interface TransferDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface RecipientInfo {
  name: string
  email: string
  userId: string
}

export const TransferDialog = ({ open, onOpenChange }: TransferDialogProps) => {
  const { user } = useAuth()
  const { balance, refreshWallet } = useWallet()
  const { toast } = useToast()
  
  const [step, setStep] = useState<'email' | 'confirm' | 'pin'>('email')
  const [email, setEmail] = useState('')
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null)
  const [loading, setLoading] = useState(false)

  const resetDialog = () => {
    setStep('email')
    setEmail('')
    setAmount('')
    setPin('')
    setRecipient(null)
  }

  const handleClose = () => {
    resetDialog()
    onOpenChange(false)
  }

  const findRecipient = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter the recipient's email address",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Call an RPC function to look up the user by email
      const { data, error } = await supabase.rpc('lookup_user_by_email', {
        lookup_email: email.trim().toLowerCase()
      })

      if (error) throw error

      const result = data as any

      if (!result || !result.found) {
        toast({
          title: "User Not Found",
          description: "No user found with this email address",
          variant: "destructive"
        })
        return
      }

      if (result.user_id === user?.id) {
        toast({
          title: "Invalid Recipient",
          description: "You cannot send money to yourself",
          variant: "destructive"
        })
        return
      }

      setRecipient({
        name: result.full_name || result.email || 'NaijaLancers User',
        email: result.email || email.trim(),
        userId: result.user_id
      })
      setStep('confirm')
    } catch (error: any) {
      console.error('Error finding recipient:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to find recipient. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!amount || !pin || !recipient) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    const transferAmount = parseFloat(amount)
    if (transferAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Transfer amount must be greater than 0",
        variant: "destructive"
      })
      return
    }

    if (transferAmount > balance.withdrawable) {
      toast({
        title: "Insufficient Balance",
        description: `You don't have enough withdrawable balance. Available: NC ${balance.withdrawable.toLocaleString()}`,
        variant: "destructive"
      })
      return
    }

    if (pin.length !== 4) {
      toast({
        title: "Invalid PIN",
        description: "PIN must be 4 digits",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Call the transfer function
      const { data, error } = await supabase.rpc('transfer_funds', {
        sender_id: user?.id,
        recipient_email: email.trim(),
        amount: transferAmount,
        pin_hash: pin
      })

      if (error) throw error

      const result = data as any
      
      if (!result || !result.success) {
        throw new Error(result?.error || 'Transfer failed')
      }

      toast({
        title: "Transfer Successful! 🎉",
        description: `Successfully sent NC ${transferAmount.toLocaleString()} to ${result.recipient_name}`,
      })

      refreshWallet()
      handleClose()
    } catch (error: any) {
      console.error('Transfer error:', error)
      
      // Check if error is about PIN setup
      if (error.message?.includes('set up your transaction PIN')) {
        toast({
          title: "PIN Not Set",
          description: "Please set up your transaction PIN in Settings before making transfers",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Transfer Failed",
          description: error.message || "Failed to complete transfer",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const renderStep = () => {
    switch (step) {
      case 'email':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Recipient Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter recipient's email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && findRecipient()}
              />
            </div>
            <Button 
              onClick={findRecipient} 
              disabled={loading || !email.trim()}
              className="w-full"
            >
              {loading ? 'Searching...' : 'Find Recipient'}
            </Button>
          </div>
        )

      case 'confirm':
        return (
          <div className="space-y-4">
            <Card className="bg-accent/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-full">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{recipient?.name}</p>
                    <p className="text-sm text-muted-foreground">{recipient?.email}</p>
                  </div>
                  <Check className="h-4 w-4 text-green-500 ml-auto" />
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <Label htmlFor="amount">Transfer Amount (NC)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                max={balance.withdrawable}
              />
              <p className="text-sm text-muted-foreground">
                Available: NC {balance.withdrawable.toLocaleString()}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('email')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep('pin')} 
                disabled={!amount || parseFloat(amount) <= 0}
                className="flex-1"
              >
                Continue
              </Button>
            </div>
          </div>
        )

      case 'pin':
        return (
          <div className="space-y-4">
            <div className="p-4 bg-accent/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span>Confirm transfer of <strong>NC {amount}</strong> to <strong>{recipient?.name}</strong></span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pin">Transaction PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Enter 4-digit PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                maxLength={4}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Don't have a PIN? Set it up in{' '}
                <a href="/settings/pin" className="text-primary underline">Settings</a>
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('confirm')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleTransfer} 
                disabled={loading || pin.length !== 4}
                className="flex-1"
              >
                {loading ? 'Processing...' : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Transfer
                  </>
                )}
              </Button>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Naijacoin</DialogTitle>
          <DialogDescription>
            Transfer NC to another NaijaLancers user instantly
          </DialogDescription>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  )
}