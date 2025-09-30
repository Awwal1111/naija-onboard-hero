import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Shield, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { useSafePay } from '@/hooks/useSafePay'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'

interface SafePayDialogProps {
  otherUserId: string
  otherUserName: string
}

const SafePayDialog: React.FC<SafePayDialogProps> = ({ otherUserId, otherUserName }) => {
  const { user } = useAuth()
  const { activeTransaction, loading, proposeSafePay, acceptSafePay, completeSafePay, releaseFunds, cancelSafePay } = useSafePay(otherUserId)
  const { balance } = useWallet()
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)

  const handlePropose = async () => {
    const amountNum = parseInt(amount)
    if (amountNum > 0) {
      await proposeSafePay(amountNum)
      setAmount('')
    }
  }

  const renderTransactionStatus = () => {
    if (!activeTransaction) {
      return (
        <div className="space-y-4">
          <div className="text-center">
            <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Create SafePay</h3>
            <p className="text-text-secondary">Secure escrow payment with {otherUserName}</p>
          </div>
          
          <div className="space-y-3">
            <BrandInput
              type="number"
              placeholder="Amount in NC"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <BrandButton 
              onClick={handlePropose}
              disabled={!amount || parseInt(amount) <= 0 || loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Propose SafePay'}
            </BrandButton>
          </div>
          
          <p className="text-sm text-text-secondary text-center">
            Your balance: NC {balance.total.toLocaleString()}
          </p>
        </div>
      )
    }

    const isBuyer = activeTransaction.buyer_id === user?.id
    const isSeller = activeTransaction.seller_id === user?.id

    switch (activeTransaction.status) {
      case 'proposed':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                {isBuyer ? 'Waiting for Acceptance' : 'SafePay Proposed'}
              </h3>
              <p className="text-text-secondary">
                Amount: {activeTransaction.amount} NC
              </p>
            </div>

            <div className="flex gap-2">
              {isSeller && (
                <BrandButton 
                  onClick={acceptSafePay}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Accepting...' : 'Accept'}
                </BrandButton>
              )}
              <BrandButton 
                variant="outline"
                onClick={cancelSafePay}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </BrandButton>
            </div>
          </div>
        )

      case 'active':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">SafePay Active</h3>
              <p className="text-text-secondary">
                {activeTransaction.amount} NC secured in escrow
              </p>
            </div>

            {isSeller && (
              <BrandButton 
                onClick={completeSafePay}
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Updating...' : 'Mark Work Complete'}
              </BrandButton>
            )}

            <BrandButton 
              variant="outline"
              onClick={cancelSafePay}
              disabled={loading}
              className="w-full"
            >
              Request Mutual Cancel
            </BrandButton>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Work Complete</h3>
              <p className="text-text-secondary">
                {isBuyer ? 'Release funds or dispute' : 'Waiting for buyer action'}
              </p>
            </div>

            {isBuyer && (
              <div className="flex gap-2">
                <BrandButton 
                  onClick={releaseFunds}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Releasing...' : 'Release Funds'}
                </BrandButton>
                <BrandButton 
                  variant="outline"
                  disabled={loading}
                  className="flex-1"
                >
                  Dispute
                </BrandButton>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <BrandButton 
          variant="outline" 
          size="sm"
          className="flex items-center gap-2"
        >
          <Shield className="h-4 w-4" />
          SafePay
        </BrandButton>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>SafePay Escrow</DialogTitle>
        </DialogHeader>
        {renderTransactionStatus()}
      </DialogContent>
    </Dialog>
  )
}

export default SafePayDialog