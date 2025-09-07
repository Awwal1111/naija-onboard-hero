import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { StarRating } from './star-rating'
import { Star } from 'lucide-react'

interface RatingDialogProps {
  onSubmit: (rating: number, comment?: string) => void
  trigger?: React.ReactNode
  disabled?: boolean
}

export const RatingDialog: React.FC<RatingDialogProps> = ({
  onSubmit,
  trigger,
  disabled = false
}) => {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [open, setOpen] = useState(false)

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, comment.trim() || undefined)
      setOpen(false)
      setRating(0)
      setComment('')
    }
  }

  const defaultTrigger = (
    <Button variant="outline" size="sm" disabled={disabled}>
      <Star className="h-4 w-4 mr-2" />
      Rate Expert
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rate This Expert</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              How would you rate your experience with this expert?
            </p>
            <StarRating
              rating={rating}
              onRatingChange={setRating}
              size="lg"
              className="justify-center"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Comment (Optional)
            </label>
            <Textarea
              placeholder="Share your experience working with this expert..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0}
              className="flex-1"
            >
              Submit Rating
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}