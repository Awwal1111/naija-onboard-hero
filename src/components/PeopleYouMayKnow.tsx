import React, { useState, useEffect } from 'react'
import { UserPlus, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { useConnections } from '@/hooks/useConnections'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import ProfilePreview from '@/components/ProfilePreview'
import { toast } from '@/hooks/use-toast'

interface SuggestedUser {
  user_id: string
  full_name: string
  profession?: string
  profile_picture_url?: string
}

interface PeopleYouMayKnowProps {
  onProfileClick?: (userId: string) => void
}

const PeopleYouMayKnow: React.FC<PeopleYouMayKnowProps> = ({ onProfileClick }) => {
  const { user } = useAuth()
  const { sendConnectionRequest } = useConnections()
  const [suggestions, setSuggestions] = useState<SuggestedUser[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [showProfilePreview, setShowProfilePreview] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchSuggestions()
  }, [user?.id])

  const fetchSuggestions = async () => {
    if (!user?.id) return
    
    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('profession, state_name, lga_name')
        .eq('user_id', user.id)
        .single()

      const { data: allUsers } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, state_name, lga_name')
        .neq('user_id', user.id)
        .limit(20)

      if (!allUsers) return

      const { data: existingConnections } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)

      const connectedUserIds = new Set(
        existingConnections?.flatMap(conn => 
          [conn.user1_id, conn.user2_id].filter(id => id !== user.id)
        ) || []
      )

      const availableUsers = allUsers
        .filter(u => !connectedUserIds.has(u.user_id))
        .map(otherUser => {
          let score = 0
          if (currentProfile?.profession && otherUser.profession === currentProfile.profession) {
            score += 10
          }
          if (currentProfile?.state_name && otherUser.state_name === currentProfile.state_name) {
            score += 5
          }
          return { ...otherUser, score }
        })
        .sort((a, b) => (b.score || 0) - (a.score || 0))
        .slice(0, 10)

      setSuggestions(availableUsers)
    } catch (error) {
      console.error('Error fetching suggestions:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const handleProfileClick = (userId: string) => {
    if (onProfileClick) {
      onProfileClick(userId)
    } else {
      setSelectedProfileId(userId)
      setShowProfilePreview(true)
    }
  }

  const handleClosePreview = () => {
    setShowProfilePreview(false)
    setSelectedProfileId(null)
  }

  const handleNext = () => {
    if (currentIndex < suggestions.length - 3) {
      setCurrentIndex(currentIndex + 1)
    }
  }

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  if (loading || suggestions.length === 0) return null

  const visibleSuggestions = suggestions.slice(currentIndex, currentIndex + 3)

  return (
    <Card className="mb-6 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">People You May Know</h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-8 w-8 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex >= suggestions.length - 3}
              className="h-8 w-8 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {visibleSuggestions.map((person) => {
            const isPending = pendingRequests.has(person.user_id)
            
            return (
              <div key={person.user_id} className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors">
                <div 
                  onClick={() => handleProfileClick(person.user_id)}
                  className="cursor-pointer"
                >
                  <Avatar className="h-16 w-16 mb-2 hover:ring-2 hover:ring-primary transition-all">
                    <AvatarImage src={person.profile_picture_url} />
                    <AvatarFallback>
                      {person.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <h4 className="font-medium text-sm truncate w-full hover:text-primary transition-colors">
                    {person.full_name}
                  </h4>
                  {person.profession && (
                    <p className="text-xs text-text-secondary truncate w-full">
                      {person.profession}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleConnect(person.user_id)}
                  disabled={isPending}
                  variant={isPending ? "secondary" : "default"}
                  className="mt-2 w-full text-xs"
                >
                  {isPending ? (
                    <>
                      <Check className="h-3 w-3 mr-1" />
                      Request Sent
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3 w-3 mr-1" />
                      Connect
                    </>
                  )}
                </Button>
              </div>
            )
          })}
        </div>
      </CardContent>
      
      {/* Profile Preview Dialog */}
      {selectedProfileId && (
        <ProfilePreview
          isOpen={showProfilePreview}
          onClose={handleClosePreview}
          profileId={selectedProfileId}
          onConnect={handleConnect}
        />
      )}
    </Card>
  )
}

export default PeopleYouMayKnow
