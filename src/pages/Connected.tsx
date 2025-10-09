import React, { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Search, MessageCircle, Users, Filter } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useConnections } from '@/hooks/useConnections'
import { useUserPresence } from '@/hooks/useUserPresence'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'

export const Connected = () => {
  const { connections, loading, refetch } = useConnections()
  const { isUserOnline } = useUserPresence()
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBy, setFilterBy] = useState('all')
  
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
      <ResponsiveLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="animate-pulse space-y-4">
            {[1, 2, 3, 4].map((i) => (
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
              Connected ({connections.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search connections..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterBy} onValueChange={setFilterBy}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-2" />
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
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {searchQuery || filterBy !== 'all' ? 'No matching connections' : 'No connections yet'}
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery || filterBy !== 'all' 
                      ? 'Try adjusting your search or filter criteria.'
                      : 'Start connecting with other professionals to grow your network.'
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredConnections.map((connection) => (
                    <Card key={connection.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="relative">
                              <Avatar className="h-12 w-12">
                                <AvatarImage 
                                  src={connection.other_user?.profile_picture_url} 
                                  alt={connection.other_user?.full_name}
                                />
                                <AvatarFallback>
                                  {connection.other_user?.full_name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              {/* Online Status Indicator */}
                              <div 
                                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${
                                  isUserOnline(connection.other_user?.id || '') 
                                    ? 'bg-green-500' 
                                    : 'bg-gray-400'
                                }`}
                              />
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium">
                                {connection.other_user?.full_name || 'Unknown User'}
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {connection.other_user?.profession || 'No profession listed'}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant={isUserOnline(connection.other_user?.id || '') ? "default" : "secondary"}
                                  className="text-xs"
                                >
                                  {isUserOnline(connection.other_user?.id || '') ? 'Online' : 'Offline'}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  Connected {new Date(connection.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => handleStartChat(connection.other_user?.id || '')}
                            className="ml-2"
                          >
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Chat Now
                          </Button>
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

export default Connected