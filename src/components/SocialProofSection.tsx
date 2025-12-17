import React, { useState, useEffect } from 'react'
import { Star, Quote, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { supabase } from '@/integrations/supabase/client'

interface PlatformRating {
  id: string
  rating: number
  review: string | null
  created_at: string
  profiles?: {
    full_name: string | null
    profession: string | null
    profile_picture_url: string | null
  }
}

export const SocialProofSection: React.FC = () => {
  const [ratings, setRatings] = useState<PlatformRating[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ average: 0, count: 0 })

  useEffect(() => {
    fetchFeaturedRatings()
  }, [])

  const fetchFeaturedRatings = async () => {
    try {
      // Fetch ratings first
      const { data: ratingsData, error } = await supabase
        .from('platform_ratings' as any)
        .select('id, rating, review, created_at, user_id')
        .eq('is_featured', true)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })
        .limit(6) as any

      if (error) throw error

      if (!ratingsData || ratingsData.length === 0) {
        setRatings([])
        return
      }

      // Fetch profiles separately
      const userIds = ratingsData.map((r: any) => r.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url')
        .in('user_id', userIds)

      // Merge ratings with profiles
      const ratingsWithProfiles = ratingsData.map((rating: any) => {
        const profile = profilesData?.find((p: any) => p.user_id === rating.user_id)
        return {
          ...rating,
          profiles: profile || { full_name: null, profession: null, profile_picture_url: null }
        }
      })

      setRatings(ratingsWithProfiles as PlatformRating[])
      setStats({ average: Math.round(ratingsWithProfiles.reduce((sum: number, r: any) => sum + r.rating, 0) / ratingsWithProfiles.length * 10) / 10, count: ratingsWithProfiles.length })
    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || ratings.length === 0) {
    return null
  }

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Loved by Thousands
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            See what our community says about NaijaLancers
          </p>
          
          {/* Average Rating */}
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-6 w-6 ${
                    star <= Math.round(stats.average)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <span className="text-xl font-bold text-foreground">{stats.average}</span>
            <span className="text-muted-foreground">from {stats.count}+ reviews</span>
          </div>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ratings.map((rating) => (
            <Card key={rating.id} className="bg-card border-border hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Quote Icon */}
                <Quote className="h-8 w-8 text-primary/20 mb-4" />
                
                {/* Review Text */}
                <p className="text-foreground mb-6 line-clamp-4">
                  "{rating.review}"
                </p>

                {/* User Info */}
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={rating.profiles?.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {rating.profiles?.full_name?.charAt(0) || <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {rating.profiles?.full_name || 'NaijaLancers User'}
                    </p>
                    <p className="text-sm text-muted-foreground truncate">
                      {rating.profiles?.profession || 'Freelancer'}
                    </p>
                  </div>
                  {/* Stars */}
                  <div className="flex">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= rating.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}