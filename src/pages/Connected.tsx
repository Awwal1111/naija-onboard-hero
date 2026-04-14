import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Search, MessageCircle, Users, Filter, Star } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConnections } from '@/hooks/useConnections'
import { useUserPresence } from '@/hooks/useUserPresence'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import ProfilePreview from '@/components/ProfilePreview'

export const Connected = () => {
  const { connections, loading, refetch } = useConnections()
  const { isUserOnline } = useUserPresence()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  const [previewProfileId, setPreviewProfileId] = useState<string | null>(null)
  
  useEffect(() => {
    refetch()
    
    // Set up real-time subscription for connections
    const channel = supabase
      .channel('connections_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'connections' }, () => {
        refetch()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const filteredConnections = connections.filter(connection => {
    const matchesSearch = connection.other_user?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      connection.other_user?.profession?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (!matchesSearch) return false

    if (filterBy === 'online') {
      return isUserOnline(connection.other_user?.id || '')
    } else if (filterBy === 'offline') {
      return !isUserOnline(connection.other_user?.id || '')
    }
    
    return true
  })

  const handleStartChat = (userId: string) => {
    navigate(`/chat/${userId}`)
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center space-x-3 md:space-x-4 animate-pulse">
                <div className="w-10 h-10 md:w-12 md:h-12 bg-muted rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg">
          <Users className="h-4 w-4 md:h-5 md:w-5" />
          Connected ({connections.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 md:top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search connections..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 md:pl-10 h-9 md:h-10 text-sm md:text-base"
              />
            </div>
            <Select value={filterBy} onValueChange={setFilterBy}>
              <SelectTrigger className="w-full sm:w-[160px] md:w-[180px] h-9 md:h-10 text-sm md:text-base">
                <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                <SelectValue placeholder="Filter by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Connections</SelectItem>
                <SelectItem value="online">Online Only</SelectItem>
                <SelectItem value="offline">Offline Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {filteredConnections.length === 0 ? (
            <div className="text-center py-8 md:py-12">
              <Users className="mx-auto h-10 w-10 md:h-12 md:w-12 text-muted-foreground mb-3 md:mb-4" />
              <h3 className="text-base md:text-lg font-medium mb-2">
                {searchQuery || filterBy !== 'all' ? 'No matching connections' : 'No connections yet'}
              </h3>
              <p className="text-sm md:text-base text-muted-foreground max-w-sm mx-auto px-4">
                {searchQuery || filterBy !== 'all' 
                  ? 'Try adjusting your search or filter criteria.'
                  : 'Start connecting with other professionals to grow your network.'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {filteredConnections.map((connection) => (
                <Card key={connection.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-3 md:p-4">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2.5 md:space-x-3 min-w-0 flex-1">
                        <div className="relative flex-shrink-0">
                          <Avatar 
                            className="h-10 w-10 md:h-12 md:w-12 cursor-pointer"
                            onClick={() => setPreviewProfileId(connection.other_user?.id || '')}
                          >
                            <AvatarImage 
                              src={connection.other_user?.profile_picture_url} 
                              alt={connection.other_user?.full_name}
                            />
                            <AvatarFallback className="text-sm md:text-base">
                              {connection.other_user?.full_name?.[0]?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                          {/* Online Status Indicator */}
                          <div 
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-4 md:h-4 rounded-full border-2 border-white ${
                              isUserOnline(connection.other_user?.id || '') 
                                ? 'bg-green-500' 
                                : 'bg-gray-400'
                            }`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 
                            className="font-medium text-sm md:text-base truncate cursor-pointer hover:text-primary transition-colors"
                            onClick={() => setPreviewProfileId(connection.other_user?.id || '')}
                          >
                            {connection.other_user?.full_name || 'Unknown User'}
                          </h4>
                          <p className="text-xs md:text-sm text-muted-foreground truncate">
                            {connection.other_user?.profession || 'No profession listed'}
                          </p>
                          <div className="flex items-center gap-1.5 md:gap-2 mt-1">
                            <Badge 
                              variant={isUserOnline(connection.other_user?.id || '') ? "default" : "secondary"}
                              className="text-xs h-4 md:h-5 px-1.5 md:px-2"
                            >
                              {isUserOnline(connection.other_user?.id || '') ? 'Online' : 'Offline'}
                            </Badge>
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {new Date(connection.created_at).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleStartChat(connection.other_user?.id || '')}
                        className="ml-1 md:ml-2 h-8 md:h-9 px-2.5 md:px-3 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-sm hover:shadow-md transition-all duration-200 gap-1 md:gap-1.5 flex-shrink-0"
                      >
                        <MessageCircle className="h-3.5 w-3.5 md:h-4 md:w-4" />
                        <span className="hidden xs:inline text-xs md:text-sm">Chat</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </CardContent>

      {/* Profile Preview Dialog */}
      <ProfilePreview
        isOpen={!!previewProfileId}
        onClose={() => setPreviewProfileId(null)}
        profileId={previewProfileId || ''}
      />
    </Card>
  )
}

export default Connected