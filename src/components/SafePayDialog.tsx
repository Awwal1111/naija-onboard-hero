import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Textarea } from '@/components/ui/textarea'
import { Shield, Clock, CheckCircle, AlertTriangle, XCircle } from 'lucide-react'
import { useSafePay } from '@/hooks/useSafePay'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'

interface SafePayDialogProps {
  otherUserId: string
  otherUserName: string
}

const SafePayDialog: React.FC<SafePayDialogProps> = ({ otherUserId, otherUserName }) => {
  const { user } = useAuth()
  const { 
    activeTransaction, 
    loading, 
    proposeSafePay, 
    acceptSafePay, 
    completeSafePay, 
    releaseFunds, 
    cancelSafePay,
    requestCancel,
    approveCancel,
    fileDispute
  } = useSafePay(otherUserId)
  const { balance } = useWallet()
  const [amount, setAmount] = useState('')
  const [open, setOpen] = useState(false)
  const [disputeReason, setDisputeReason] = useState('')
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [timeRemaining, setTimeRemaining] = useState('')

  // Calculate time remaining for auto-release
  useEffect(() => {
    if (!activeTransaction?.auto_release_at) return

    const updateTimer = () => {
      const now = new Date().getTime()
      const releaseTime = new Date(activeTransaction.auto_release_at!).getTime()
      const diff = releaseTime - now

      if (diff <= 0) {
        setTimeRemaining('Expired')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

      setTimeRemaining(`${days}d ${hours}h ${minutes}m`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [activeTransaction?.auto_release_at])

  const handlePropose = async () => {
    const amountNum = parseInt(amount)
    if (amountNum > 0) {
      await proposeSafePay(amountNum)
      setAmount('')
    }
  }

  const handleFileDispute = async () => {
    if (disputeReason.trim()) {
      await fileDispute(disputeReason)
      setShowDisputeForm(false)
      setDisputeReason('')
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
                  onClick={acceptSafePay}
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
        const hasCancelRequest = activeTransaction.cancel_requester_id
        const isRequester = activeTransaction.cancel_requester_id === user?.id
        
        return (
          <div className="space-y-4">
            <div className="text-center">
              <Shield className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">SafePay Active</h3>
              <p className="text-text-secondary">
                {activeTransaction.amount} NC secured in escrow
              </p>
              <p className="text-sm text-green-600 mt-2">
                ✅ Funds are securely locked. Proceed with the work.
              </p>
            </div>

            {hasCancelRequest && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  {isRequester 
                    ? 'Waiting for other party to approve cancellation...'
                    : `@${otherUserName} has requested to cancel this SafePay.`}
                </p>
                {!isRequester && (
                  <div className="flex gap-2 mt-2">
                    <BrandButton 
                      size="sm"
                      onClick={approveCancel}
                      disabled={loading}
                      className="flex-1"
                    >
                      Agree to Cancel
                    </BrandButton>
                    <BrandButton 
                      size="sm"
                      variant="outline"
                      onClick={() => {}}
                      className="flex-1"
                    >
                      Deny
                    </BrandButton>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              {isSeller && (
                <BrandButton 
                  onClick={completeSafePay}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? 'Updating...' : 'Mark as Done'}
                </BrandButton>
              )}

              {!hasCancelRequest && (
                <BrandButton 
                  variant="outline"
                  onClick={requestCancel}
                  disabled={loading}
                  className="w-full"
                >
                  Request Cancel
                </BrandButton>
              )}
            </div>
          </div>
        )

      case 'complete':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Work Complete</h3>
              {isSeller && (
                <p className="text-text-secondary">
                  ✅ You marked the job as complete. Waiting for buyer to release funds.
                </p>
              )}
              {isBuyer && (
                <>
                  <p className="text-text-secondary mb-2">
                    ✅ @{otherUserName} has marked this job complete
                  </p>
                  <p className="text-sm text-amber-600">
                    ⏳ Auto-release in: {timeRemaining}
                  </p>
                </>
              )}
            </div>

            {isBuyer && !showDisputeForm && (
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
                  onClick={() => setShowDisputeForm(true)}
                  disabled={loading}
                  className="flex-1"
                >
                  File Dispute
                </BrandButton>
              </div>
            )}

            {isBuyer && showDisputeForm && (
              <div className="space-y-3">
                <Textarea
                  placeholder="Describe the issue with this job..."
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  rows={4}
                />
                <div className="flex gap-2">
                  <BrandButton
                    onClick={handleFileDispute}
                    disabled={!disputeReason.trim() || loading}
                    className="flex-1"
                  >
                    Submit Dispute
                  </BrandButton>
                  <BrandButton
                    variant="outline"
                    onClick={() => {
                      setShowDisputeForm(false)
                      setDisputeReason('')
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </BrandButton>
                </div>
              </div>
            )}
          </div>
        )

      case 'disputed':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">SafePay Disputed</h3>
              <p className="text-text-secondary">
                ❗ Funds are locked. An admin will review the chat and make a ruling.
              </p>
              {activeTransaction.dispute_reason && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                  <p className="text-sm font-medium text-red-800">Dispute Reason:</p>
                  <p className="text-sm text-red-700 mt-1">{activeTransaction.dispute_reason}</p>
                </div>
              )}
            </div>
          </div>
        )

      case 'released':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Payment Complete</h3>
              {isSeller && (
                <p className="text-text-secondary">
                  💰 Payment Released. {activeTransaction.amount} NC is now available for withdrawal.
                </p>
              )}
              {isBuyer && (
                <p className="text-text-secondary">
                  {activeTransaction.admin_ruling 
                    ? '🔨 Admin released the funds to the seller'
                    : '💰 Funds have been released to @' + otherUserName}
                </p>
              )}
            </div>
          </div>
        )

      case 'cancelled':
        return (
          <div className="space-y-4">
            <div className="text-center">
              <XCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">SafePay Cancelled</h3>
              <p className="text-text-secondary">
                {activeTransaction.cancel_approved_by 
                  ? '🤝 SafePay cancelled by mutual agreement. Funds have been returned to buyer.'
                  : '❌ SafePay cancelled.'}
              </p>
            </div>
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
