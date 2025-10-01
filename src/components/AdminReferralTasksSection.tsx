import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { CheckCircle, XCircle, Gift } from 'lucide-react'
import { toast } from 'sonner'

interface ReferralTaskSubmission {
  id: string
  user_id: string
  task_id: string
  proof_url: string | null
  status: string
  created_at: string
  user: {
    full_name: string
    profile_picture_url: string | null
  }
  task: {
    title: string
    reward: number
    description: string
  }
}

export const AdminReferralTasksSection = () => {
  const [submissions, setSubmissions] = useState<ReferralTaskSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    fetchSubmissions()
  }, [])

  const fetchSubmissions = async () => {
    try {
      const { data, error } = await supabase
        .from('referral_submissions')
        .select(`
          *,
          user:profiles!referral_submissions_user_id_fkey(full_name, profile_picture_url),
          task:referral_tasks!referral_submissions_task_id_fkey(title, reward, description)
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSubmissions(data as any || [])
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast.error('Failed to load submissions')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (submissionId: string, userId: string, reward: number) => {
    try {
      // Update submission status
      const { error: updateError } = await supabase
        .from('referral_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // Credit user wallet
      const { error: walletError } = await supabase.rpc('increment_wallet_balance', {
        target_user_id: userId,
        amount_to_add: reward
      })

      if (walletError) throw walletError

      // Create transaction record
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: reward,
        kind: 'referral_task_reward',
        status: 'completed',
        reference: `Referral task reward`,
        metadata: { task_id: submissionId }
      })

      toast.success(`Approved! ${reward} NC credited to user`)
      fetchSubmissions()
    } catch (error) {
      console.error('Error approving submission:', error)
      toast.error('Failed to approve submission')
    }
  }

  const handleReject = async (submissionId: string, userId: string, reason?: string) => {
    try {
      const { error } = await supabase
        .from('referral_submissions')
        .update({ 
          status: 'rejected',
          admin_comment: reason || 'Submission rejected'
        })
        .eq('id', submissionId)

      if (error) throw error
      toast.success('Submission rejected')
      fetchSubmissions()
    } catch (error) {
      console.error('Error rejecting submission:', error)
      toast.error('Failed to reject submission')
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading submissions...</div>
  }

  return (
    <div className="space-y-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gift className="h-5 w-5" />
          Referral Task Submissions ({submissions.length})
        </CardTitle>
      </CardHeader>

      {submissions.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No pending submissions</p>
          </CardContent>
        </Card>
      ) : (
        submissions.map((submission) => (
          <Card key={submission.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {submission.user?.profile_picture_url ? (
                      <img
                        src={submission.user.profile_picture_url}
                        alt={submission.user.full_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      submission.user?.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{submission.user?.full_name || 'Anonymous'}</h4>
                    <p className="text-sm text-muted-foreground">{submission.task?.title}</p>
                  </div>
                </div>
                <Badge variant="secondary">{submission.task?.reward} NC</Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-3">{submission.task?.description}</p>

              {submission.proof_url && (
                <div className="mb-4">
                  <img
                    src={submission.proof_url}
                    alt="Task proof"
                    className="w-full max-h-48 object-cover rounded-lg cursor-pointer"
                    onClick={() => setSelectedImage(submission.proof_url)}
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(submission.id, submission.user_id, submission.task?.reward || 0)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Pay
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(submission.id, submission.user_id)}
                  className="flex-1"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2">
                Submitted: {new Date(submission.created_at).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        ))
      )}

      {/* Image Viewer Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Task Proof</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full size proof"
              className="w-full h-auto"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}