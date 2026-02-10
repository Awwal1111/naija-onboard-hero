import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Eye, Image, Briefcase, FileText, ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

interface ActivityPost {
  id: string
  content: string
  content_type: string
  media_urls: string[] | null
  likes_count: number
  comments_count: number
  views_count: number
  created_at: string
}

interface ProfileActivityFeedProps {
  userId: string
  fullName: string
  profilePicture: string | null
  profession: string | null
}

export const ProfileActivityFeed = ({ userId, fullName, profilePicture, profession }: ProfileActivityFeedProps) => {
  const navigate = useNavigate()
  const [posts, setPosts] = useState<ActivityPost[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const PAGE_SIZE = 5

  const fetchPosts = async (pageNum: number) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('id, content, content_type, media_urls, likes_count, comments_count, views_count, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)

      if (error) throw error
      if (data) {
        if (pageNum === 0) {
          setPosts(data)
        } else {
          setPosts(prev => [...prev, ...data])
        }
        setHasMore(data.length === PAGE_SIZE)
      }
    } catch (error) {
      console.error('Error fetching activity:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    setPage(0)
    setLoading(true)
    fetchPosts(0)
  }, [userId])

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    fetchPosts(nextPage)
  }

  const getContentTypeBadge = (type: string) => {
    switch (type) {
      case 'gig': return { label: 'Gig', icon: Briefcase }
      case 'job': return { label: 'Job', icon: Briefcase }
      case 'article': return { label: 'Article', icon: FileText }
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (posts.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground text-sm">No activity yet</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-3">
      {posts.map(post => {
        const badge = getContentTypeBadge(post.content_type)
        return (
          <Card 
            key={post.id} 
            className="cursor-pointer hover:bg-accent/30 transition-colors"
            onClick={() => navigate(`/feed`)}
          >
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={profilePicture || undefined} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                    {fullName?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground">{fullName}</span>
                    {badge && (
                      <Badge variant="secondary" className="text-xs py-0 h-5">
                        <badge.icon className="h-3 w-3 mr-1" />
                        {badge.label}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {profession && <span>{profession} · </span>}
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-foreground line-clamp-3 mb-3">
                {post.content}
              </p>

              {/* Media thumbnail */}
              {post.media_urls && post.media_urls.length > 0 && (
                <div className="mb-3 rounded-lg overflow-hidden bg-muted h-40">
                  <img 
                    src={post.media_urls[0]} 
                    alt="" 
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
              )}

              {/* Engagement stats */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border">
                <span className="flex items-center gap-1">
                  <Heart className="h-3.5 w-3.5" />
                  {post.likes_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3.5 w-3.5" />
                  {post.comments_count || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" />
                  {post.views_count || 0}
                </span>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {hasMore && (
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={(e) => { e.stopPropagation(); loadMore() }}
        >
          <ChevronDown className="h-4 w-4 mr-2" />
          Load more activity
        </Button>
      )}

      {!hasMore && posts.length > 0 && (
        <p className="text-center text-xs text-muted-foreground py-2">You're all caught up! 🚀</p>
      )}
    </div>
  )
}
