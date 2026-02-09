import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { SecurePinInput } from './SecurePinInput'
import { useSafePay } from '@/hooks/useSafePay'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useUserSecrets } from '@/hooks/useUserSecrets'
import { useWallet } from '@/hooks/useWallet'
import { toast } from 'sonner'

interface SafePayDialogProps {
  otherUserId: string
  otherUserName: string
}

const SafePayDialog: React.FC<SafePayDialogProps> = ({ otherUserId, otherUserName }) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { transactionPin } = useUserSecrets()
  const { 
    activeTransaction, 
    loading, 
    proposeSafePay, 
    acceptSafePay, 
    completeSafePay, 
    releaseFunds, 
    cancelSafePay
  } = useSafePay(otherUserId)
  const { balance } = useWallet()
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)
  const [showPinInput, setShowPinInput] = useState(false)
  const [pendingAction, setPendingAction] = useState<'propose' | 'accept' | 'release' | null>(null)

  const handlePropose = () => {
    const amountNum = parseInt(amount)
    if (amountNum > 0 && amountNum <= balance.withdrawable) {
      setPendingAction('propose')
      setShowPinInput(true)
    }
  }

  const handleAccept = () => {
    setPendingAction('accept')
    setShowPinInput(true)
  }

  const handleRelease = () => {
    setPendingAction('release')
    setShowPinInput(true)
  }

  const handlePinVerified = async (pin: string) => {
    // Verify PIN
    if (pin !== transactionPin) {
      toast.error('Incorrect PIN')
      return
    }

    setShowPinInput(false)

    // Execute pending action
    if (pendingAction === 'propose') {
      await proposeSafePay(parseInt(amount))
      setAmount('')
    } else if (pendingAction === 'accept') {
      await acceptSafePay()
    } else if (pendingAction === 'release') {
      await releaseFunds()
    }

    setPendingAction(null)
  }

  const renderTransactionStatus = () => {
    if (showPinInput) {
      return (
        <SecurePinInput
          onVerified={handlePinVerified}
          onCancel={() => {
            setShowPinInput(false)
            setPendingAction(null)
          }}
          title="Confirm SafePay Action"
          description={
            pendingAction === 'propose' ? `Lock ${amount} NC in escrow` :
            pendingAction === 'accept' ? 'Accept SafePay proposal' :
            pendingAction === 'release' ? 'Release funds to seller' :
            'Confirm action'
          }
        />
      )
    }

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
              disabled={!amount || parseInt(amount) <= 0 || parseInt(amount) > balance.withdrawable || loading}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Send Offer'}
            </BrandButton>
          </div>
          
          <div className="text-sm text-center space-y-1">
            <p className="text-text-secondary">
              Total Balance: NC {balance.total.toLocaleString()}
            </p>
            <p className="text-green-600 font-medium">
              Withdrawable: NC {balance.withdrawable.toLocaleString()}
            </p>
            <p className="text-xs text-amber-600">
              Only withdrawable balance can be used for SafePay
            </p>
          </div>
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
              {isBuyer && (
                <>
                  <p className="text-sm text-muted-foreground mt-2">
                    You proposed a SafePay of {activeTransaction.amount} NC
                  </p>
                  <p className="text-sm text-green-600 font-medium mt-1">
                    ✅ Funds locked in escrow - not visible in your balance
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Waiting for @{otherUserName} to accept...
                  </p>
                </>
              )}
              {isSeller && (
                <p className="text-sm text-muted-foreground mt-2">
                  @{otherUserName} proposed a SafePay of {activeTransaction.amount} NC. Funds are secured in escrow.
                </p>
              )}
            </div>

            <div className="flex gap-2">
              {isSeller && (
                <BrandButton 
                  onClick={handleAccept}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Accepting...' : 'Accept'}
                </BrandButton>
              )}
              {isBuyer && (
                <BrandButton 
                  variant="outline"
                  onClick={cancelSafePay}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel Offer
                </BrandButton>
              )}
              {isSeller && (
                <BrandButton 
                  variant="outline"
                  onClick={cancelSafePay}
                  disabled={loading}
                  className="flex-1"
                >
                  Decline
                </BrandButton>
              )}
            </div>
          </div>
        )

      case 'active':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Work in Progress</h3>
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
                Mark as Done
              </BrandButton>
            )}

            {isBuyer && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for seller to complete the work
              </p>
            )}
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Work Complete</h3>
              <p className="text-text-secondary">
                {activeTransaction.amount} NC in escrow
              </p>
            </div>

            {isBuyer && (
              <BrandButton 
                onClick={handleRelease}
                disabled={loading}
                className="w-full"
              >
                Release Funds
              </BrandButton>
            )}

            {isSeller && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for buyer to release payment
              </p>
            )}
          </div>
        )


      case 'released':
        return (
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Complete</h3>
            <p className="text-text-secondary">
              {isSeller ? '💰 You received payment' : '✅ Payment sent to seller'}
            </p>
          </div>
        )

      case 'cancelled':
        return (
          <div className="text-center">
            <XCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Cancelled</h3>
            <p className="text-text-secondary">
              Funds returned to buyer
            </p>
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
        
        {/* Debug info - remove after testing */}
        {activeTransaction && (
          <div className="text-xs bg-muted p-2 rounded mb-2">
            <div>Status: {activeTransaction.status}</div>
            <div>Amount: {activeTransaction.amount} NC</div>
            <div>Your role: {activeTransaction.buyer_id === user?.id ? 'Buyer' : 'Seller'}</div>
          </div>
        )}
        
        {renderTransactionStatus()}
      </DialogContent>
    </Dialog>
  )
}

export default SafePayDialog
