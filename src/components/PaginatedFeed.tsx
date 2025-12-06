import React, { useState, useMemo } from 'react'
import { Loader2 } from 'lucide-react'
import LinkedInPostCard from './LinkedInPostCard'
import { EnhancedPost } from '@/hooks/useEnhancedFeed'
import { Button } from '@/components/ui/button'

interface PaginatedFeedProps {
  posts: EnhancedPost[]
  onReact: (postId: string, reactionType: string) => void
  onRemoveReaction: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onJobApply?: (jobPost: EnhancedPost) => void
  onProfileClick?: (userId: string) => void
  onSave?: (postId: string) => void
  currentUserId?: string
}

const POSTS_PER_PAGE = 10

const PaginatedFeed: React.FC<PaginatedFeedProps> = ({
  posts,
  onReact,
  onRemoveReaction,
  onComment,
  onJobApply,
  onProfileClick,
  onSave,
  currentUserId
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  const displayedPosts = useMemo(() => {
    return posts.slice(0, currentPage * POSTS_PER_PAGE)
  }, [posts, currentPage])

  const hasMore = displayedPosts.length < posts.length
  const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE)

  const handleLoadMore = () => {
    setIsLoadingMore(true)
    // Simulate loading for smooth UX
    setTimeout(() => {
      setCurrentPage(prev => prev + 1)
      setIsLoadingMore(false)
    }, 300)
  }

  return (
    <div className="space-y-4">
      {displayedPosts.map((post) => (
        <LinkedInPostCard
          key={post.id}
          post={post}
          onReact={onReact}
          onRemoveReaction={onRemoveReaction}
          onComment={onComment}
          onJobApply={onJobApply}
          onProfileClick={onProfileClick}
          onSave={onSave}
          currentUserId={currentUserId}
        />
      ))}
      
      {hasMore && (
        <div className="flex flex-col items-center gap-4 py-8">
          <Button
            onClick={handleLoadMore}
            disabled={isLoadingMore}
            size="lg"
            className="px-8"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              `Load More Posts (${displayedPosts.length}/${posts.length})`
            )}
          </Button>
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}

      {!hasMore && posts.length > 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 bg-muted rounded-full">
            <span className="text-lg">🚀</span>
            <span className="text-base font-medium text-foreground">You're all caught up!</span>
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            You've seen all posts. Check back later for more updates.
          </p>
        </div>
      )}

      {posts.length === 0 && (
        <div className="text-center py-16">
          <p className="text-base text-muted-foreground">No posts to display yet.</p>
          <p className="text-sm text-muted-foreground mt-2">Be the first to share something!</p>
        </div>
      )}
    </div>
  )
}

export default PaginatedFeed
