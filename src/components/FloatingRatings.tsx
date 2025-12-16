import React, { useState, useEffect } from 'react'
import { Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'

interface Rating {
  id: string
  rating: number
  review: string | null
  profiles?: {
    full_name: string | null
    profile_picture_url: string | null
  }
}

export const FloatingRatings: React.FC = () => {
  const [ratings, setRatings] = useState<Rating[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [stats, setStats] = useState({ average: 0, count: 0 })

  useEffect(() => {
    fetchRatings()
  }, [])

  // Auto-scroll every 4 seconds
  useEffect(() => {
    if (ratings.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ratings.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [ratings.length])

  const fetchRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('platform_ratings' as any)
        .select(`
          id,
          rating,
          review,
          profiles:user_id (
            full_name,
            profile_picture_url
          )
        `)
        .eq('is_featured', true)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10) as any

      if (error) throw error
      setRatings(data || [])

      // Get total stats
      const { data: allRatings } = await supabase
        .from('platform_ratings' as any)
        .select('rating') as any

      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / allRatings.length
        setStats({ average: Math.round(avg * 10) / 10, count: allRatings.length })
      }
    } catch (error) {
      console.error('Error fetching ratings:', error)
    }
  }

  if (ratings.length === 0) return null

  const currentRating = ratings[currentIndex]

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 border-b border-primary/20 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-4">
          {/* Overall Rating */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(stats.average)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-bold">{stats.average}</span>
            <span className="text-xs text-muted-foreground hidden sm:inline">({stats.count} reviews)</span>
          </div>

          {/* Current Review */}
          <div className="flex-1 flex items-center gap-3 min-w-0 overflow-hidden">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={currentRating.profiles?.profile_picture_url || undefined} />
              <AvatarFallback className="bg-primary/20 text-primary text-xs">
                {currentRating.profiles?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">
                "{currentRating.review}"
              </p>
              <p className="text-xs text-muted-foreground truncate">
                — {currentRating.profiles?.full_name || 'User'}
              </p>
            </div>
          </div>

          {/* Navigation */}
          {ratings.length > 1 && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + ratings.length) % ratings.length)}
                className="p-1 hover:bg-primary/10 rounded"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-xs text-muted-foreground">
                {currentIndex + 1}/{ratings.length}
              </span>
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % ratings.length)}
                className="p-1 hover:bg-primary/10 rounded"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
