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
  text_explanation: string | null
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
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const getImageUrl = async (mediaUrl: string): Promise<string> => {
    try {
      // If it's already a full URL (http/https), return it directly
      if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('data:')) {
        return mediaUrl
      }
      
      // Otherwise, get a signed URL from storage
      const { data, error } = await supabase.storage
        .from('referral-tasks')
        .createSignedUrl(mediaUrl, 3600) // 1 hour expiry
      
      if (error) {
        console.error('Error getting signed URL:', error)
        // Try returning the raw URL as fallback
        return mediaUrl
      }
      return data.signedUrl
    } catch (error) {
      console.error('Exception getting signed URL:', error)
      return mediaUrl // Return raw URL as fallback
    }
  }

  useEffect(() => {
    fetchSubmissions()
  }, [])

  useEffect(() => {
    const loadImageUrls = async () => {
      const urlsToLoad: string[] = []
      
      // Find all images that need loading
      for (const submission of submissions) {
        if (submission.proof_url && 
            !imageUrls[submission.proof_url] && 
            !loadingImages.has(submission.proof_url)) {
          urlsToLoad.push(submission.proof_url)
        }
      }

      if (urlsToLoad.length === 0) return

      // Mark as loading
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        urlsToLoad.forEach(url => newSet.add(url))
        return newSet
      })

      // Load all URLs
      const urls: Record<string, string> = {}
      await Promise.all(
        urlsToLoad.map(async (mediaUrl) => {
          const url = await getImageUrl(mediaUrl)
          if (url) urls[mediaUrl] = url
        })
      )

      // Update state
      if (Object.keys(urls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...urls }))
      }
      
      // Clear loading state
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        urlsToLoad.forEach(url => newSet.delete(url))
        return newSet
      })
    }

    loadImageUrls()
  }, [submissions])

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

  const handleApprove = async (submissionId: string, userId: string, reward: number, taskTitle?: string) => {
    try {
      // Fetch proof URL so we can clean up storage after approval
      const { data: subRow } = await supabase
        .from('referral_submissions')
        .select('proof_url')
        .eq('id', submissionId)
        .maybeSingle()

      // Update submission status
      const { error: updateError } = await supabase
        .from('referral_submissions')
        .update({ status: 'approved' })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // Credit user wallet - referral task rewards go to WITHDRAWABLE balance
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_withdrawable')
        .eq('user_id', userId)
        .single()

      if (profile) {
        const { error: walletError } = await supabase
          .from('profiles')
          .update({
            wallet_balance: (profile.wallet_balance || 0) + reward,
            balance_withdrawable: (profile.balance_withdrawable || 0) + reward
          })
          .eq('user_id', userId)

        if (walletError) throw walletError
      }

      // Create transaction record
      await supabase.from('wallet_transactions').insert({
        user_id: userId,
        amount: reward,
        kind: 'referral_task_reward',
        status: 'completed',
        reference: `Referral task reward`,
        metadata: { task_id: submissionId }
      })

      // Notify user about approval
      await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          type: 'task_approved',
          title: '✅ Task Approved!',
          message: `Your submission for "${taskTitle || 'task'}" has been approved! ${reward} NC has been credited to your wallet.`,
          sendEmail: true,
          emailTemplate: 'general',
          metadata: {
            actionUrl: 'https://naijalancers.name.ng/wallet',
            actionText: 'View Your Wallet',
          }
        }
      })

      toast.success(`Approved! ${reward} NC credited to user`)
      // Best-effort: free storage by removing the proof image
      deleteSupabaseStorageFile(subRow?.proof_url)
      fetchSubmissions()
    } catch (error) {
      console.error('Error approving submission:', error)
      toast.error('Failed to approve submission')
    }
  }

  const handleReject = async (submissionId: string, userId: string, taskTitle?: string, reason?: string) => {
    try {
      const { data: subRow } = await supabase
        .from('referral_submissions')
        .select('proof_url')
        .eq('id', submissionId)
        .maybeSingle()

      const { error } = await supabase
        .from('referral_submissions')
        .update({ 
          status: 'rejected',
          admin_comment: reason || 'Submission rejected'
        })
        .eq('id', submissionId)

      if (error) throw error

      // Notify user about rejection
      await supabase.functions.invoke('send-notification', {
        body: {
          userId,
          type: 'task_rejected',
          title: 'Task Submission Update',
          message: `Your submission for "${taskTitle || 'task'}" was not approved. ${reason || 'Please review the requirements and try again.'}`,
          metadata: {
            actionUrl: 'https://naijalancers.name.ng/referral-tasks',
            actionText: 'View Tasks',
          }
        }
      })

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
                  <p className="text-xs text-muted-foreground mb-2">Screenshot Proof:</p>
                  {loadingImages.has(submission.proof_url) ? (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                  ) : imageUrls[submission.proof_url] ? (
                    <img
                      src={imageUrls[submission.proof_url]}
                      alt="Task proof"
                      className="w-full max-h-48 object-cover rounded-lg cursor-pointer"
                      onClick={() => setSelectedImage(imageUrls[submission.proof_url])}
                      onError={(e) => {
                        console.error('Image failed to load:', submission.proof_url)
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="150"%3E%3Crect fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage failed%3C/text%3E%3C/svg%3E'
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                      Failed to load image
                    </div>
                  )}
                </div>
              )}

              {submission.text_explanation && (
                <div className="mb-4 p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Text Explanation:</p>
                  <p className="text-sm text-text-primary whitespace-pre-wrap">{submission.text_explanation}</p>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleApprove(submission.id, submission.user_id, submission.task?.reward || 0, submission.task?.title)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Pay
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(submission.id, submission.user_id, submission.task?.title)}
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