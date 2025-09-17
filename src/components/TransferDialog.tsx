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
      // For now, we'll just set a placeholder recipient and verify during transfer
      // In production, you might want to create a lookup function
      setRecipient({
        name: 'User', // Will be updated during transfer
        email: email.trim(),
        userId: 'temp' // Temporary, will be resolved during transfer
      })
      setStep('confirm')
    } catch (error: any) {
      console.error('Error finding recipient:', error)
      toast({
        title: "Error",
        description: "Failed to validate recipient",
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
        description: "You don't have enough withdrawable balance",
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
        pin_hash: pin // In real app, this should be hashed client-side
      })

      if (error) throw error

      const result = data as { success: boolean; error?: string; recipient_name?: string }
      
      if (!result.success) {
        throw new Error(result.error || 'Transfer failed')
      }

      toast({
        title: "Transfer Successful",
        description: `Successfully sent NC ${transferAmount.toLocaleString()} to ${result.recipient_name}`,
      })

      refreshWallet()
      handleClose()
    } catch (error: any) {
      console.error('Transfer error:', error)
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to complete transfer",
        variant: "destructive"
      })
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
              />
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