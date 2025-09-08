import React from 'react'
import { TrendingUp, Hash, Users, Briefcase, Award, Eye } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface TrendingSectionProps {
  onHashtagClick: (hashtag: string) => void
  onCategoryFilter: (category: string) => void
}

const TrendingSection: React.FC<TrendingSectionProps> = ({ 
  onHashtagClick, 
  onCategoryFilter 
}) => {
  const trendingHashtags = [
    { tag: '#NaijaLancers', count: 234 },
    { tag: '#FreelanceLife', count: 189 },
    { tag: '#TechJobs', count: 156 },
    { tag: '#RemoteWork', count: 134 },
    { tag: '#WebDevelopment', count: 112 },
    { tag: '#GraphicDesign', count: 98 }
  ]

  const trendingTopics = [
    { title: 'Remote Work Opportunities', icon: Briefcase, count: 45, type: 'jobs' },
    { title: 'UI/UX Design Projects', icon: Briefcase, count: 32, type: 'jobs' },
    { title: 'Achievement Stories', icon: Award, count: 28, type: 'achievements' },
    { title: 'Networking Events', icon: Users, count: 19, type: 'events' }
  ]

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
          {trendingHashtags.map((item) => (
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
                {item.count} posts
              </Badge>
            </Button>
          ))}
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

      {/* Quick Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary">1.2k</div>
              <div className="text-sm text-text-secondary">Active Users</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary">486</div>
              <div className="text-sm text-text-secondary">Open Jobs</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TrendingSection