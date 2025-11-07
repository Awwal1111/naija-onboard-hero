import React, { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Search, UserPlus, Check, X, Clock, Briefcase } from 'lucide-react'
import { useConnections } from '@/hooks/useConnections'
import { useNotifications } from '@/hooks/useNotifications'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { toast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

export const ConnectionRequests = () => {
  const { connectionRequests, loading, respondToConnectionRequest, refetch } = useConnections()
  const { createNotification } = useNotifications()
  const [searchQuery, setSearchQuery] = useState('')
  const [mutualConnections, setMutualConnections] = useState<Record<string, number>>({})
  
  useEffect(() => {
    refetch()
    fetchMutualConnections()
  }, [])

  const fetchMutualConnections = async () => {
    const pending = connectionRequests.filter(req => req.status === 'pending')
    const counts: Record<string, number> = {}
    
    for (const req of pending) {
      if (req.requester_id) {
        const { count } = await supabase
          .from('connections')
          .select('*', { count: 'exact', head: true })
          .or(`user1_id.eq.${req.requester_id},user2_id.eq.${req.requester_id}`)
        
        counts[req.requester_id] = count || 0
      }
    }
    setMutualConnections(counts)
  }

  const filteredRequests = connectionRequests.filter(request =>
    request.requester_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.requested_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingRequests = filteredRequests.filter(request => request.status === 'pending')

  const handleAcceptRequest = async (request: any) => {
    const result = await respondToConnectionRequest(request.id, true)
    if (result?.success) {
      toast({
        title: "Connection accepted",
        description: "You are now connected!",
      })
      await createNotification(
        request.requester_id,
        'connection_accepted',
        'Connection Accepted!',
        `${request.requested_profile?.full_name || 'Someone'} accepted your connection request.`,
        { connectionId: request.id }
      )
    } else if (result?.error) {
      toast({
        title: "Error",
        description: result.error || "Failed to accept request",
        variant: "destructive"
      })
    }
  }

  const handleRejectRequest = async (request: any) => {
    const result = await respondToConnectionRequest(request.id, false)
    if (result?.success) {
      toast({
        title: "Request declined",
        description: "Connection request has been declined.",
      })
    } else if (result?.error) {
      toast({
        title: "Error",
        description: result.error || "Failed to decline request",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
            <CardContent className="p-0">
              <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4 animate-pulse">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-muted rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 md:h-5 bg-muted rounded w-2/3" />
                  <div className="h-3 md:h-4 bg-muted rounded w-1/2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <div className="h-8 w-20 md:h-9 md:w-24 bg-muted rounded" />
                  <div className="h-8 w-8 md:h-9 md:w-9 bg-muted rounded" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 md:top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search connection requests..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 md:pl-10 h-9 md:h-11 text-sm md:text-base"
        />
      </div>

      {pendingRequests.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 md:py-16">
            <div className="text-center">
              <div className="mx-auto w-14 h-14 md:w-16 md:h-16 bg-muted rounded-full flex items-center justify-center mb-3 md:mb-4">
                <UserPlus className="h-7 w-7 md:h-8 md:w-8 text-muted-foreground" />
              </div>
              <h3 className="text-base md:text-lg font-semibold mb-2">
                {searchQuery ? 'No matching requests' : 'No Pending Requests'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm mx-auto px-4">
                {searchQuery 
                  ? 'Try adjusting your search criteria.' 
                  : 'You\'re all caught up! Check back later for new connection requests.'}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {pendingRequests.map((request) => (
            <Card key={request.id} className="overflow-hidden hover:shadow-lg transition-all duration-200 border-l-4 border-l-primary">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4">
                  <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-background shadow-md flex-shrink-0">
                    <AvatarImage 
                      src={request.requester_profile?.profile_picture_url} 
                      alt={request.requester_profile?.full_name}
                    />
                    <AvatarFallback className="text-lg md:text-xl font-semibold">
                      {request.requester_profile?.full_name?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-sm md:text-base mb-1 truncate">
                      {request.requester_profile?.full_name || 'Unknown User'}
                    </h4>
                    
                    {request.requester_profile?.profession && (
                      <div className="flex items-center gap-1 md:gap-1.5 text-xs md:text-sm text-muted-foreground mb-1.5 md:mb-2">
                        <Briefcase className="h-3 w-3 md:h-3.5 md:w-3.5 flex-shrink-0" />
                        <span className="truncate">{request.requester_profile.profession}</span>
                      </div>
                    )}
                    
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 text-xs">
                      <Badge variant="secondary" className="gap-1 h-5">
                        <Clock className="h-2.5 w-2.5 md:h-3 md:w-3" />
                        {new Date(request.created_at).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </Badge>
                      
                      {mutualConnections[request.requester_id] > 0 && (
                        <Badge variant="outline" className="text-xs h-5">
                          {mutualConnections[request.requester_id]} connections
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-1.5 md:gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      onClick={() => handleAcceptRequest(request)}
                      className="h-8 md:h-9 px-2.5 md:px-4 gap-1 md:gap-1.5 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white shadow-sm hover:shadow-md transition-all duration-200 text-xs md:text-sm"
                    >
                      <Check className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden xs:inline">Accept</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRejectRequest(request)}
                      className="h-8 w-8 md:h-9 md:w-9 border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-all duration-200"
                    >
                      <X className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default ConnectionRequests