import React, { useState, useEffect } from 'react'
import { Star, Send, Heart, X } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface PlatformRatingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionType?: string
}

export const PlatformRatingDialog: React.FC<PlatformRatingDialogProps> = ({ 
  open, 
  onOpenChange,
  transactionType = 'transaction'
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [review, setReview] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

  const handleSubmit = async () => {
    if (!user || rating === 0) return

    setSubmitting(true)
    try {
      // Insert rating - only use columns that exist in the table
      const { error: ratingError } = await supabase
        .from('platform_ratings' as any)
        .insert({
          user_id: user.id,
          rating,
          review: review.trim() || null,
          is_featured: rating >= 4 // Auto-feature good ratings
        } as any)

      if (ratingError) throw ratingError

      // Update profile to mark as rated + localStorage backup
      localStorage.setItem('platform_rated', 'true')
      await supabase
        .from('profiles')
        .update({ has_rated_platform: true } as any)
        .eq('user_id', user.id)

      toast({
        title: 'Thank you! 🎉',
        description: 'Your feedback helps us improve NaijaLancers for everyone.',
      })

      onOpenChange(false)
    } catch (error: any) {
      console.error('Rating error:', error)
      // If duplicate, just close silently
      if (error.code === '23505') {
        await supabase
          .from('profiles')
          .update({ has_rated_platform: true })
          .eq('user_id', user.id)
        onOpenChange(false)
        return
      }
      toast({
        title: 'Error',
        description: 'Failed to submit rating. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSkip = async () => {
    // Store skip timestamp in both DB and localStorage
    const now = new Date().toISOString()
    localStorage.setItem('rating_skipped_at', now)
    if (user) {
      await supabase
        .from('profiles')
        .update({ rating_skipped_at: now } as any)
        .eq('user_id', user.id)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-xl">How's your experience?</DialogTitle>
          <DialogDescription>
            Your first transaction was successful! Help others by sharing your experience with NaijaLancers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Star Rating */}
          <div className="text-center">
            <div className="flex justify-center gap-2 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  className="transition-transform hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={`h-10 w-10 transition-colors ${
                      star <= (hoveredRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground/30'
                    }`}
                  />
                </button>
              ))}
            </div>
            {(hoveredRating || rating) > 0 && (
              <p className="text-sm font-medium text-primary">
                {ratingLabels[hoveredRating || rating]}
              </p>
            )}
          </div>

          {/* Review Text */}
          {rating > 0 && (
            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
              <Textarea
                placeholder="Tell us what you loved or how we can improve... (optional)"
                value={review}
                onChange={(e) => setReview(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Button 
            variant="ghost" 
            className="flex-1" 
            onClick={handleSkip}
            disabled={submitting}
          >
            Skip
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
          >
            {submitting ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}