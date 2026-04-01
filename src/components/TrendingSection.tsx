import React, { useEffect, useState } from 'react'
import { TrendingUp, Hash, Users, Briefcase, Award, Eye, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SidebarAd } from '@/components/ads/SidebarAd'
import { supabase } from '@/integrations/supabase/client'

interface TrendingSectionProps {
  onHashtagClick: (hashtag: string) => void
  onCategoryFilter: (category: string) => void
}

interface HashtagData {
  tag: string
  count: number
}

interface StatsData {
  activeUsers: number
  openJobs: number
}

const TrendingSection: React.FC<TrendingSectionProps> = ({ 
  onHashtagClick, 
  onCategoryFilter 
}) => {
  const [trendingHashtags, setTrendingHashtags] = useState<HashtagData[]>([])
  const [stats, setStats] = useState<StatsData>({ activeUsers: 0, openJobs: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTrendingData = async () => {
      setLoading(true)
      try {
        // Fetch posts with hashtags and extract them
        const { data: posts, error: postsError } = await supabase
          .from('posts')
          .select('content')
          .not('content', 'is', null)
          .order('created_at', { ascending: false })
          .limit(500)

        if (!postsError && posts) {
          // Extract hashtags from post content
          const hashtagCounts: Record<string, number> = {}
          
          posts.forEach(post => {
            if (post.content) {
              const matches = post.content.match(/#[A-Za-z0-9_]+/g)
              if (matches) {
                matches.forEach((tag: string) => {
                  const normalizedTag = tag.toLowerCase()
                  hashtagCounts[normalizedTag] = (hashtagCounts[normalizedTag] || 0) + 1
                })
              }
            }
          })

          // Convert to array and sort by count
          const sortedHashtags = Object.entries(hashtagCounts)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 8) // Top 8 hashtags

          // If we have real data, use it; otherwise use defaults
          if (sortedHashtags.length > 0) {
            setTrendingHashtags(sortedHashtags)
          } else {
            // Default hashtags when no posts with hashtags exist
            setTrendingHashtags([
              { tag: '#NaijaLancers', count: 0 },
              { tag: '#FreelanceLife', count: 0 },
              { tag: '#TechJobs', count: 0 },
              { tag: '#RemoteWork', count: 0 },
              { tag: '#WebDevelopment', count: 0 },
              { tag: '#GraphicDesign', count: 0 }
            ])
          }
        }

        // Fetch active users count (logged in within 24 hours)
        const twentyFourHoursAgo = new Date()
        twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)
        
        const { count: activeUsersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', twentyFourHoursAgo.toISOString())

        // Fetch open jobs count
        const { count: openJobsCount } = await supabase
          .from('job_posts')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'open')

        setStats({
          activeUsers: activeUsersCount || 0,
          openJobs: openJobsCount || 0
        })

      } catch (error) {
        console.error('Error fetching trending data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchTrendingData()

    // No auto-refresh - data fetched once on mount to reduce API calls
  }, [])

  const trendingTopics = [
    { title: 'Remote Work Opportunities', icon: Briefcase, count: 45, type: 'jobs' },
    { title: 'UI/UX Design Projects', icon: Briefcase, count: 32, type: 'jobs' },
    { title: 'Achievement Stories', icon: Award, count: 28, type: 'achievements' },
    { title: 'Networking Events', icon: Users, count: 19, type: 'events' }
  ]

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}k`
    }
    return count.toString()
  }

  return (
    <div className="space-y-4">
      {/* Trending Hashtags */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary" />
            Trending Hashtags
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            trendingHashtags.map((item) => (
              <Button
                key={item.tag}
                variant="ghost"
                className="w-full justify-between p-3 h-auto hover:bg-primary/10"
                onClick={() => onHashtagClick(item.tag)}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">{item.tag}</span>
                </div>
                <Badge variant="secondary" className="bg-muted text-text-secondary">
                  {item.count > 0 ? `${item.count} posts` : 'New'}
                </Badge>
              </Button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Trending Topics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Popular Topics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {trendingTopics.map((topic) => (
            <Button
              key={topic.title}
              variant="ghost"
              className="w-full justify-between p-3 h-auto hover:bg-primary/10"
              onClick={() => onCategoryFilter(topic.type)}
            >
              <div className="flex items-center gap-3">
                <topic.icon className="h-4 w-4 text-primary" />
                <span className="font-medium">{topic.title}</span>
              </div>
              <div className="flex items-center gap-1 text-sm text-text-secondary">
                <Eye className="h-3 w-3" />
                {topic.count}
              </div>
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Quick Stats - Real data */}
      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{formatCount(stats.activeUsers)}</div>
                <div className="text-sm text-muted-foreground">Active Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">{formatCount(stats.openJobs)}</div>
                <div className="text-sm text-muted-foreground">Open Jobs</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sidebar Ad */}
      <SidebarAd />
    </div>
  )
}

export default TrendingSection
