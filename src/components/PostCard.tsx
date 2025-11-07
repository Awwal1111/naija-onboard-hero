import React, { useState } from 'react'
import { Heart, MessageCircle, Share, Eye, MoreVertical, Bookmark, Flag, TrendingUp, Award } from 'lucide-react'
import { Post } from '@/hooks/useFeed'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { ExpandableText } from './ExpandableText'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'

interface PostCardProps {
  post: Post
  onLike: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onSave?: (postId: string) => void
  currentUserId?: string
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment, onSave, currentUserId }) => {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [imageLoaded, setImageLoaded] = useState<Record<number, boolean>>({})

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const postTime = new Date(date)
    const diffInHours = Math.floor((now.getTime() - postTime.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const days = Math.floor(diffInHours / 24)
    if (days < 7) return `${days}d ago`
    return postTime.toLocaleDateString()
  }

  const getPostTypeColor = (contentType: string) => {
    switch (contentType) {
      case 'job': return 'text-blue-600'
      case 'expert_approval': return 'text-green-600'
      case 'media': return 'text-purple-600'
      default: return 'text-text-secondary'
    }
  }

  const getPostTypeLabel = (contentType: string) => {
    switch (contentType) {
      case 'job': return '💼 Job Posted'
      case 'expert_approval': return '⭐ New Expert'
      case 'media': return '📸 Media'
      case 'document': return '📄 Document'
      default: return ''
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    setSubmitting(true)
    const result = await onComment(post.id, commentText.trim())
    
    if (result.success) {
      setCommentText('')
    }
    setSubmitting(false)
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || `${post.profiles?.full_name}'s post`,
          text: post.content,
          url: shareUrl
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  const isEngagingPost = (post.likes_count + post.comments_count + post.shares_count) > 50
  const isPopularPost = post.views_count > 100

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 mb-4 hover:shadow-lg transition-all duration-300">
      {/* Trending Badge */}
      {isEngagingPost && (
        <div className="mb-3">
          <Badge variant="secondary" className="gap-1">
            <TrendingUp className="h-3 w-3" />
            <span className="text-xs">Trending</span>
          </Badge>
        </div>
      )}

      {/* Post Header */}
      <div className="flex items-start gap-3 sm:gap-4 mb-4">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-white font-bold shrink-0 ring-2 ring-primary/20">
          {post.profiles?.profile_picture_url ? (
            <img 
              src={post.profiles.profile_picture_url} 
              alt={post.profiles.full_name}
              className="w-full h-full object-cover rounded-full"
              loading="lazy"
            />
          ) : (
            <span className="text-sm sm:text-base">{post.profiles?.full_name?.charAt(0) || 'U'}</span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-text-primary truncate text-sm sm:text-base">
                {post.profiles?.full_name || 'Anonymous User'}
              </h3>
              {post.profiles?.is_expert && (
                <div title="Verified Expert">
                  <Award className="h-4 w-4 text-primary" />
                </div>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-accent rounded-full transition-colors">
                  <MoreVertical className="h-4 w-4 text-text-secondary" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onSave && (
                  <DropdownMenuItem onClick={() => onSave(post.id)}>
                    <Bookmark className={`h-4 w-4 mr-2 ${post.user_saved ? 'fill-current' : ''}`} />
                    {post.user_saved ? 'Unsave' : 'Save'} Post
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Flag className="h-4 w-4 mr-2" />
                  Report Post
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            {post.profiles?.profession && (
              <span className="text-text-secondary truncate">{post.profiles.profession}</span>
            )}
            {post.content_type !== 'status' && (
              <>
                <span className="text-text-secondary">•</span>
                <span className={`font-medium ${getPostTypeColor(post.content_type)}`}>
                  {getPostTypeLabel(post.content_type)}
                </span>
              </>
            )}
          </div>
          
          <span className="text-[10px] sm:text-xs text-text-secondary">
            {formatTimeAgo(post.created_at)}
            {isPopularPost && (
              <>
                <span className="mx-1">•</span>
                <span className="text-primary">Popular</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* Post Content */}
      <div className="mb-4">
        {post.title && (
          <h4 className="text-lg font-semibold text-text-primary mb-2">
            {post.title}
          </h4>
        )}
        <ExpandableText 
          text={post.content} 
          maxLength={300}
          className="text-text-primary"
        />
        
        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className={`mt-4 gap-2 ${
            post.media_urls.length === 1 ? 'grid grid-cols-1' :
            post.media_urls.length === 2 ? 'grid grid-cols-2' :
            'grid grid-cols-2 sm:grid-cols-3'
          }`}>
            {post.media_urls.slice(0, 6).map((url, index) => (
              <div key={index} className="relative overflow-hidden rounded-xl bg-muted group">
                {!imageLoaded[index] && (
                  <div className="absolute inset-0 animate-pulse bg-muted" />
                )}
                <img 
                  src={url} 
                  alt={`Post media ${index + 1}`}
                  className={`w-full h-48 object-cover transition-all duration-300 group-hover:scale-105 ${
                    imageLoaded[index] ? 'opacity-100' : 'opacity-0'
                  }`}
                  loading="lazy"
                  onLoad={() => setImageLoaded(prev => ({ ...prev, [index]: true }))}
                />
                {post.media_urls.length > 6 && index === 5 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-bold text-2xl">
                    +{post.media_urls.length - 6}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center justify-between py-3 border-t border-b border-border mb-4 text-xs sm:text-sm">
        <div className="flex items-center gap-2 sm:gap-4 text-text-secondary">
          <div className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer">
            <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="font-medium">{post.views_count.toLocaleString()}</span>
          </div>
          <button className="flex items-center gap-1 hover:text-red-500 transition-colors">
            <Heart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="font-medium">{post.likes_count.toLocaleString()}</span>
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-1 hover:text-primary transition-colors"
          >
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="font-medium">{post.comments_count.toLocaleString()}</span>
          </button>
        </div>
        <span className="text-xs text-text-secondary">
          {post.shares_count > 0 && `${post.shares_count} shares`}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-2 mb-4">
        <button
          onClick={() => onLike(post.id)}
          className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 text-sm sm:text-base ${
            post.user_liked 
              ? 'text-red-500 bg-red-50 dark:bg-red-950 hover:bg-red-100 dark:hover:bg-red-900 scale-95' 
              : 'text-text-secondary hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950'
          }`}
        >
          <Heart className={`h-4 w-4 sm:h-5 sm:w-5 transition-transform ${post.user_liked ? 'fill-current scale-110' : ''}`} />
          <span className="font-medium hidden sm:inline">Like</span>
        </button>
        
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-all duration-300 text-sm sm:text-base"
        >
          <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium hidden sm:inline">Comment</span>
        </button>
        
        <button
          onClick={handleShare}
          className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-all duration-300 text-sm sm:text-base"
        >
          <Share className="h-4 w-4 sm:h-5 sm:w-5" />
          <span className="font-medium hidden sm:inline">Share</span>
        </button>

        {onSave && (
          <button
            onClick={() => onSave(post.id)}
            className={`flex items-center justify-center gap-1.5 px-2 sm:px-4 py-2 rounded-xl transition-all duration-300 ${
              post.user_saved
                ? 'text-primary bg-primary/10'
                : 'text-text-secondary hover:text-primary hover:bg-primary/10'
            }`}
          >
            <Bookmark className={`h-4 w-4 sm:h-5 sm:w-5 ${post.user_saved ? 'fill-current' : ''}`} />
          </button>
        )}
      </div>

      {/* Comment Section */}
      {showComments && (
        <div className="border-t border-border pt-4 animate-in slide-in-from-top-2">
          <form onSubmit={handleSubmitComment} className="flex gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gradient-to-br from-primary to-primary/70 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0">
              {currentUserId?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 flex gap-2">
              <BrandInput
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 text-sm"
                disabled={submitting}
              />
              <BrandButton 
                type="submit" 
                size="sm"
                disabled={!commentText.trim() || submitting}
                className="px-3 sm:px-4"
              >
                {submitting ? (
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  'Post'
                )}
              </BrandButton>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default PostCard