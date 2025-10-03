import React, { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import EnhancedPostCard from './EnhancedPostCard'
import InFeedAd from './InFeedAd'
import { EnhancedPost } from '@/hooks/useEnhancedFeed'

interface InfiniteScrollFeedProps {
  posts: EnhancedPost[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  fetchNextPage: () => void
  onReact: (postId: string, reactionType: string) => void
  onRemoveReaction: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onJobApply?: (jobPost: EnhancedPost) => void
  onProfileClick?: (userId: string) => void
  currentUserId?: string
}

const InfiniteScrollFeed: React.FC<InfiniteScrollFeedProps> = ({
  posts,
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
  onReact,
  onRemoveReaction,
  onComment,
  onJobApply,
  onProfileClick,
  currentUserId
}) => {
  const loadingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0]
        if (target.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      {
        threshold: 1.0,
        rootMargin: '100px'
      }
    )

    if (loadingRef.current) {
      observer.observe(loadingRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  return (
    <div className="space-y-6">
      {posts.map((post, index) => (
        <React.Fragment key={`post-${post.id}-${index}`}>
          {/* Insert ad every 5 posts */}
          {index > 0 && index % 5 === 0 && (
            <InFeedAd index={Math.floor(index / 5)} />
          )}
          
          <div className={`${index === 0 ? 'animate-fade-in' : ''}`}>
            <EnhancedPostCard
              post={post}
              onReact={onReact}
              onRemoveReaction={onRemoveReaction}
              onComment={onComment}
              onJobApply={onJobApply}
              onProfileClick={onProfileClick}
              currentUserId={currentUserId}
            />
          </div>
        </React.Fragment>
      ))}
      
      {hasNextPage && (
        <div ref={loadingRef} className="flex justify-center py-8">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-text-secondary bg-muted/50 rounded-full px-4 py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more posts...</span>
            </div>
          ) : (
            <div className="text-text-secondary text-sm bg-muted/30 rounded-full px-3 py-1">
              Scroll for more posts
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollFeed