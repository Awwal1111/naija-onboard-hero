import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Users, Crown, MapPin, Search, MessageSquare, Clock } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

interface Group {
  id: string
  name: string
  category: string
  state_name: string
  lga_name: string
  area: string
  description?: string
  member_count: number
  group_lead_id: string
  created_at: string
  group_lead: {
    full_name: string
  }
  user_membership?: {
    role: string
    is_active: boolean
  }
  last_message?: {
    content: string
    created_at: string
    sender_name: string
  }
  unread_count?: number
}

const GroupMessagesTab: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'joined'>('joined')

  useEffect(() => {
    if (user) {
      fetchGroups()
      subscribeToRealtime()
    }
  }, [user])

  const fetchGroups = async () => {
    if (!user) return

    try {
      // Fetch user's groups
      const { data: userGroups, error: userGroupsError } = await supabase
        .from('group_members')
        .select(`
          role,
          is_active,
          groups!inner(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)

      if (userGroupsError) throw userGroupsError

      // Get group leads for user groups
      const groupIds = (userGroups || []).map(m => m.groups.id)
      const { data: groupLeads } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', (userGroups || []).map(m => m.groups.group_lead_id))

      const leadsMap = new Map(groupLeads?.map(lead => [lead.user_id, lead]) || [])

      const processedMyGroups = (userGroups || []).map(membership => ({
        ...membership.groups,
        group_lead: leadsMap.get(membership.groups.group_lead_id) || { full_name: 'Unknown' },
        user_membership: {
          role: membership.role,
          is_active: membership.is_active
        }
      }))

      setMyGroups(processedMyGroups)

      // Fetch all available groups
      const { data: allGroups, error: allGroupsError } = await supabase
        .from('groups')
        .select('id, name, description, category, group_lead_id, is_active, member_count, avatar_url, created_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (allGroupsError) throw allGroupsError

      // Get all group leads
      const allLeadIds = (allGroups || []).map(g => g.group_lead_id)
      const { data: allLeads } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', allLeadIds)

      const allLeadsMap = new Map(allLeads?.map(lead => [lead.user_id, lead]) || [])

      const processedGroups = (allGroups || []).map(group => ({
        ...group,
        group_lead: allLeadsMap.get(group.group_lead_id) || { full_name: 'Unknown' }
      }))

      setGroups(processedGroups)
    } catch (error) {
      console.error('Error fetching groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToRealtime = () => {
    const channel = supabase
      .channel('group-messages-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages'
        },
        () => {
          fetchGroups()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'group_members'
        },
        (payload) => {
          if ((payload.new as any)?.user_id === user?.id || (payload.old as any)?.user_id === user?.id) {
            fetchGroups()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const joinGroup = async (groupId: string) => {
    if (!user) return

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        })

      if (error) {
        if (error.code === '23505') {
          toast({
            title: "Already Joined",
            description: "You're already a member of this group",
            variant: "destructive"
          })
          return
        }
        throw error
      }

      toast({
        title: "Joined Successfully",
        description: "You can now chat in this group"
      })

      fetchGroups()
    } catch (error: any) {
      console.error('Error joining group:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to join group",
        variant: "destructive"
      })
    }
  }

  const displayGroups = activeFilter === 'joined' ? myGroups : groups
  const filteredGroups = displayGroups.filter(group =>
    group.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.area.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getCategoryColor = (category: string) => {
    const colors = {
      technology: 'bg-blue-100 text-blue-800',
      business: 'bg-green-100 text-green-800',
      healthcare: 'bg-red-100 text-red-800',
      education: 'bg-purple-100 text-purple-800',
      agriculture: 'bg-yellow-100 text-yellow-800',
      construction: 'bg-orange-100 text-orange-800',
      finance: 'bg-indigo-100 text-indigo-800',
      legal: 'bg-gray-100 text-gray-800',
      creative: 'bg-pink-100 text-pink-800',
      other: 'bg-slate-100 text-slate-800'
    }
    return colors[category as keyof typeof colors] || colors.other
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="h-3 bg-muted rounded w-full" />
                <div className="flex gap-2">
                  <div className="h-6 bg-muted rounded w-20" />
                  <div className="h-6 bg-muted rounded w-24" />
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
      {/* Search and Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search groups..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={activeFilter === 'joined' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('joined')}
          >
            My Groups ({myGroups.length})
          </Button>
          <Button
            variant={activeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveFilter('all')}
          >
            Discover Groups
          </Button>
        </div>
      </div>

      {/* Groups List */}
      {filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-8">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {activeFilter === 'joined' ? 'No groups joined yet' : 'No groups found'}
            </h3>
            <p className="text-text-secondary text-center">
              {activeFilter === 'joined' 
                ? 'Join a group to start connecting with professionals in your area' 
                : 'Try adjusting your search criteria'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredGroups.map((group) => {
            const isJoined = myGroups.some(mg => mg.id === group.id)
            const isGroupLead = group.group_lead_id === user?.id
            
            return (
              <Card key={group.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-semibold text-text-primary truncate">
                          {group.name}
                        </h4>
                        {isGroupLead && (
                          <Badge variant="secondary" className="gap-1">
                            <Crown className="h-3 w-3" />
                            Lead
                          </Badge>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge className={getCategoryColor(group.category)}>
                          {group.category}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <MapPin className="h-3 w-3" />
                          {group.area}, {group.lga_name}
                        </Badge>
                        <Badge variant="outline" className="gap-1">
                          <Users className="h-3 w-3" />
                          {group.member_count} members
                        </Badge>
                      </div>

                      {group.description && (
                        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                          {group.description}
                        </p>
                      )}

                      {group.last_message && (
                        <div className="flex items-start gap-2 p-2 bg-muted/50 rounded-lg mb-2">
                          <MessageSquare className="h-3 w-3 mt-0.5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-muted-foreground truncate">
                              <span className="font-medium">{group.last_message.sender_name}:</span>{' '}
                              {group.last_message.content}
                            </p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              <span>{new Date(group.last_message.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {group.unread_count && group.unread_count > 0 && (
                            <Badge variant="default" className="ml-2 h-5 min-w-5 flex items-center justify-center rounded-full text-xs px-1">
                              {group.unread_count}
                            </Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Lead: {group.group_lead.full_name}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 ml-4">
                      {isJoined ? (
                        <Button
                          size="sm"
                          onClick={() => navigate(`/groups/${group.id}`)}
                        >
                          Open Chat
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => joinGroup(group.id)}
                        >
                          Join Group
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default GroupMessagesTab