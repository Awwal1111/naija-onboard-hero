import React, { useState, useEffect } from 'react'
import { Users, MapPin, Briefcase, Star, UserPlus, MessageCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useConnections } from '@/hooks/useConnections'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'

interface SuggestedUser {
  user_id: string
  full_name: string
  profession?: string
  profile_picture_url?: string
  state_name?: string
  lga_name?: string
  score?: number
  is_expert?: boolean
  average_rating?: number
}

const SuggestionsTab: React.FC = () => {
  const { user } = useAuth()
  const { sendConnectionRequest } = useConnections()
  const [peopleYouMayKnow, setPeopleYouMayKnow] = useState<SuggestedUser[]>([])
  const [expertSuggestions, setExpertSuggestions] = useState<SuggestedUser[]>([])
  const [nearbyFriends, setNearbyFriends] = useState<SuggestedUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSuggestions()
  }, [user?.id])

  const fetchSuggestions = async () => {
    if (!user?.id) return
    
    try {
      setLoading(true)
      
      // Get current user's profile for comparison
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('profession, state_name, lga_name')
        .eq('user_id', user.id)
        .single()

      // Get all users except current user
      const { data: allUsers } = await supabase
        .from('profiles')
        .select(`
          user_id, 
          full_name, 
          profession, 
          profile_picture_url, 
          state_name, 
          lga_name,
          is_expert,
          average_rating
        `)
        .neq('user_id', user.id)
        .limit(50)

      if (!allUsers) return

      // Get existing connections to exclude
      const { data: existingConnections } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      const connectedUserIds = new Set(
        existingConnections?.flatMap(conn => 
          [conn.user1_id, conn.user2_id].filter(id => id !== user.id)
        ) || []
      )

      // Filter out connected users
      const availableUsers = allUsers.filter(u => !connectedUserIds.has(u.user_id))

      // People You May Know - based on mutual connections and interests
      const people = availableUsers
        .filter(u => !u.is_expert) // Non-experts for general connections
        .map(otherUser => {
          let score = 0

          // Same profession (10 points)
          if (currentProfile?.profession && otherUser.profession === currentProfile.profession) {
            score += 10
          }

          // Same state (5 points)
          if (currentProfile?.state_name && otherUser.state_name === currentProfile.state_name) {
            score += 5
          }

          // Same LGA (3 points)
          if (currentProfile?.lga_name && otherUser.lga_name === currentProfile.lga_name) {
            score += 3
          }

          return { ...otherUser, score }
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 8)

      // Expert Suggestions - verified experts
      const experts = availableUsers
        .filter(u => u.is_expert)
        .map(expert => {
          let score = 0

          // Same profession gets higher priority (8 points)
          if (currentProfile?.profession && expert.profession === currentProfile.profession) {
            score += 8
          }

          // Higher rated experts get priority
          if (expert.average_rating) {
            score += expert.average_rating
          }

          return { ...expert, score }
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 6)

      // Nearby Friends - same state/LGA
      const nearby = availableUsers
        .filter(u => 
          currentProfile?.state_name && 
          u.state_name === currentProfile.state_name
        )
        .map(nearbyUser => {
          let score = 0

          // Same LGA gets higher priority (5 points)
          if (currentProfile?.lga_name && nearbyUser.lga_name === currentProfile.lga_name) {
            score += 5
          }

          // Same profession (3 points)
          if (currentProfile?.profession && nearbyUser.profession === currentProfile.profession) {
            score += 3
          }

          return { ...nearbyUser, score }
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 6)

      setPeopleYouMayKnow(people)
      setExpertSuggestions(experts)
      setNearbyFriends(nearby)
      
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async (userId: string) => {
    const result = await sendConnectionRequest(userId)
    if (result.success) {
      // Remove user from suggestions after successful connection request
      setPeopleYouMayKnow(prev => prev.filter(p => p.user_id !== userId))
      setExpertSuggestions(prev => prev.filter(p => p.user_id !== userId))
      setNearbyFriends(prev => prev.filter(p => p.user_id !== userId))
    }
  }

  const UserCard: React.FC<{ user: SuggestedUser; showConnect?: boolean }> = ({ 
    user, 
    showConnect = true 
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user.profile_picture_url} />
            <AvatarFallback>
              {user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate">
              {user.full_name}
            </h4>
            {user.profession && (
              <p className="text-xs text-text-secondary truncate">
                {user.profession}
              </p>
            )}
            {user.is_expert && (
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="secondary" className="text-xs">
                  <Star className="h-3 w-3 mr-1" />
                  Expert
                </Badge>
                {user.average_rating && (
                  <span className="text-xs text-text-secondary">
                    {user.average_rating.toFixed(1)} ⭐
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {(user.state_name || user.lga_name) && (
          <div className="flex items-center gap-1 mb-3 text-xs text-text-secondary">
            <MapPin className="h-3 w-3" />
            <span className="truncate">
              {user.lga_name && user.state_name 
                ? `${user.lga_name}, ${user.state_name}`
                : user.state_name
              }
            </span>
          </div>
        )}
        
        {showConnect && (
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleConnect(user.user_id)}
              className="flex-1 text-xs"
            >
              <UserPlus className="h-3 w-3 mr-1" />
              Connect
            </Button>
            {user.is_expert && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(`/chat/${user.user_id}`, '_blank')}
                className="text-xs"
              >
                <MessageCircle className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Finding suggestions for you...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* People You May Know */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">People You May Know</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Connect with professionals in your field and expand your network
        </p>
        
        {peopleYouMayKnow.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Users className="h-12 w-12 mx-auto mb-4 text-text-secondary opacity-50" />
              <p className="text-text-secondary">No suggestions available right now</p>
              <p className="text-xs text-text-secondary mt-1">
                Check back later for new connections
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {peopleYouMayKnow.map((person) => (
              <UserCard key={person.user_id} user={person} />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Expert Suggestions */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Star className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Expert Suggestions</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Connect with verified experts in your field for mentorship and collaboration
        </p>
        
        {expertSuggestions.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <Star className="h-12 w-12 mx-auto mb-4 text-text-secondary opacity-50" />
              <p className="text-text-secondary">No expert suggestions available</p>
              <p className="text-xs text-text-secondary mt-1">
                More experts will be suggested as you use the platform
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {expertSuggestions.map((expert) => (
              <UserCard key={expert.user_id} user={expert} />
            ))}
          </div>
        )}
      </section>

      <Separator />

      {/* Nearby Friends */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <MapPin className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Nearby Friends</h2>
        </div>
        <p className="text-sm text-text-secondary mb-4">
          Connect with professionals in your area for local networking opportunities
        </p>
        
        {nearbyFriends.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <MapPin className="h-12 w-12 mx-auto mb-4 text-text-secondary opacity-50" />
              <p className="text-text-secondary">No nearby connections found</p>
              <p className="text-xs text-text-secondary mt-1">
                Make sure your location is set in your profile
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {nearbyFriends.map((friend) => (
              <UserCard key={friend.user_id} user={friend} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default SuggestionsTab