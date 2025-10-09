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

  useEffect(() => {
    const channel = supabase
      .channel('connection_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connection_requests' }, () => {
        refetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
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
    if (result.success) {
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
      refetch()
      fetchMutualConnections()
    }
  }

  const handleRejectRequest = async (request: any) => {
    const result = await respondToConnectionRequest(request.id, false)
    if (result.success) {
      toast({
        title: "Request declined",
        description: "Connection request has been declined.",
      })
      refetch()
    }
  }

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="flex items-center gap-4 p-4 animate-pulse">
                    <div className="w-20 h-20 bg-muted rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-5 bg-muted rounded w-2/3" />
                      <div className="h-4 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                    <div className="flex gap-2">
                      <div className="h-9 w-24 bg-muted rounded" />
                      <div className="h-9 w-9 bg-muted rounded" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search connection requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11"
            />
          </div>

          {pendingRequests.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-16">
                <div className="text-center">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <UserPlus className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery ? 'No matching requests' : 'No Pending Requests'}
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-sm mx-auto">
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
                    <div className="flex items-center gap-4 p-4">
                      <Avatar className="h-20 w-20 border-2 border-background shadow-md">
                        <AvatarImage 
                          src={request.requester_profile?.profile_picture_url} 
                          alt={request.requester_profile?.full_name}
                        />
                        <AvatarFallback className="text-xl font-semibold">
                          {request.requester_profile?.full_name?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-base mb-1 truncate">
                          {request.requester_profile?.full_name || 'Unknown User'}
                        </h4>
                        
                        {request.requester_profile?.profession && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-2">
                            <Briefcase className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{request.requester_profile.profession}</span>
                          </div>
                        )}
                        
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <Badge variant="secondary" className="gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(request.created_at).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </Badge>
                          
                          {mutualConnections[request.requester_id] > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {mutualConnections[request.requester_id]} connections
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="default"
                          onClick={() => handleAcceptRequest(request)}
                          className="gap-1.5"
                        >
                          <Check className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRejectRequest(request)}
                          className="hover:bg-destructive/10 hover:text-destructive"
                        >
                          <X className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  )
}

export default ConnectionRequests