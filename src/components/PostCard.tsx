import React, { useState } from 'react'
import { Heart, MessageCircle, Share, Eye, MoreVertical } from 'lucide-react'
import { Post } from '@/hooks/useFeed'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'

interface PostCardProps {
  post: Post
  onLike: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  currentUserId?: string
}

const PostCard: React.FC<PostCardProps> = ({ post, onLike, onComment, currentUserId }) => {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)

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

  return (
    <div className="bg-card border border-border rounded-2xl p-6 mb-4">
      {/* Post Header */}
      <div className="flex items-start gap-4 mb-4">
        <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold shrink-0">
          {post.profiles?.profile_picture_url ? (
            <img 
              src={post.profiles.profile_picture_url} 
              alt={post.profiles.full_name}
              className="w-full h-full object-cover rounded-full"
            />
          ) : (
            post.profiles?.full_name?.charAt(0) || 'U'
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-text-primary truncate">
              {post.profiles?.full_name || 'Anonymous User'}
            </h3>
            <button className="p-1 hover:bg-accent rounded-full">
              <MoreVertical className="h-4 w-4 text-text-secondary" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            {post.profiles?.profession && (
              <span className="text-text-secondary">{post.profiles.profession}</span>
            )}
            {post.content_type !== 'status' && (
              <span className={`font-medium ${getPostTypeColor(post.content_type)}`}>
                {getPostTypeLabel(post.content_type)}
              </span>
            )}
          </div>
          
          <span className="text-xs text-text-secondary">
            {formatTimeAgo(post.created_at)}
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
        <p className="text-text-primary whitespace-pre-wrap">
          {post.content}
        </p>
        
        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            {post.media_urls.map((url, index) => (
              <img 
                key={index}
                src={url} 
                alt={`Post media ${index + 1}`}
                className="w-full h-48 object-cover rounded-xl"
              />
            ))}
          </div>
        )}
      </div>

      {/* Engagement Stats */}
      <div className="flex items-center justify-between py-3 border-t border-b border-border mb-4">
        <div className="flex items-center gap-4 text-sm text-text-secondary">
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            <span>{post.views_count}</span>
          </div>
          <span>{post.likes_count} likes</span>
          <span>{post.comments_count} comments</span>
        </div>
        <span className="text-xs text-text-secondary">
          {post.shares_count} shares
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
            post.user_liked 
              ? 'text-red-500 bg-red-50 hover:bg-red-100' 
              : 'text-text-secondary hover:text-primary hover:bg-primary/10'
          }`}
        >
          <Heart className={`h-5 w-5 ${post.user_liked ? 'fill-current' : ''}`} />
          <span className="font-medium">Like</span>
        </button>
        
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">Comment</span>
        </button>
        
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-colors"
        >
          <Share className="h-5 w-5" />
          <span className="font-medium">Share</span>
        </button>
      </div>

      {/* Comment Section */}
      {showComments && (
        <div className="border-t border-border pt-4">
          <form onSubmit={handleSubmitComment} className="flex gap-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0">
              {currentUserId?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 flex gap-2">
              <BrandInput
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1"
              />
              <BrandButton 
                type="submit" 
                size="sm"
                disabled={!commentText.trim() || submitting}
              >
                Post
              </BrandButton>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default PostCard