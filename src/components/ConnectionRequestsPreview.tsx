import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserCheck, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useConnections } from '@/hooks/useConnections'

export const ConnectionRequestsPreview = () => {
  const navigate = useNavigate()
  const { connectionRequests, respondToConnectionRequest } = useConnections()
  
  const pendingRequests = connectionRequests.filter(req => 
    req.status === 'pending'
  ).slice(0, 3) // Show max 3 requests

  if (pendingRequests.length === 0) return null

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Connection Requests</CardTitle>
            <Badge variant="destructive" className="h-5 min-w-[20px] flex items-center justify-center">
              {connectionRequests.filter(r => r.status === 'pending').length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/connections')}
            className="text-primary hover:text-primary h-8"
          >
            View All
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.map((request) => {
          const profile = request.requester_profile
          if (!profile) return null
          
          return (
            <div key={request.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarImage src={profile.profile_picture_url} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {profile.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{profile.full_name}</p>
                {profile.profession && (
                  <p className="text-xs text-text-secondary truncate">{profile.profession}</p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => respondToConnectionRequest(request.id, true)}
                  className="h-7 px-3 text-xs"
                >
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => respondToConnectionRequest(request.id, false)}
                  className="h-7 px-3 text-xs"
                >
                  Decline
                </Button>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
