import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ExternalLink, CheckCircle, XCircle, Clock } from 'lucide-react'
import { toast } from 'sonner'

interface SocialTaskSubmission {
  id: number
  task_id: number
  earner_id: string
  status: string
  screenshot_url: string | null
  text_explanation: string | null
  created_at: string
  updated_at: string
  earner: {
    full_name: string
    profile_picture_url: string | null
  }
  task: {
    platform: string
    type: string
    reward: number
  }
}

export const AdminSocialTasksSection = () => {
  const [submissions, setSubmissions] = useState<SocialTaskSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const getImageUrl = (mediaUrl: string): string => {
    // If it's already a full URL, return directly
    if (mediaUrl.startsWith('http://') || mediaUrl.startsWith('https://') || mediaUrl.startsWith('data:')) {
      return mediaUrl
    }
    // Otherwise, get public URL from storage
    const { data } = supabase.storage
      .from('social-media-tasks')
      .getPublicUrl(mediaUrl)
    return data.publicUrl
  }

  useEffect(() => {
    fetchSubmissions()

    // Set up real-time subscription for new submissions
    const channel = supabase
      .channel('social-tasks-submissions-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'social_tasks_progress'
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          fetchSubmissions() // Refresh submissions when changes occur
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    // Build image URLs synchronously since buckets are public
    const urls: Record<string, string> = {}
    for (const submission of submissions) {
      if (submission.screenshot_url && !imageUrls[submission.screenshot_url]) {
        urls[submission.screenshot_url] = getImageUrl(submission.screenshot_url)
      }
    }
    if (Object.keys(urls).length > 0) {
      setImageUrls(prev => ({ ...prev, ...urls }))
    }
  }, [submissions])

  const fetchSubmissions = async () => {
    try {
      console.log('Fetching social task submissions...')
      
      // First check if user has admin access
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user?.id)
      
      const { data, error } = await supabase
        .from('social_tasks_progress')
        .select(`
          *,
          earner:profiles!social_tasks_progress_earner_id_fkey(full_name, profile_picture_url),
          task:social_tasks!social_tasks_progress_task_id_fkey(platform, type, reward)
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

  const handleApprove = async (submissionId: number, earnerId: string, reward: number) => {
    try {
      // Get the submission to find the task_id and screenshot for cleanup
      const { data: submission } = await supabase
        .from('social_tasks_progress')
        .select('task_id, screenshot_url')
        .eq('id', submissionId)
        .single()

      if (!submission) throw new Error('Submission not found')

      // Update submission status
      const { error: updateError } = await supabase
        .from('social_tasks_progress')
        .update({ status: 'completed' })
        .eq('id', submissionId)

      if (updateError) throw updateError

      // Increment done_slots in the social_tasks table
      const { data: currentTask } = await supabase
        .from('social_tasks')
        .select('done_slots, total_slots')
        .eq('id', submission.task_id)
        .single()

      if (currentTask) {
        const newDoneSlots = (currentTask.done_slots || 0) + 1
        
        // Update done_slots and mark as finished if all slots are complete
        const updateData: any = { done_slots: newDoneSlots }
        if (newDoneSlots >= currentTask.total_slots) {
          updateData.status = 'finished'
        }

        await supabase
          .from('social_tasks')
          .update(updateData)
          .eq('id', submission.task_id)
      }

      // Get current wallet balances
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_withdrawable')
        .eq('user_id', earnerId)
        .single()

      if (currentProfile) {
        // Credit user wallet - social task rewards are WITHDRAWABLE
        const newTotalBalance = (currentProfile.wallet_balance || 0) + reward
        const newWithdrawable = (currentProfile.balance_withdrawable || 0) + reward
        
        const { error: walletError } = await supabase
          .from('profiles')
          .update({ 
            wallet_balance: newTotalBalance,
            balance_withdrawable: newWithdrawable
          })
          .eq('user_id', earnerId)

        if (walletError) throw walletError
      }

      // Create transaction record
      await supabase.from('wallet_transactions').insert({
        user_id: earnerId,
        amount: reward,
        kind: 'social_task_reward',
        status: 'completed',
        reference: `Social media task reward`,
        metadata: { task_id: submissionId }
      })

      toast.success(`Approved! ${reward} NC credited to user (withdrawable)`)
      deleteSupabaseStorageFile((submission as any)?.screenshot_url)
      fetchSubmissions()
    } catch (error) {
      console.error('Error approving submission:', error)
      toast.error('Failed to approve submission')
    }
  }

  const handleReject = async (submissionId: number) => {
    try {
      const { data: subRow } = await supabase
        .from('social_tasks_progress')
        .select('screenshot_url')
        .eq('id', submissionId)
        .maybeSingle()

      const { error } = await supabase
        .from('social_tasks_progress')
        .update({ status: 'rejected' })
        .eq('id', submissionId)

      if (error) throw error
      toast.success('Submission rejected')
      deleteSupabaseStorageFile(subRow?.screenshot_url)
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
          <Clock className="h-5 w-5" />
          Social Media Task Submissions ({submissions.length})
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
                    {submission.earner?.profile_picture_url ? (
                      <img
                        src={submission.earner.profile_picture_url}
                        alt={submission.earner.full_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      submission.earner?.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{submission.earner?.full_name || 'Anonymous'}</h4>
                    <p className="text-sm text-muted-foreground">
                      {submission.task?.platform} - {submission.task?.type}
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{submission.task?.reward} NC</Badge>
              </div>

              {submission.screenshot_url && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2">Screenshot Proof:</p>
                  {loadingImages.has(submission.screenshot_url) ? (
                    <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary border-t-transparent"></div>
                    </div>
                  ) : imageUrls[submission.screenshot_url] ? (
                    <img
                      src={imageUrls[submission.screenshot_url]}
                      alt="Task proof"
                      className="w-full max-h-48 object-cover rounded-lg cursor-pointer"
                      onClick={() => setSelectedImage(imageUrls[submission.screenshot_url])}
                      onError={(e) => {
                        console.error('Image failed to load:', submission.screenshot_url)
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
                  onClick={() => handleApprove(submission.id, submission.earner_id, submission.task?.reward || 0)}
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Pay
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(submission.id)}
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