import React, { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import EnhancedPostCard from './EnhancedPostCard'
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
    <div className="space-y-4">
      {posts.map((post) => (
        <EnhancedPostCard
          key={post.id}
          post={post}
          onReact={onReact}
          onRemoveReaction={onRemoveReaction}
          onComment={onComment}
          onJobApply={onJobApply}
          onProfileClick={onProfileClick}
          currentUserId={currentUserId}
        />
      ))}
      
      {hasNextPage && (
        <div ref={loadingRef} className="flex justify-center py-4">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Loading more posts...</span>
            </div>
          ) : (
            <div className="text-text-secondary text-sm">Scroll for more posts</div>
          )}
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollFeed