import React, { useState } from 'react'
import { UserPlus, Check, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel'
import { useConnections } from '@/hooks/useConnections'
import { useAuth } from '@/hooks/useAuth'
import ProfilePreview from '@/components/ProfilePreview'
import { toast } from '@/hooks/use-toast'
import { usePersonalizedConnections } from '@/hooks/usePersonalizedDiscovery'

interface PeopleYouMayKnowProps {
  onProfileClick?: (userId: string) => void
}

const PeopleYouMayKnow: React.FC<PeopleYouMayKnowProps> = ({ onProfileClick }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { sendConnectionRequest } = useConnections()
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
  const [showProfilePreview, setShowProfilePreview] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<Set<string>>(new Set())

  // Use personalized connection algorithm
  const { connections: suggestions, loading } = usePersonalizedConnections(10)
  
  const handleSeeAll = () => {
    navigate('/connections?tab=suggestions')
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

  if (loading || suggestions.length === 0) return null

  return (
    <Card className="mb-6 overflow-hidden">
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <h3 className="text-lg font-semibold">People You May Know</h3>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSeeAll}
          className="text-primary hover:text-primary/80 gap-1"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-4 pt-2">

        <Carousel
          opts={{
            align: "start",
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-4">
            {suggestions.map((person) => {
              const isPending = pendingRequests.has(person.user_id)
              
              return (
                <CarouselItem key={person.user_id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4">
                  <div className="flex flex-col items-center text-center p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors h-full">
                    <div 
                      onClick={() => handleProfileClick(person.user_id)}
                      className="cursor-pointer"
                    >
                      <Avatar className="h-16 w-16 mb-2 hover:ring-2 hover:ring-primary transition-all">
                        <AvatarImage src={person.profile_picture_url || undefined} />
                        <AvatarFallback>
                          {person.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <h4 className="font-medium text-sm truncate w-full hover:text-primary transition-colors">
                        {person.full_name}
                      </h4>
                      {person.profession && (
                        <p className="text-xs text-muted-foreground truncate w-full">
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
                </CarouselItem>
              )
            })}
          </CarouselContent>
          <CarouselPrevious className="-left-2" />
          <CarouselNext className="-right-2" />
        </Carousel>
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