import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
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
  updated_at: string
  is_active: boolean
}

export const useGroups = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [groups, setGroups] = useState<Group[]>([])
  const [myGroups, setMyGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchGroups()
      fetchMyGroups()
      subscribeToGroupChanges()
    }
  }, [user])

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description, category, group_lead_id, is_active, member_count, state_name, lga_name, area, created_at, updated_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setGroups(data || [])
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  const fetchMyGroups = async () => {
    if (!user) return

    try {
      // Get groups where user is a member or leader
      const { data: memberData, error: memberError } = await supabase
        .from('group_members')
        .select(`
          group_id,
          groups!inner(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .eq('groups.is_active', true)

      if (memberError) throw memberError

      // Extract the groups from the join result
      const userGroups = memberData?.map(item => item.groups).filter(Boolean) || []
      setMyGroups(userGroups as Group[])

    } catch (error) {
      console.error('Error fetching user groups:', error)
    } finally {
      setLoading(false)
    }
  }

  const subscribeToGroupChanges = () => {
    if (!user) return

    const channel = supabase
      .channel('group-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'groups'
        },
        (payload) => {
          console.log('Group change detected:', payload)
          
          if (payload.eventType === 'INSERT') {
            const newGroup = payload.new as Group
            setGroups(prev => [newGroup, ...prev])
            
            // If the current user created this group, add it to myGroups
            if (newGroup.group_lead_id === user.id) {
              setMyGroups(prev => [newGroup, ...prev])
              toast({
                title: "Group Created!",
                description: `${newGroup.name} has been created successfully`
              })
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedGroup = payload.new as Group
            setGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
            setMyGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g))
          }
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
          console.log('Group member change detected:', payload)
          
          // Refetch user groups when membership changes
          const newPayload = payload.new as any
          const oldPayload = payload.old as any
          if (newPayload?.user_id === user.id || oldPayload?.user_id === user.id) {
            fetchMyGroups()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const joinGroup = async (groupId: string) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member'
        })

      if (error) {
        if (error.code === '23505') { // Unique constraint violation
          toast({
            title: "Already a Member",
            description: "You are already a member of this group",
            variant: "destructive"
          })
          return false
        }
        throw error
      }

      toast({
        title: "Joined Group!",
        description: "You have successfully joined the group"
      })

      await fetchMyGroups()
      return true
    } catch (error) {
      console.error('Error joining group:', error)
      toast({
        title: "Error",
        description: "Failed to join group",
        variant: "destructive"
      })
      return false
    }
  }

  const leaveGroup = async (groupId: string) => {
    if (!user) return false

    try {
      const { error } = await supabase
        .from('group_members')
        .update({ is_active: false })
        .eq('group_id', groupId)
        .eq('user_id', user.id)

      if (error) throw error

      toast({
        title: "Left Group",
        description: "You have left the group"
      })

      await fetchMyGroups()
      return true
    } catch (error) {
      console.error('Error leaving group:', error)
      toast({
        title: "Error",
        description: "Failed to leave group",
        variant: "destructive"
      })
      return false
    }
  }

  const refreshGroups = () => {
    setLoading(true)
    fetchGroups()
    fetchMyGroups()
  }

  return {
    groups,
    myGroups,
    loading,
    joinGroup,
    leaveGroup,
    refreshGroups
  }
}