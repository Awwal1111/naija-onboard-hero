import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { Users, Briefcase, UserCheck } from 'lucide-react'

interface UserModeStats {
  freelancers: number
  clients: number
  both: number
  total: number
}

export const UserModeStatsCard = () => {
  const [stats, setStats] = useState<UserModeStats>({
    freelancers: 0,
    clients: 0,
    both: 0,
    total: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // Get all profiles with user_mode
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('user_mode')

      if (error) throw error

      const freelancers = profiles?.filter(p => p.user_mode === 'freelancer').length || 0
      const clients = profiles?.filter(p => p.user_mode === 'client').length || 0
      const both = profiles?.filter(p => p.user_mode === 'both' || !p.user_mode).length || 0

      setStats({
        freelancers,
        clients,
        both,
        total: profiles?.length || 0
      })
    } catch (error) {
      console.error('Error fetching user mode stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const freelancerPercent = stats.total > 0 ? ((stats.freelancers / stats.total) * 100).toFixed(1) : 0
  const clientPercent = stats.total > 0 ? ((stats.clients / stats.total) * 100).toFixed(1) : 0
  const bothPercent = stats.total > 0 ? ((stats.both / stats.total) * 100).toFixed(1) : 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">User Roles Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Freelancers */}
          <div className="text-center p-3 bg-primary/10 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Users className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-primary">{stats.freelancers}</div>
            <div className="text-xs text-muted-foreground">Freelancers</div>
            <div className="text-xs text-primary font-medium">{freelancerPercent}%</div>
          </div>

          {/* Clients */}
          <div className="text-center p-3 bg-accent rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Briefcase className="h-4 w-4 text-accent-foreground" />
            </div>
            <div className="text-2xl font-bold text-accent-foreground">{stats.clients}</div>
            <div className="text-xs text-muted-foreground">Clients</div>
            <div className="text-xs text-accent-foreground font-medium">{clientPercent}%</div>
          </div>

          {/* Both */}
          <div className="text-center p-3 bg-secondary rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <UserCheck className="h-4 w-4 text-secondary-foreground" />
            </div>
            <div className="text-2xl font-bold text-secondary-foreground">{stats.both}</div>
            <div className="text-xs text-muted-foreground">Both Roles</div>
            <div className="text-xs text-secondary-foreground font-medium">{bothPercent}%</div>
          </div>
        </div>

        {/* Visual Bar */}
        <div className="mt-4 h-2 rounded-full overflow-hidden bg-muted flex">
          <div 
            className="bg-primary h-full" 
            style={{ width: `${freelancerPercent}%` }}
          />
          <div 
            className="bg-accent h-full" 
            style={{ width: `${clientPercent}%` }}
          />
          <div 
            className="bg-secondary h-full" 
            style={{ width: `${bothPercent}%` }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
