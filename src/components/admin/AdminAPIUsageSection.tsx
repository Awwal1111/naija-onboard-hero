import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { 
  Activity, BarChart3, Clock, Loader2, RefreshCw, 
  TrendingUp, Zap, AlertTriangle, DollarSign
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DeveloperUsage {
  user_id: string
  full_name: string
  total_calls: number
  total_cost: number
  last_call: string
  endpoints: Record<string, number>
  success_rate: number
}

interface UsageEntry {
  id: string
  user_id: string
  endpoint: string
  method: string
  status_code: number | null
  cost_nc: number | null
  created_at: string
}

export function AdminAPIUsageSection() {
  const [developers, setDevelopers] = useState<DeveloperUsage[]>([])
  const [recentCalls, setRecentCalls] = useState<UsageEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [totalCalls, setTotalCalls] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [errorRate, setErrorRate] = useState(0)

  useEffect(() => {
    fetchUsageData()
  }, [timeRange])

  const fetchUsageData = async () => {
    setLoading(true)
    try {
      const daysMap: Record<string, number> = { '24h': 1, '7d': 7, '30d': 30, '90d': 90 }
      const days = daysMap[timeRange] || 7
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)

      // Fetch all API usage in range
      const { data: usage, error } = await supabase
        .from('api_usage')
        .select('*')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(1000)

      if (error) throw error

      const usageData = (usage || []) as UsageEntry[]

      // Get developer profiles
      const userIds = [...new Set(usageData.map(u => u.user_id))]
      
      let profiles: any[] = []
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', userIds)
        profiles = profileData || []
      }

      const profileMap = new Map(profiles.map(p => [p.user_id, p.full_name]))

      // Aggregate by developer
      const devMap = new Map<string, DeveloperUsage>()
      let totalErrors = 0

      usageData.forEach(entry => {
        const existing = devMap.get(entry.user_id) || {
          user_id: entry.user_id,
          full_name: profileMap.get(entry.user_id) || 'Unknown Developer',
          total_calls: 0,
          total_cost: 0,
          last_call: entry.created_at,
          endpoints: {} as Record<string, number>,
          success_rate: 100,
        }

        existing.total_calls++
        existing.total_cost += entry.cost_nc || 0
        existing.endpoints[entry.endpoint] = (existing.endpoints[entry.endpoint] || 0) + 1

        if (entry.status_code && entry.status_code >= 400) totalErrors++

        if (new Date(entry.created_at) > new Date(existing.last_call)) {
          existing.last_call = entry.created_at
        }

        devMap.set(entry.user_id, existing)
      })

      // Calculate success rates per developer
      const devList = Array.from(devMap.values()).map(dev => {
        const devEntries = usageData.filter(u => u.user_id === dev.user_id)
        const devErrors = devEntries.filter(u => u.status_code && u.status_code >= 400).length
        dev.success_rate = devEntries.length > 0 
          ? Math.round(((devEntries.length - devErrors) / devEntries.length) * 100)
          : 100
        return dev
      })

      devList.sort((a, b) => b.total_calls - a.total_calls)

      setDevelopers(devList)
      setRecentCalls(usageData.slice(0, 50))
      setTotalCalls(usageData.length)
      setTotalRevenue(usageData.reduce((sum, u) => sum + (u.cost_nc || 0), 0))
      setErrorRate(usageData.length > 0 ? Math.round((totalErrors / usageData.length) * 100) : 0)
    } catch (error) {
      console.error('Error fetching API usage:', error)
      toast.error('Failed to load API usage data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="24h">Last 24 Hours</SelectItem>
            <SelectItem value="7d">Last 7 Days</SelectItem>
            <SelectItem value="30d">Last 30 Days</SelectItem>
            <SelectItem value="90d">Last 90 Days</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchUsageData}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalCalls.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">Total API Calls</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">₦{totalRevenue.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">API Revenue (NC)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{developers.length}</p>
              <p className="text-xs text-muted-foreground">Active Developers</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${errorRate > 10 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30'}`}>
              <AlertTriangle className={`h-5 w-5 ${errorRate > 10 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{errorRate}%</p>
              <p className="text-xs text-muted-foreground">Error Rate</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Per-Developer Usage Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <BarChart3 className="h-5 w-5" />
            Developer Call Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          {developers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No API usage data in this period</p>
          ) : (
            <div className="space-y-3">
              {developers.map(dev => (
                <div key={dev.user_id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{dev.full_name}</span>
                      <Badge variant={dev.success_rate >= 95 ? 'default' : dev.success_rate >= 80 ? 'secondary' : 'destructive'} className="text-xs">
                        {dev.success_rate}% success
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last: {formatDistanceToNow(new Date(dev.last_call), { addSuffix: true })}
                      </span>
                      <span>Top: {Object.entries(dev.endpoints).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A'}</span>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className="font-bold text-lg">{dev.total_calls.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">calls • ₦{dev.total_cost.toLocaleString()} NC</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent API Calls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Recent API Calls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Endpoint</th>
                  <th className="pb-2 pr-4">Method</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Cost</th>
                  <th className="pb-2">Time</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.slice(0, 20).map(call => (
                  <tr key={call.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-mono text-xs">{call.endpoint}</td>
                    <td className="py-2 pr-4">
                      <Badge variant="outline" className="text-xs">{call.method}</Badge>
                    </td>
                    <td className="py-2 pr-4">
                      <Badge variant={call.status_code && call.status_code < 400 ? 'default' : 'destructive'} className="text-xs">
                        {call.status_code || '—'}
                      </Badge>
                    </td>
                    <td className="py-2 pr-4 text-xs">₦{call.cost_nc || 0}</td>
                    <td className="py-2 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(call.created_at), { addSuffix: true })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
