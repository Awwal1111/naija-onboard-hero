import React, { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from './star-rating'
import { Star, Sparkles } from 'lucide-react'

interface RatingDialogProps {
  onSubmit: (rating: number, comment?: string) => Promise<void> | void
  trigger?: React.ReactNode
  disabled?: boolean
  initialRating?: number
  initialComment?: string
}

export const RatingDialog: React.FC<RatingDialogProps> = ({
  onSubmit,
  trigger,
  disabled = false,
  initialRating = 0,
  initialComment = ''
}) => {
  const [rating, setRating] = useState(initialRating)
  const [comment, setComment] = useState(initialComment)
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Update when initial values change
  React.useEffect(() => {
    if (open) {
      setRating(initialRating)
      setComment(initialComment)
    }
  }, [open, initialRating, initialComment])

  const handleSubmit = async () => {
    if (rating === 0) return
    
    setSubmitting(true)
    try {
      await onSubmit(rating, comment.trim() || undefined)
      setRating(0)
      setComment('')
      setOpen(false)
    } finally {
      setSubmitting(false)
    }
  }

  const defaultTrigger = (
    <BrandButton variant="outline" size="sm" disabled={disabled}>
      <Star className="h-4 w-4 mr-2" />
      Rate Expert
    </BrandButton>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Rate This Expert
          </DialogTitle>
          <DialogDescription className="text-center">
            Your feedback helps the community make better connections
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <label className="text-sm font-medium text-center block">How would you rate your experience?</label>
            <div className="flex justify-center py-2">
              <StarRating
                rating={rating}
                onRatingChange={setRating}
                size="lg"
              />
            </div>
            {rating > 0 && (
              <p className="text-center text-sm text-primary font-medium animate-in fade-in duration-300">
                {rating === 5 && "Outstanding! 🌟"}
                {rating === 4 && "Great Experience! 👍"}
                {rating === 3 && "Good! 👌"}
                {rating === 2 && "Could Be Better 🤔"}
                {rating === 1 && "Needs Improvement 😕"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Share Your Experience (Optional)</label>
            <Textarea
              placeholder="Tell others what you liked or what could be improved..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[120px] resize-none bg-background/50"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/500
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <BrandButton
            variant="outline"
            onClick={() => setOpen(false)}
            className="flex-1"
            disabled={submitting}
          >
            Cancel
          </BrandButton>
          <BrandButton
            onClick={handleSubmit}
            disabled={rating === 0 || disabled || submitting}
            className="flex-1"
          >
            {submitting ? "Submitting..." : "Submit Rating"}
          </BrandButton>
        </div>
      </DialogContent>
    </Dialog>
  )
}