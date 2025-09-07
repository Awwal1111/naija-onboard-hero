import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { useWallet } from '@/hooks/useWallet'

interface DepositDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const DepositDialog = ({ open, onOpenChange }: DepositDialogProps) => {
  const { initiateDeposit } = useWallet()
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)

  const handleDeposit = async () => {
    const depositAmount = parseFloat(amount)
    if (!depositAmount || depositAmount < 100) return

    setLoading(true)
    try {
      const result = await initiateDeposit(depositAmount)
      if (result.success) {
        onOpenChange(false)
        setAmount('')
      }
    } catch (error) {
      console.error('Deposit error:', error)
    } finally {
      setLoading(false)
    }
  }

  const quickAmounts = [500, 1000, 2000, 5000, 10000]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary mb-2 block">
              Amount (NGN)
            </label>
            <BrandInput
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min="100"
            />
            <p className="text-xs text-text-secondary mt-1">
              Minimum deposit: ₦100
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-text-primary mb-2">Quick amounts</p>
            <div className="grid grid-cols-3 gap-2">
              {quickAmounts.map((quickAmount) => (
                <button
                  key={quickAmount}
                  onClick={() => setAmount(quickAmount.toString())}
                  className="py-2 px-3 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  ₦{quickAmount.toLocaleString()}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-accent/50 rounded-lg p-3">
            <h4 className="font-medium text-sm mb-1">Payment Methods</h4>
            <p className="text-xs text-text-secondary">
              • Bank Transfer • Card Payment • USSD
            </p>
          </div>

          <div className="flex gap-2">
            <BrandButton
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </BrandButton>
            <BrandButton
              onClick={handleDeposit}
              disabled={!amount || parseFloat(amount) < 100 || loading}
              className="flex-1"
            >
              {loading ? 'Processing...' : 'Continue to Payment'}
            </BrandButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}