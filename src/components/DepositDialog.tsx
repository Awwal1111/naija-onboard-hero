import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CreditCard, Wallet } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DepositDialog = ({ open, onOpenChange }: DepositDialogProps) => {
  const { initiateDeposit } = useWallet()
  const [loading, setLoading] = useState(false)

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

  const handleDeposit = async (amount: number) => {
    setLoading(true)
    try {
      await initiateDeposit(amount)
      onOpenChange(false)
    } catch (error) {
      console.error('Deposit error:', error)
    } finally {
      setLoading(false)
    }
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
            Select an amount to purchase Naijacoin using Paystack (1 NC = ₦1)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {depositAmounts.map(({ nc, naira }) => (
              <Card key={nc} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <Button
                    variant="ghost"
                    className="w-full h-auto p-0 flex flex-col gap-2"
                    onClick={() => handleDeposit(naira)}
                    disabled={loading}
                  >
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-4 w-4 text-primary" />
                      <span className="font-semibold text-lg">NC {nc.toLocaleString()}</span>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      ₦{naira.toLocaleString()}
                    </Badge>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center text-sm text-muted-foreground border-t pt-4">
            <p>• Payments are processed securely by Paystack</p>
            <p>• Naijacoins are added instantly after payment</p>
            <p>• All transactions are recorded in your history</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}