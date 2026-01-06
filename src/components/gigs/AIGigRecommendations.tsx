import React, { useMemo } from 'react'
import { Sparkles, TrendingUp, MapPin, Shield, Zap, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { getCategoryPlaceholder, normalizeCategory } from '@/lib/gigCategories'

interface GigData {
  id: string
  title: string
  description?: string
  price: number
  category: string
  photo_urls?: string[]
  boost_amount?: number
  seller_id?: string
  seller_name?: string
  seller_picture?: string
  seller_rating?: number
  seller_is_expert?: boolean
  seller_state?: string
  average_rating?: number
  review_count?: number
  relevance_score?: number
}

interface AIGigRecommendationsProps {
  gigs: GigData[]
  userState?: string | null
  userProfession?: string | null
}

interface RecommendationReason {
  icon: React.ReactNode
  text: string
  priority: number
}

export const AIGigRecommendations: React.FC<AIGigRecommendationsProps> = ({ gigs, userState, userProfession }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()

  // AI-powered recommendation scoring
  const recommendedGigs = useMemo(() => {
    if (!gigs.length) return []

    const currentUserState = userState || profile?.state_name
    const currentUserProfession = userProfession || profile?.profession

    return gigs
      .map(gig => {
        let score = gig.relevance_score || 0
        const reasons: RecommendationReason[] = []

        // Boost factor (highest priority)
        if ((gig.boost_amount || 0) > 0) {
          score += (gig.boost_amount || 0) * 2
          reasons.push({
            icon: <Zap className="h-3 w-3 text-amber-500" />,
            text: 'Promoted',
            priority: 1
          })
        }

        // Location match
        if (currentUserState && gig.seller_state === currentUserState) {
          score += 30
          reasons.push({
            icon: <MapPin className="h-3 w-3 text-blue-500" />,
            text: `Near you in ${currentUserState}`,
            priority: 2
          })
        }

        // Expert seller trust boost
        if (gig.seller_is_expert) {
          score += 25
          reasons.push({
            icon: <Shield className="h-3 w-3 text-green-500" />,
            text: 'Verified Expert',
            priority: 3
          })
        }

        // High rating boost
        if ((gig.average_rating || 0) >= 4.5) {
          score += 20
          reasons.push({
            icon: <Star className="h-3 w-3 text-yellow-500" />,
            text: 'Highly rated',
            priority: 4
          })
        } else if ((gig.average_rating || 0) >= 4.0) {
          score += 10
        }

        // Review count boost (social proof)
        if ((gig.review_count || 0) >= 10) {
          score += 15
          reasons.push({
            icon: <TrendingUp className="h-3 w-3 text-purple-500" />,
            text: 'Popular choice',
            priority: 5
          })
        } else if ((gig.review_count || 0) >= 5) {
          score += 8
        }

        // Profession/category relevance
        if (currentUserProfession) {
          const professionLower = currentUserProfession.toLowerCase()
          const categoryLower = gig.category?.toLowerCase() || ''
          const titleLower = gig.title?.toLowerCase() || ''
          
          if (categoryLower.includes(professionLower) || titleLower.includes(professionLower)) {
            score += 20
            reasons.push({
              icon: <Sparkles className="h-3 w-3 text-primary" />,
              text: 'Matches your field',
              priority: 6
            })
          }
        }

        // Sort reasons by priority
        reasons.sort((a, b) => a.priority - b.priority)

        return {
          ...gig,
          aiScore: score,
          reasons: reasons.slice(0, 2) // Show top 2 reasons
        }
      })
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 6) // Top 6 recommendations
  }, [gigs, userState, userProfession, profile])

  if (!recommendedGigs.length) return null

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span>AI Picks For You</span>
          {!user && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              Sign in for personalized picks
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {recommendedGigs.map((gig) => (
            <div
              key={gig.id}
              className="group cursor-pointer"
              onClick={() => navigate(`/gig/${gig.id}`)}
            >
              <div className="relative aspect-[4/3] rounded-lg overflow-hidden mb-2">
                <img
                  src={gig.photo_urls?.[0] || getCategoryPlaceholder(normalizeCategory(gig.category))}
                  alt={gig.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {(gig.boost_amount || 0) > 0 && (
                  <div className="absolute top-1 left-1">
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-400 text-white text-[9px] h-4 px-1.5 border-0">
                      <Zap className="h-2.5 w-2.5 mr-0.5 fill-white" />
                      Featured
                    </Badge>
                  </div>
                )}
                {gig.seller_is_expert && (
                  <div className="absolute top-1 right-1">
                    <Badge className="bg-green-500/90 text-white text-[9px] h-4 px-1.5 border-0">
                      <Shield className="h-2.5 w-2.5" />
                    </Badge>
                  </div>
                )}
              </div>
              <h4 className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                {gig.title}
              </h4>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-bold text-primary">₦{gig.price?.toLocaleString()}</span>
                {(gig.average_rating || 0) > 0 && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-[10px] text-muted-foreground">{(gig.average_rating || 0).toFixed(1)}</span>
                  </>
                )}
              </div>
              {gig.reasons?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {gig.reasons.map((reason, idx) => (
                    <span key={idx} className="inline-flex items-center gap-0.5 text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                      {reason.icon}
                      {reason.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
