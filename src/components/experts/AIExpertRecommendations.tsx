import React, { useMemo } from 'react'
import { Sparkles, TrendingUp, MapPin, Shield, Zap, Star, Award, Clock, Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { PersonalizedExpert } from '@/hooks/usePersonalizedDiscovery'

interface AIExpertRecommendationsProps {
  experts: PersonalizedExpert[]
  userState?: string | null
  userProfession?: string | null
  onProfileClick?: (userId: string) => void
}

interface RecommendationReason {
  icon: React.ReactNode
  text: string
  priority: number
}

export const AIExpertRecommendations: React.FC<AIExpertRecommendationsProps> = ({ 
  experts, 
  userState, 
  userProfession,
  onProfileClick 
}) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()

  // AI-powered expert recommendation scoring
  const recommendedExperts = useMemo(() => {
    if (!experts.length) return []

    const currentUserState = userState || profile?.state_name
    const currentUserProfession = userProfession || profile?.profession

    return experts
      .map(expert => {
        let score = expert.relevance_score || 0
        const reasons: RecommendationReason[] = []

        // Premium status (highest priority)
        if (expert.is_premium) {
          score += 50
          reasons.push({
            icon: <Award className="h-3 w-3 text-purple-500" />,
            text: 'Premium Expert',
            priority: 1
          })
        }

        // Boosted profile
        if (expert.is_boosted) {
          score += 40
          reasons.push({
            icon: <Zap className="h-3 w-3 text-amber-500" />,
            text: 'Promoted',
            priority: 2
          })
        }

        // Verified expert
        if (expert.expert_verified_at) {
          score += 30
          reasons.push({
            icon: <Shield className="h-3 w-3 text-green-500" />,
            text: 'Verified',
            priority: 3
          })
        }

        // Location match
        if (currentUserState && expert.state_name === currentUserState) {
          score += 35
          reasons.push({
            icon: <MapPin className="h-3 w-3 text-blue-500" />,
            text: `In ${currentUserState}`,
            priority: 4
          })
        }

        // High rating boost
        if (expert.average_rating >= 4.8) {
          score += 25
          reasons.push({
            icon: <Star className="h-3 w-3 text-yellow-500" />,
            text: 'Top Rated',
            priority: 5
          })
        } else if (expert.average_rating >= 4.5) {
          score += 15
          reasons.push({
            icon: <Star className="h-3 w-3 text-yellow-500" />,
            text: 'Highly Rated',
            priority: 5
          })
        }

        // Experience boost
        if (expert.years_experience && expert.years_experience >= 5) {
          score += 20
          reasons.push({
            icon: <Clock className="h-3 w-3 text-indigo-500" />,
            text: `${expert.years_experience}+ years exp`,
            priority: 6
          })
        }

        // Connections/popularity boost
        if (expert.connections_count >= 50) {
          score += 15
          reasons.push({
            icon: <Users className="h-3 w-3 text-teal-500" />,
            text: 'Well connected',
            priority: 7
          })
        }

        // Skill match with user profession
        if (currentUserProfession && expert.skill_category) {
          const professionLower = currentUserProfession.toLowerCase()
          const skillLower = expert.skill_category.toLowerCase()
          
          // Check if expert's skill is complementary or matching
          const relatedSkills: Record<string, string[]> = {
            'web development': ['ui/ux design', 'graphic design', 'digital marketing'],
            'mobile app development': ['ui/ux design', 'graphic design'],
            'digital marketing': ['content writing', 'social media management', 'graphic design'],
            'content writing': ['digital marketing', 'social media management'],
            'graphic design': ['video editing', 'ui/ux design', 'photography'],
            'video editing': ['photography', 'graphic design', 'music production'],
          }

          if (skillLower.includes(professionLower) || professionLower.includes(skillLower)) {
            score += 25
            reasons.push({
              icon: <Sparkles className="h-3 w-3 text-primary" />,
              text: 'Same field',
              priority: 8
            })
          } else if (relatedSkills[professionLower]?.some(s => skillLower.includes(s))) {
            score += 15
            reasons.push({
              icon: <TrendingUp className="h-3 w-3 text-orange-500" />,
              text: 'Complementary skill',
              priority: 9
            })
          }
        }

        // Rating count (social proof)
        if (expert.rating_count >= 20) {
          score += 10
        }

        // Sort reasons by priority and limit
        reasons.sort((a, b) => a.priority - b.priority)

        return {
          ...expert,
          aiScore: score,
          reasons: reasons.slice(0, 2)
        }
      })
      .sort((a, b) => b.aiScore - a.aiScore)
      .slice(0, 6) // Top 6 recommendations
  }, [experts, userState, userProfession, profile])

  if (!recommendedExperts.length) return null

  const handleExpertClick = (expert: PersonalizedExpert) => {
    if (onProfileClick) {
      onProfileClick(expert.user_id)
    } else {
      navigate(`/expert/${expert.user_id}`)
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="p-1.5 bg-primary/10 rounded-lg">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span>AI Recommended Experts</span>
          {!user && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              Sign in for personalized picks
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {recommendedExperts.map((expert) => (
            <div
              key={expert.user_id}
              className="group cursor-pointer p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-md transition-all"
              onClick={() => handleExpertClick(expert)}
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-2">
                  <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                    <AvatarImage src={expert.profile_picture_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {expert.full_name?.charAt(0) || 'E'}
                    </AvatarFallback>
                  </Avatar>
                  {expert.is_premium && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full p-0.5">
                      <Award className="h-3 w-3 text-white" />
                    </div>
                  )}
                  {expert.is_boosted && !expert.is_premium && (
                    <div className="absolute -top-1 -right-1 bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full p-0.5">
                      <Zap className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>
                
                <h4 className="text-xs font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                  {expert.full_name}
                </h4>
                
                <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
                  {expert.skill_category || expert.profession || 'Expert'}
                </p>
                
                <div className="flex items-center gap-1 mt-1.5">
                  {expert.average_rating > 0 && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-[10px] font-medium">{expert.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                  {expert.expert_verified_at && (
                    <Badge className="bg-green-500/10 text-green-600 text-[8px] h-4 px-1 border-0">
                      <Shield className="h-2.5 w-2.5 mr-0.5" />
                      Verified
                    </Badge>
                  )}
                </div>
                
                {expert.reasons?.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {expert.reasons.map((reason, idx) => (
                      <span 
                        key={idx} 
                        className="inline-flex items-center gap-0.5 text-[8px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full"
                      >
                        {reason.icon}
                        {reason.text}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
