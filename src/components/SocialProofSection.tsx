import React, { useState, useEffect, useRef } from 'react'
import { Star, Quote, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchFeaturedRatings()
  }, [])

  // Auto-scroll testimonials
  useEffect(() => {
    if (ratings.length <= 1) return
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ratings.length)
    }, 5000)
    return () => clearInterval(interval)
  }, [ratings.length])

  const fetchFeaturedRatings = async () => {
    try {
      const { data: ratingsData, error } = await supabase
        .from('platform_ratings' as any)
        .select('id, rating, review, created_at, user_id')
        .eq('is_featured', true)
        .not('review', 'is', null)
        .order('created_at', { ascending: false })
        .limit(10) as any

      if (error) throw error

      if (!ratingsData || ratingsData.length === 0) {
        setRatings([])
        return
      }

      const userIds = ratingsData.map((r: any) => r.user_id)
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url')
        .in('user_id', userIds)

      const ratingsWithProfiles = ratingsData.map((rating: any) => {
        const profile = profilesData?.find((p: any) => p.user_id === rating.user_id)
        return {
          ...rating,
          profiles: profile || { full_name: null, profession: null, profile_picture_url: null }
        }
      })

      setRatings(ratingsWithProfiles as PlatformRating[])
      
      // Calculate stats from all ratings
      const { data: allRatings } = await supabase
        .from('platform_ratings' as any)
        .select('rating') as any
      
      if (allRatings && allRatings.length > 0) {
        const avg = allRatings.reduce((sum: number, r: any) => sum + r.rating, 0) / allRatings.length
        setStats({ average: Math.round(avg * 10) / 10, count: allRatings.length })
      }
    } catch (error) {
      console.error('Error fetching ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + ratings.length) % ratings.length)
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % ratings.length)
  }

  if (loading || ratings.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-background">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          {/* Trustpilot-style Header */}
          <div className="text-center mb-16">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Trusted by Freelancers
            </p>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8">
              What Our Users Say
            </h2>
            
            {/* Rating Badge - Trustpilot Style */}
            <div className="inline-flex flex-col items-center bg-muted/50 rounded-2xl px-8 py-6 border border-border">
              <div className="flex items-center gap-1 mb-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <div
                    key={star}
                    className={`w-8 h-8 flex items-center justify-center rounded ${
                      star <= Math.round(stats.average)
                        ? 'bg-primary'
                        : 'bg-muted'
                    }`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        star <= Math.round(stats.average)
                          ? 'fill-primary-foreground text-primary-foreground'
                          : 'text-muted-foreground'
                      }`}
                    />
                  </div>
                ))}
              </div>
              <p className="text-2xl font-bold text-foreground">{stats.average} out of 5</p>
              <p className="text-sm text-muted-foreground">
                Based on <span className="font-semibold text-foreground">{stats.count}</span> reviews
              </p>
            </div>
          </div>

          {/* Testimonial Carousel */}
          <div className="relative">
            {/* Navigation Arrows */}
            {ratings.length > 1 && (
              <>
                <button
                  onClick={handlePrev}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-background border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors hidden md:flex"
                  aria-label="Previous review"
                >
                  <ChevronLeft className="h-5 w-5 text-foreground" />
                </button>
                <button
                  onClick={handleNext}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-background border border-border rounded-full flex items-center justify-center shadow-lg hover:bg-muted transition-colors hidden md:flex"
                  aria-label="Next review"
                >
                  <ChevronRight className="h-5 w-5 text-foreground" />
                </button>
              </>
            )}

            {/* Cards Container */}
            <div className="overflow-hidden" ref={scrollRef}>
              <div
                className="flex transition-transform duration-500 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
              >
                {ratings.map((rating) => (
                  <div
                    key={rating.id}
                    className="w-full flex-shrink-0 px-4"
                  >
                    <div className="max-w-2xl mx-auto bg-muted/30 rounded-2xl p-8 md:p-10 border border-border">
                      {/* Stars */}
                      <div className="flex items-center gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-5 w-5 ${
                              star <= rating.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground/30'
                            }`}
                          />
                        ))}
                      </div>

                      {/* Quote */}
                      <blockquote className="text-lg md:text-xl text-foreground leading-relaxed mb-8">
                        "{rating.review}"
                      </blockquote>

                      {/* Author */}
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary/20">
                          <AvatarImage src={rating.profiles?.profile_picture_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {rating.profiles?.full_name?.charAt(0) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-foreground">
                              {rating.profiles?.full_name || 'NaijaLancers User'}
                            </p>
                            <CheckCircle className="h-4 w-4 text-primary" />
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rating.profiles?.profession || 'Verified User'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Dots Indicator */}
            {ratings.length > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                {ratings.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentIndex(index)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      index === currentIndex
                        ? 'bg-primary w-6'
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to review ${index + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
