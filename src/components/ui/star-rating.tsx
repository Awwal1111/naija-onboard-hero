import React, { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  rating?: number
  onRatingChange?: (rating: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
  showValue?: boolean
  className?: string
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating = 0,
  onRatingChange,
  readonly = false,
  size = 'md',
  showValue = false,
  className
}) => {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null)
  
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  }

  const handleClick = (newRating: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(newRating)
    }
  }

  const handleMouseEnter = (newRating: number) => {
    if (!readonly) {
      setHoveredRating(newRating)
    }
  }

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoveredRating(null)
    }
  }

  const displayRating = hoveredRating ?? rating

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={cn(
              "transition-colors",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            <Star
              className={cn(
                sizeClasses[size],
                "transition-colors",
                star <= displayRating
                  ? "text-yellow-400 fill-yellow-400"
                  : "text-gray-300"
              )}
            />
          </button>
        ))}
      </div>
      
      {showValue && (
        <span className="text-sm text-muted-foreground ml-2">
          {rating > 0 ? `${rating.toFixed(1)}` : 'No ratings'}
        </span>
      )}
    </div>
  )
}