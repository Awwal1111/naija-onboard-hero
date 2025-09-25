import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Search, UserCheck, UserX, Users } from 'lucide-react'
import { useConnections } from '@/hooks/useConnections'
import { useNotifications } from '@/hooks/useNotifications'
import ResponsiveLayout from '@/components/ResponsiveLayout'

export const ConnectionRequests = () => {
  const { connectionRequests, loading, respondToConnectionRequest, refetch } = useConnections()
  const { createNotification } = useNotifications()
  const [searchQuery, setSearchQuery] = useState('')
  
  useEffect(() => {
    refetch()
  }, [])

  const filteredRequests = connectionRequests.filter(request =>
    request.requester_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    request.requested_profile?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const pendingRequests = filteredRequests.filter(request => request.status === 'pending')

  const handleAcceptRequest = async (request: any) => {
    const result = await respondToConnectionRequest(request.id, true)
    if (result.success) {
      // Create notification for requester
      await createNotification(
        request.requester_id,
        'connection_accepted',
        'Connection Accepted!',
        `${request.requested_profile?.full_name || 'Someone'} accepted your connection request.`,
        { connectionId: request.id }
      )
      refetch()
    }
  }

  const handleRejectRequest = async (request: any) => {
    const result = await respondToConnectionRequest(request.id, false)
    if (result.success) {
      refetch()
    }
  }

  if (loading) {
    return (
      <ResponsiveLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-200 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Connection Requests
              {pendingRequests.length > 0 && (
                <Badge variant="secondary">{pendingRequests.length}</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search connection requests..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Separator />

              {pendingRequests.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Pending Requests</h3>
                  <p className="text-muted-foreground">
                    You don't have any pending connection requests at the moment.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <Card key={request.id} className="border-l-4 border-l-primary/20">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage 
                                src={request.requester_profile?.profile_picture_url} 
                                alt={request.requester_profile?.full_name}
                              />
                              <AvatarFallback>
                                {request.requester_profile?.full_name?.[0]?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <h4 className="font-medium">
                                {request.requester_profile?.full_name || 'Unknown User'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {request.requester_profile?.profession || 'No profession listed'}
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Sent {new Date(request.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => handleAcceptRequest(request)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <UserCheck className="h-4 w-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectRequest(request)}
                            >
                              <UserX className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </ResponsiveLayout>
  )
}

export default ConnectionRequests