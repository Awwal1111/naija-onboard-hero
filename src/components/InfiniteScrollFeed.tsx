import React, { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import EnhancedPostCard from './EnhancedPostCard'
import InFeedAd from './InFeedAd'
import PeopleYouMayKnow from './PeopleYouMayKnow'
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
    <div className="space-y-3 sm:space-y-6">
      {posts.map((post, index) => (
        <React.Fragment key={`post-${post.id}-${index}`}>
          {/* Insert "People You May Know" only once at the second block (after first post) */}
          {index === 1 && (
            <PeopleYouMayKnow onProfileClick={onProfileClick} />
          )}
          
          {/* Insert ad at positions 3, 5, and every 7 posts after that */}
          {(index === 2 || index === 4 || (index > 4 && (index - 4) % 7 === 0)) && (
            <InFeedAd index={index} />
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
        <div ref={loadingRef} className="flex justify-center py-4 sm:py-8">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-text-secondary bg-muted/50 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 animate-spin" />
              <span>Loading more...</span>
            </div>
          ) : (
            <div className="text-text-secondary text-xs sm:text-sm bg-muted/30 rounded-full px-2.5 sm:px-3 py-0.5 sm:py-1">
              Scroll for more
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default InfiniteScrollFeed