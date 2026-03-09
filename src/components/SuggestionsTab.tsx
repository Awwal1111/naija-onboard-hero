import React, { useState } from 'react'
import { Users, MapPin, Briefcase, Star, UserPlus, MessageCircle, TrendingUp, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useConnections } from '@/hooks/useConnections'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { toast } from '@/hooks/use-toast'
import { usePersonalizedConnections, PersonalizedConnection } from '@/hooks/usePersonalizedDiscovery'
import ProfilePreview from '@/components/ProfilePreview'

const SuggestionsTab: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { sendConnectionRequest } = useConnections()
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())
  const [previewProfileId, setPreviewProfileId] = useState<string | null>(null)

  // Use personalized connection algorithm
  const { connections: allSuggestions, loading } = usePersonalizedConnections(50)

  // Split into categories
  const peopleYouMayKnow = allSuggestions.filter(u => !u.is_expert).slice(0, 8)
  const expertSuggestions = allSuggestions.filter(u => u.is_expert).slice(0, 6)
  const nearbyFriends = allSuggestions.filter(u => u.relevance_score >= 10).slice(0, 6)

  const handleConnect = async (userId: string) => {
    const result = await sendConnectionRequest(userId)
    if (result.success) {
      toast({
        title: "Connection request sent",
        description: "Your request has been sent successfully!",
      })
      setPendingRequests(prev => new Set([...prev, userId]))
    }
  }

  const UserCard: React.FC<{
    user: PersonalizedConnection
    onConnect: (userId: string) => void
    reason?: string
  }> = ({ user, onConnect, reason }) => {
    const isPending = pendingRequests.has(user.user_id)
    
    return (
      <Card className="overflow-hidden hover:shadow-lg transition-all duration-200 group">
        <CardContent className="p-0">
          <div className="p-4">
            <div className="flex items-start gap-4 mb-4">
              <Avatar 
                className="h-16 w-16 border-2 border-background shadow-md ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all cursor-pointer"
                onClick={() => setPreviewProfileId(user.user_id)}
              >
                <AvatarImage src={user.profile_picture_url || undefined} />
                <AvatarFallback className="text-lg font-semibold">
                  {user.full_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h4 
                    className="font-semibold text-base truncate cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setPreviewProfileId(user.user_id)}
                  >
                    {user.full_name}
                  </h4>
                  {user.is_expert && (
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      Expert
                    </Badge>
                  )}
                </div>
                
                {user.profession && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                    <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{user.profession}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-1">
                  {user.average_rating && user.average_rating > 0 && (
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{user.average_rating.toFixed(1)}</span>
                    </div>
                  )}
                  {(user.state_name || user.lga_name) && (
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">
                        {[user.lga_name, user.state_name].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {reason && (
              <>
                <Separator className="mb-3" />
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5" />
                  {reason}
                </p>
              </>
            )}
            
            <div className="flex gap-2">
              <Button
                size="default"
                onClick={() => onConnect(user.user_id)}
                disabled={isPending}
                variant={isPending ? "secondary" : "default"}
                className="flex-1"
              >
                {isPending ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Request Sent
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Connect
                  </>
                )}
              </Button>
              <Button
                size="default"
                variant="outline"
                onClick={() => navigate(`/chat/${user.user_id}`)}
              >
                <MessageCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="p-4 animate-pulse space-y-3">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-3/4" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-10 bg-muted rounded" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {peopleYouMayKnow.length > 0 && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">People You May Know</h2>
                </div>
                <p className="text-sm text-muted-foreground">Based on your profession and location</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {peopleYouMayKnow.slice(0, 6).map((user) => (
                  <UserCard
                    key={user.user_id}
                    user={user}
                    onConnect={handleConnect}
                    reason={user.relevance_score > 20 ? "Highly recommended" : "Same profession"}
                  />
                ))}
              </div>
            </div>
          )}

          {expertSuggestions.length > 0 && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-primary fill-current" />
                  <h2 className="text-2xl font-bold">Expert Suggestions</h2>
                </div>
                <p className="text-sm text-muted-foreground">Connect with verified experts in your field</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {expertSuggestions.slice(0, 6).map((user) => (
                  <UserCard
                    key={user.user_id}
                    user={user}
                    onConnect={handleConnect}
                    reason="Verified expert"
                  />
                ))}
              </div>
            </div>
          )}

          {nearbyFriends.length > 0 && (
            <div>
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  <h2 className="text-2xl font-bold">Nearby Friends</h2>
                </div>
                <p className="text-sm text-muted-foreground">Connect with people in your area</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {nearbyFriends.slice(0, 6).map((user) => (
                  <UserCard
                    key={user.user_id}
                    user={user}
                    onConnect={handleConnect}
                    reason="Near your location"
                  />
                ))}
              </div>
            </div>
          )}

          {peopleYouMayKnow.length === 0 && expertSuggestions.length === 0 && nearbyFriends.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Suggestions Available</h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                    Complete your profile to get personalized connection suggestions.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Profile Preview Dialog */}
      <ProfilePreview
        isOpen={!!previewProfileId}
        onClose={() => setPreviewProfileId(null)}
        profileId={previewProfileId || ''}
      />
    </div>
  )
}

export default SuggestionsTab