import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Phone, Mail, Video, Facebook, TrendingUp } from 'lucide-react'
import { getCommunicationAnalytics, ButtonType } from '@/lib/communicationAnalytics'

interface AnalyticsData {
  total: number
  byType: Record<ButtonType, number>
  byDay: Record<string, number>
}

const buttonConfig: Record<ButtonType, { label: string; icon: typeof MessageCircle; color: string }> = {
  whatsapp: { label: 'WhatsApp', icon: MessageCircle, color: 'bg-green-500/10 text-green-600' },
  phone: { label: 'Phone Call', icon: Phone, color: 'bg-blue-500/10 text-blue-600' },
  email: { label: 'Email', icon: Mail, color: 'bg-purple-500/10 text-purple-600' },
  google_meet: { label: 'Google Meet', icon: Video, color: 'bg-orange-500/10 text-orange-600' },
  facebook: { label: 'Facebook', icon: Facebook, color: 'bg-indigo-500/10 text-indigo-600' }
}

export const CommunicationAnalyticsCard = () => {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setIsLoading(true)
    const analytics = await getCommunicationAnalytics(30)
    setData(analytics)
    setIsLoading(false)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Communication Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 bg-muted rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Communication Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No analytics data available</p>
        </CardContent>
      </Card>
    )
  }

  // Sort button types by usage
  const sortedTypes = (Object.entries(data.byType) as [ButtonType, number][])
    .sort(([, a], [, b]) => b - a)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Communication Analytics
        </CardTitle>
        <CardDescription>
          Last 30 days of contact button usage
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Clicks */}
        <div className="flex items-center justify-between p-3 bg-primary/5 rounded-lg">
          <span className="font-medium">Total Clicks</span>
          <Badge variant="secondary" className="text-lg px-3 py-1">
            {data.total.toLocaleString()}
          </Badge>
        </div>

        {/* By Type */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedTypes.map(([type, count]) => {
            const config = buttonConfig[type]
            const Icon = config.icon
            const percentage = data.total > 0 ? Math.round((count / data.total) * 100) : 0
            
            return (
              <div 
                key={type} 
                className={`flex items-center justify-between p-3 rounded-lg ${config.color}`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className="font-medium">{config.label}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold">{count.toLocaleString()}</div>
                  <div className="text-xs opacity-70">{percentage}%</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Insight */}
        {sortedTypes[0] && sortedTypes[0][1] > 0 && (
          <p className="text-sm text-muted-foreground">
            📊 <strong>{buttonConfig[sortedTypes[0][0]].label}</strong> is the most used contact method 
            with {sortedTypes[0][1]} clicks ({Math.round((sortedTypes[0][1] / data.total) * 100)}%)
          </p>
        )}
      </CardContent>
    </Card>
  )
}
