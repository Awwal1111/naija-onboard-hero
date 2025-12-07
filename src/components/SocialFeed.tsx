import React, { useState, useRef, useCallback } from 'react'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import SocialPostCard from './SocialPostCard'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Post {
  id: string
  user_id: string
  content: string
  title?: string
  content_type?: string
  media_urls?: string[]
  likes_count: number
  comments_count: number
  shares_count: number
  views_count?: number
  created_at: string
  user_liked?: boolean
  profiles?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
    location?: string
    is_expert?: boolean
    email_confirmed?: boolean
    phone_verified?: boolean
    face_verified?: boolean
  }
  metadata?: any
}

interface SocialFeedProps {
  posts: Post[]
  onLike: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onProfileClick?: (userId: string) => void
  currentUserId?: string
  hasMore?: boolean
  isLoadingMore?: boolean
  onLoadMore?: () => void
  onRefresh?: () => void
  isRefreshing?: boolean
}

const SocialFeed: React.FC<SocialFeedProps> = ({
  posts,
  onLike,
  onComment,
  onProfileClick,
  currentUserId,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  onRefresh,
  isRefreshing = false
}) => {
  const [visibleCount, setVisibleCount] = useState(10)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const handleLoadMore = () => {
    if (onLoadMore) {
      onLoadMore()
    } else {
      setVisibleCount(prev => prev + 10)
    }
  }

  const visiblePosts = onLoadMore ? posts : posts.slice(0, visibleCount)
  const canLoadMore = onLoadMore ? hasMore : visibleCount < posts.length

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
          <Sparkles className="h-10 w-10 text-muted-foreground" />
        </div>
        <h3 className="text-xl font-semibold text-foreground mb-2">
          No posts yet
        </h3>
        <p className="text-muted-foreground text-center max-w-sm">
          Be the first to share something with the community. Your posts will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {/* Refresh Indicator */}
      {isRefreshing && (
        <div className="flex items-center justify-center py-4 border-b border-border">
          <RefreshCw className="h-5 w-5 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Refreshing...</span>
        </div>
      )}

      {/* Posts */}
      {visiblePosts.map((post) => (
        <SocialPostCard
          key={post.id}
          post={post}
          onLike={onLike}
          onComment={onComment}
          onProfileClick={onProfileClick}
          currentUserId={currentUserId}
        />
      ))}

      {/* Load More */}
      {canLoadMore && (
        <div ref={loadMoreRef} className="py-6 flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            className="w-full max-w-xs"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more posts'
            )}
          </Button>
        </div>
      )}

      {/* End of Feed */}
      {!canLoadMore && posts.length > 0 && (
        <div className="py-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
            <span className="text-lg">✨</span>
            <span className="text-sm font-medium text-muted-foreground">
              You're all caught up!
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SocialFeed
