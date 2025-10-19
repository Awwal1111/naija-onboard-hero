import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle, XCircle, Clock, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

interface ManualDeposit {
  id: string
  user_id: string
  telegram_user_id: string | null
  telegram_username: string | null
  amount_claimed: number
  amount_approved: number | null
  proof_url: string | null
  status: string
  admin_notes: string | null
  created_at: string
  user: {
    full_name: string
    profile_picture_url: string | null
    wallet_balance: number
  }
}

export const AdminManualDepositsSection = () => {
  const [deposits, setDeposits] = useState<ManualDeposit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDeposit, setSelectedDeposit] = useState<ManualDeposit | null>(null)
  const [approvedAmount, setApprovedAmount] = useState('')
  const [adminNotes, setAdminNotes] = useState('')
  const [processing, setProcessing] = useState(false)
  const [imageDialogOpen, setImageDialogOpen] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchDeposits()

    // Real-time subscription
    const channel = supabase
      .channel('manual-deposits-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'manual_deposits'
        },
        () => {
          console.log('Manual deposit update received')
          fetchDeposits()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchDeposits = async () => {
    try {
      const { data, error } = await supabase
        .from('manual_deposits')
        .select(`
          *,
          user:profiles!manual_deposits_user_id_fkey(full_name, profile_picture_url, wallet_balance)
        `)
        .in('status', ['pending', 'awaiting_proof'])
        .order('created_at', { ascending: false })

      if (error) throw error
      setDeposits(data as any || [])
    } catch (error) {
      console.error('Error fetching deposits:', error)
      toast.error('Failed to load deposits')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!selectedDeposit) return
    
    const amount = parseFloat(approvedAmount) || selectedDeposit.amount_claimed
    if (amount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    setProcessing(true)
    try {
      // Get current balance
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_withdrawable')
        .eq('user_id', selectedDeposit.user_id)
        .single()

      if (!currentProfile) throw new Error('User not found')

      // Update deposit status
      const { error: updateError } = await supabase
        .from('manual_deposits')
        .update({
          status: 'approved',
          amount_approved: amount,
          admin_notes: adminNotes,
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedDeposit.id)

      if (updateError) throw updateError

      // Credit user wallet - deposits are WITHDRAWABLE
      const newTotal = (currentProfile.wallet_balance || 0) + amount
      const newWithdrawable = (currentProfile.balance_withdrawable || 0) + amount

      const { error: walletError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: newTotal,
          balance_withdrawable: newWithdrawable
        })
        .eq('user_id', selectedDeposit.user_id)

      if (walletError) throw walletError

      // Log transaction
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: selectedDeposit.user_id,
          amount: amount,
          kind: 'deposit',
          status: 'completed',
          reference: `Manual deposit via Telegram - Approved by admin`
        })

      toast.success(`Deposit approved! ₦${amount} NC credited`)
      setSelectedDeposit(null)
      setApprovedAmount('')
      setAdminNotes('')
      fetchDeposits()
    } catch (error: any) {
      console.error('Error approving deposit:', error)
      toast.error(error.message || 'Failed to approve deposit')
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedDeposit) return

    setProcessing(true)
    try {
      const { error } = await supabase
        .from('manual_deposits')
        .update({
          status: 'rejected',
          admin_notes: adminNotes || 'Rejected by admin',
          reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', selectedDeposit.id)

      if (error) throw error

      toast.success('Deposit rejected')
      setSelectedDeposit(null)
      setAdminNotes('')
      fetchDeposits()
    } catch (error: any) {
      console.error('Error rejecting deposit:', error)
      toast.error(error.message || 'Failed to reject deposit')
    } finally {
      setProcessing(false)
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading deposits...</div>
  }

  return (
    <div className="space-y-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Manual Deposits via Telegram ({deposits.length})
        </CardTitle>
      </CardHeader>

      {deposits.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No pending deposits</p>
          </CardContent>
        </Card>
      ) : (
        deposits.map((deposit) => (
          <Card key={deposit.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {deposit.user?.profile_picture_url ? (
                      <img
                        src={deposit.user.profile_picture_url}
                        alt={deposit.user.full_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      deposit.user?.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{deposit.user?.full_name || 'Anonymous'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {deposit.telegram_username ? `@${deposit.telegram_username}` : 'Telegram User'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Current Balance: ₦{deposit.user?.wallet_balance || 0} NC
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="mb-1">₦{deposit.amount_claimed} NC</Badge>
                  <p className="text-xs text-muted-foreground">
                    {new Date(deposit.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              {deposit.proof_url && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Payment Proof:</p>
                  <img
                    src={deposit.proof_url}
                    alt="Payment proof"
                    className="w-full max-h-48 object-contain rounded-lg cursor-pointer border"
                    onClick={() => {
                      setSelectedImage(deposit.proof_url)
                      setImageDialogOpen(true)
                    }}
                  />
                </div>
              )}

              {deposit.status === 'awaiting_proof' && (
                <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                  <p className="text-sm text-orange-600 dark:text-orange-400">
                    ⏳ Waiting for user to send payment proof
                  </p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedDeposit(deposit)
                    setApprovedAmount(deposit.amount_claimed.toString())
                  }}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* Review Dialog */}
      <Dialog open={!!selectedDeposit} onOpenChange={() => setSelectedDeposit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Deposit Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm font-medium">{selectedDeposit?.user?.full_name}</p>
            </div>
            <div>
              <Label>Amount Claimed</Label>
              <p className="text-sm font-medium">₦{selectedDeposit?.amount_claimed} NC</p>
            </div>
            <div>
              <Label htmlFor="approvedAmount">Amount to Approve</Label>
              <Input
                id="approvedAmount"
                type="number"
                value={approvedAmount}
                onChange={(e) => setApprovedAmount(e.target.value)}
                placeholder="Enter amount"
              />
            </div>
            <div>
              <Label htmlFor="adminNotes">Admin Notes (Optional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add any notes..."
                rows={3}
              />
            </div>
            {selectedDeposit?.proof_url && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(selectedDeposit.proof_url!, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Full Proof
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleApprove}
                disabled={processing || !approvedAmount}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={processing}
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-1" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Payment Proof</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Payment proof"
              className="w-full h-auto rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}