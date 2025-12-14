import React, { useState, useEffect } from 'react'
import { Trophy, Medal, Crown, TrendingUp, Users, DollarSign, Briefcase, Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

interface LeaderboardUser {
  user_id: string
  full_name: string | null
  profession: string | null
  profile_picture_url: string | null
  is_expert: boolean
  total_earnings: number
  connections_count: number
  completed_jobs_count: number
  average_rating: number
}

const getRankIcon = (rank: number) => {
  switch (rank) {
    case 1:
      return <Crown className="h-5 w-5 text-yellow-500" />
    case 2:
      return <Medal className="h-5 w-5 text-gray-400" />
    case 3:
      return <Medal className="h-5 w-5 text-amber-600" />
    default:
      return <span className="text-sm font-bold text-muted-foreground w-5 text-center">{rank}</span>
  }
}

const getRankBadgeColor = (rank: number) => {
  switch (rank) {
    case 1:
      return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white'
    case 2:
      return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
    case 3:
      return 'bg-gradient-to-r from-amber-500 to-amber-700 text-white'
    default:
      return 'bg-muted text-muted-foreground'
  }
}

export const LeaderboardSection: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('earnings')
  const [leaderboards, setLeaderboards] = useState<{
    earnings: LeaderboardUser[]
    connections: LeaderboardUser[]
    jobs: LeaderboardUser[]
    rating: LeaderboardUser[]
  }>({
    earnings: [],
    connections: [],
    jobs: [],
    rating: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeaderboards()
  }, [])

  const fetchLeaderboards = async () => {
    try {
      // Fetch top earners (cast to any for new columns)
      const { data: earners } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, is_expert, total_earnings, connections_count, completed_jobs_count, average_rating')
        .gt('total_earnings', 0)
        .order('total_earnings', { ascending: false })
        .limit(10) as any

      // Fetch top connected
      const { data: connected } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, is_expert, total_earnings, connections_count, completed_jobs_count, average_rating')
        .gt('connections_count', 0)
        .order('connections_count', { ascending: false })
        .limit(10) as any

      // Fetch top job completers
      const { data: jobbers } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, is_expert, total_earnings, connections_count, completed_jobs_count, average_rating')
        .gt('completed_jobs_count', 0)
        .order('completed_jobs_count', { ascending: false })
        .limit(10) as any

      // Fetch top rated
      const { data: rated } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, is_expert, total_earnings, connections_count, completed_jobs_count, average_rating')
        .gt('average_rating', 0)
        .order('average_rating', { ascending: false })
        .limit(10) as any

      setLeaderboards({
        earnings: (earners || []) as LeaderboardUser[],
        connections: (connected || []) as LeaderboardUser[],
        jobs: (jobbers || []) as LeaderboardUser[],
        rating: (rated || []) as LeaderboardUser[]
      })
    } catch (error) {
      console.error('Error fetching leaderboards:', error)
    } finally {
      setLoading(false)
    }
  }

  const renderLeaderboardItem = (user: LeaderboardUser, rank: number, metric: string, value: string | number) => (
    <div
      key={user.user_id}
      onClick={() => navigate(`/profile/${user.user_id}`)}
      className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:bg-accent/50 ${
        rank <= 3 ? 'bg-accent/20' : ''
      }`}
    >
      {/* Rank */}
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getRankBadgeColor(rank)}`}>
        {getRankIcon(rank)}
      </div>

      {/* Avatar */}
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarImage src={user.profile_picture_url || undefined} />
        <AvatarFallback className="bg-primary/10 text-primary font-bold">
          {user.full_name?.charAt(0) || 'U'}
        </AvatarFallback>
      </Avatar>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-foreground truncate">
            {user.full_name || 'Anonymous'}
          </p>
          {user.is_expert && (
            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">
              Expert
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">
          {user.profession || 'NaijaLancers Member'}
        </p>
      </div>

      {/* Metric */}
      <div className="text-right">
        <p className="font-bold text-primary">{value}</p>
        <p className="text-xs text-muted-foreground">{metric}</p>
      </div>
    </div>
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
          <p className="text-muted-foreground mt-4">Loading leaderboard...</p>
        </CardContent>
      </Card>
    )
  }

  const hasData = Object.values(leaderboards).some(arr => arr.length > 0)

  if (!hasData) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Leaderboard will appear as users complete transactions</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="earnings" className="flex items-center gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Earners</span>
            </TabsTrigger>
            <TabsTrigger value="connections" className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Connected</span>
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex items-center gap-1">
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Jobs</span>
            </TabsTrigger>
            <TabsTrigger value="rating" className="flex items-center gap-1">
              <Star className="h-4 w-4" />
              <span className="hidden sm:inline">Rated</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earnings" className="space-y-2">
            {leaderboards.earnings.length > 0 ? (
              leaderboards.earnings.map((user, idx) =>
                renderLeaderboardItem(user, idx + 1, 'earned', `₦${(user.total_earnings || 0).toLocaleString()}`)
              )
            ) : (
              <p className="text-center text-muted-foreground py-8">No earnings data yet</p>
            )}
          </TabsContent>

          <TabsContent value="connections" className="space-y-2">
            {leaderboards.connections.length > 0 ? (
              leaderboards.connections.map((user, idx) =>
                renderLeaderboardItem(user, idx + 1, 'connections', user.connections_count || 0)
              )
            ) : (
              <p className="text-center text-muted-foreground py-8">No connection data yet</p>
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-2">
            {leaderboards.jobs.length > 0 ? (
              leaderboards.jobs.map((user, idx) =>
                renderLeaderboardItem(user, idx + 1, 'jobs done', user.completed_jobs_count || 0)
              )
            ) : (
              <p className="text-center text-muted-foreground py-8">No job completion data yet</p>
            )}
          </TabsContent>

          <TabsContent value="rating" className="space-y-2">
            {leaderboards.rating.length > 0 ? (
              leaderboards.rating.map((user, idx) =>
                renderLeaderboardItem(user, idx + 1, 'rating', `⭐ ${(user.average_rating || 0).toFixed(1)}`)
              )
            ) : (
              <p className="text-center text-muted-foreground py-8">No rating data yet</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}