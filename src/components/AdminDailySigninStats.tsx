import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { supabase } from '@/integrations/supabase/client'
import { Calendar, Users, Coins, TrendingUp } from 'lucide-react'

interface DailySigninStats {
  totalSigninsToday: number
  totalSigninsThisMonth: number
  totalAmountPaidToday: number
  totalAmountPaidThisMonth: number
  uniqueUsersToday: number
  uniqueUsersThisMonth: number
}

export const AdminDailySigninStats = () => {
  const [stats, setStats] = useState<DailySigninStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const today = new Date().toISOString().split('T')[0]
      const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
        .toISOString().split('T')[0]

      // Get today's signins
      const { data: todaySignins, error: todayError } = await supabase
        .from('daily_signins')
        .select('reward_amount')
        .eq('signin_date', today)

      if (todayError) throw todayError

      // Get this month's signins
      const { data: monthSignins, error: monthError } = await supabase
        .from('daily_signins')
        .select('reward_amount, user_id')
        .gte('signin_date', firstOfMonth)

      if (monthError) throw monthError

      // Calculate stats
      const totalSigninsToday = todaySignins?.length || 0
      const totalSigninsThisMonth = monthSignins?.length || 0
      const totalAmountPaidToday = todaySignins?.reduce((sum, signin) => sum + parseFloat(signin.reward_amount.toString()), 0) || 0
      const totalAmountPaidThisMonth = monthSignins?.reduce((sum, signin) => sum + parseFloat(signin.reward_amount.toString()), 0) || 0
      const uniqueUsersToday = todaySignins?.length || 0 // Each user can only sign in once per day
      const uniqueUsersThisMonth = new Set(monthSignins?.map(signin => signin.user_id)).size || 0

      setStats({
        totalSigninsToday,
        totalSigninsThisMonth,
        totalAmountPaidToday,
        totalAmountPaidThisMonth,
        uniqueUsersToday,
        uniqueUsersThisMonth
      })

    } catch (error) {
      console.error('Error fetching daily signin stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-accent/20">
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-16" />
            </CardHeader>
          </Card>
        ))}
      </div>
    )
  }

  if (!stats) {
    return (
      <Card className="border-accent/20">
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground">Failed to load daily signin statistics</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Calendar className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Daily Sign-In Statistics</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Today's Stats */}
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center space-x-1">
              <Calendar className="h-4 w-4" />
              <span>Today</span>
            </CardDescription>
            <CardTitle className="text-2xl text-primary">
              {stats.totalSigninsToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Sign-ins today</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center space-x-1">
              <Coins className="h-4 w-4" />
              <span>Today's Payout</span>
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              ₦{stats.totalAmountPaidToday.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Amount paid today</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>Active Today</span>
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {stats.uniqueUsersToday}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Unique users today</p>
          </CardContent>
        </Card>

        {/* This Month's Stats */}
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center space-x-1">
              <TrendingUp className="h-4 w-4" />
              <span>This Month</span>
            </CardDescription>
            <CardTitle className="text-2xl text-primary">
              {stats.totalSigninsThisMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total sign-ins</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center space-x-1">
              <Coins className="h-4 w-4" />
              <span>Monthly Payout</span>
            </CardDescription>
            <CardTitle className="text-2xl text-green-600">
              ₦{stats.totalAmountPaidThisMonth.toFixed(2)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Total paid this month</p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center space-x-1">
              <Users className="h-4 w-4" />
              <span>Monthly Active</span>
            </CardDescription>
            <CardTitle className="text-2xl text-blue-600">
              {stats.uniqueUsersThisMonth}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Unique users this month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}