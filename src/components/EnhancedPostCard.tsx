import React, { useState } from 'react'
import { Heart, MessageCircle, Share, Eye, MoreVertical, UserPlus, Briefcase, Clock, DollarSign } from 'lucide-react'
import { Post } from '@/hooks/useFeed'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface EnhancedPostCardProps {
  post: Post
  onLike: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onConnect?: (userId: string) => void
  currentUserId?: string
  isConnected?: boolean
}

const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({ 
  post, 
  onLike, 
  onComment, 
  onConnect, 
  currentUserId,
  isConnected = false
}) => {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [connectingTo, setConnectingTo] = useState<string | null>(null)
  const { toast } = useToast()

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

  const isJobPost = post.content_type === 'job'
  const isOwnPost = post.user_id === currentUserId

  const handleConnect = async () => {
    if (!currentUserId || isConnected || connectingTo) return
    
    setConnectingTo(post.user_id)
    
    try {
      const { error } = await supabase
        .from('connection_requests')
        .insert({
          requester_id: currentUserId,
          requested_id: post.user_id
        })

      if (error) {
        toast({
          title: "Connection failed",
          description: error.message,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Connection request sent!",
          description: `Your connection request has been sent to ${post.profiles?.full_name}.`,
        })
        if (onConnect) {
          onConnect(post.user_id)
        }
      }
    } catch (error) {
      console.error('Connection error:', error)
      toast({
        title: "Connection failed",
        description: "Failed to send connection request. Please try again.",
        variant: "destructive",
      })
    } finally {
      setConnectingTo(null)
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

  const extractJobMetadata = () => {
    const metadata = post.metadata || {}
    return {
      budget: metadata.budget || 'Budget not specified',
      deadline: metadata.deadline,
      applications: metadata.applications || 0
    }
  }

  const jobData = isJobPost ? extractJobMetadata() : null

  return (
    <div className={`bg-card border rounded-2xl p-6 mb-4 ${
      isJobPost ? 'border-primary/30 shadow-lg shadow-primary/10' : 'border-border'
    }`}>
      {/* Job Badge */}
      {isJobPost && (
        <div className="mb-4">
          <Badge className="bg-primary text-white px-3 py-1">
            <Briefcase className="h-4 w-4 mr-2" />
            HIRING - JOB POST
          </Badge>
        </div>
      )}

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
          </div>
          
          <span className="text-xs text-text-secondary">
            {formatTimeAgo(post.created_at)}
          </span>
        </div>
      </div>

      {/* Job Post Content */}
      {isJobPost ? (
        <div className="mb-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
          <h4 className="text-xl font-bold text-text-primary mb-3">
            {post.title || 'Job Opportunity'}
          </h4>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="flex items-center gap-2 bg-green-100 dark:bg-green-900/30 px-3 py-2 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-xs text-green-700 dark:text-green-400">Budget</p>
                <p className="font-bold text-green-800 dark:text-green-300">{jobData?.budget}</p>
              </div>
            </div>
            {jobData?.deadline && (
              <div className="flex items-center gap-2 bg-orange-100 dark:bg-orange-900/30 px-3 py-2 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-xs text-orange-700 dark:text-orange-400">Deadline</p>
                  <p className="font-bold text-orange-800 dark:text-orange-300 text-sm">
                    {new Date(jobData.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
            )}
            <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-3 py-2 rounded-lg">
              <UserPlus className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-xs text-blue-700 dark:text-blue-400">Applied</p>
                <p className="font-bold text-blue-800 dark:text-blue-300">
                  {jobData?.applications || 0} people
                </p>
              </div>
            </div>
          </div>
          
          <p className="text-text-primary whitespace-pre-wrap mb-4 leading-relaxed">
            {post.content}
          </p>
          
          <BrandButton className="w-full shadow-lg hover:shadow-xl" size="lg">
            <Briefcase className="h-5 w-5 mr-2" />
            Apply Now - Quick Process
          </BrandButton>
        </div>
      ) : (
        <div className="mb-4">
          {post.title && (
            <h4 className="text-lg font-semibold text-text-primary mb-2">
              {post.title}
            </h4>
          )}
          <p className="text-text-primary whitespace-pre-wrap">
            {post.content}
          </p>
        </div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="mb-4 grid grid-cols-2 gap-2">
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

      {/* Engagement Stats - Now Tappable */}
      <div className="flex items-center justify-between py-3 border-t border-b border-border mb-4">
        <div className="flex items-center gap-4 text-sm">
          <button className="text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.views_count || 0} views</span>
            </div>
          </button>
          <button 
            onClick={() => {
              // TODO: Show likes list modal
              console.log('Show likes list for post:', post.id)
            }}
            className="text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 rounded-lg font-medium"
          >
            {post.likes_count || 0} likes
          </button>
          <button 
            onClick={() => setShowComments(!showComments)}
            className="text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 rounded-lg font-medium"
          >
            {post.comments_count || 0} comments
          </button>
          {isJobPost && (
            <div className="text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg">
              {jobData?.applications || 0} Applied
            </div>
          )}
        </div>
        <button 
          onClick={handleShare}
          className="text-xs text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 rounded-lg"
        >
          {post.shares_count || 0} shares
        </button>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => onLike(post.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all flex-1 justify-center ${
            post.user_liked 
              ? 'text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50' 
              : 'text-text-secondary hover:text-primary hover:bg-primary/10'
          }`}
        >
          <Heart className={`h-5 w-5 ${post.user_liked ? 'fill-current' : ''}`} />
          <span className="font-medium">Like</span>
        </button>
        
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-all flex-1 justify-center"
        >
          <MessageCircle className="h-5 w-5" />
          <span className="font-medium">Comment</span>
        </button>

        {/* Connect Button - Only show for other users */}
        {!isOwnPost && onConnect && (
          <button
            onClick={handleConnect}
            disabled={isConnected || connectingTo === post.user_id}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all flex-1 justify-center ${
              isConnected
                ? 'text-green-600 bg-green-50 dark:bg-green-950/30 cursor-not-allowed'
                : connectingTo === post.user_id
                ? 'text-gray-500 bg-gray-100 dark:bg-gray-900/30 cursor-not-allowed'
                : 'text-primary hover:bg-primary/10'
            }`}
          >
            <UserPlus className="h-5 w-5" />
            <span className="font-medium">
              {isConnected ? 'Connected' : 
               connectingTo === post.user_id ? 'Connecting...' : 'Connect'}
            </span>
          </button>
        )}
        
        <button
          onClick={handleShare}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-text-secondary hover:text-primary hover:bg-primary/10 transition-all flex-1 justify-center"
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

export default EnhancedPostCard