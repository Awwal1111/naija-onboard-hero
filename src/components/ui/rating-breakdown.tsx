import React from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingBreakdownProps {
  ratings: Array<{ rating: number; count: number }>
  totalRatings: number
  averageRating: number
  className?: string
}

export const RatingBreakdown: React.FC<RatingBreakdownProps> = ({
  ratings,
  totalRatings,
  averageRating,
  className
}) => {
  const getRatingCount = (star: number) => {
    return ratings.find(r => r.rating === star)?.count || 0
  }

  const getRatingPercentage = (star: number) => {
    if (totalRatings === 0) return 0
    return (getRatingCount(star) / totalRatings) * 100
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overall Rating */}
      <div className="flex items-center gap-4">
        <div className="text-center">
          <div className="text-5xl font-bold text-primary mb-2">
            {averageRating.toFixed(1)}
          </div>
          <div className="flex items-center justify-center gap-1 mb-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={cn(
                  "h-5 w-5",
                  star <= Math.round(averageRating)
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-muted/30 fill-muted/10"
                )}
              />
            ))}
          </div>
          <div className="text-sm text-muted-foreground">
            {totalRatings} {totalRatings === 1 ? 'review' : 'reviews'}
          </div>
        </div>

        {/* Rating Bars */}
        <div className="flex-1 space-y-2">
          {[5, 4, 3, 2, 1].map((star) => {
            const percentage = getRatingPercentage(star)
            return (
              <div key={star} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">
                  <span className="text-sm font-medium text-text-primary">{star}</span>
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                </div>
                <div className="flex-1 h-2 bg-muted/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-500 transition-all duration-500 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <div className="w-12 text-right">
                  <span className="text-sm text-muted-foreground">
                    {getRatingCount(star)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
