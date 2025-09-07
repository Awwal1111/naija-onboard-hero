import React, { useState } from 'react'
import { MessageCircle, Share, Eye, MoreVertical, UserPlus, Briefcase, Clock, DollarSign, Users } from 'lucide-react'
import { EnhancedPost } from '@/hooks/useEnhancedFeed'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import ReactionPicker from './ReactionPicker'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { sanitizeText } from '@/lib/security'

interface EnhancedPostCardProps {
  post: EnhancedPost
  onReact: (postId: string, reactionType: string) => void
  onRemoveReaction: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onConnect?: (userId: string) => void
  currentUserId?: string
  isConnected?: boolean
}

const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({ 
  post, 
  onReact,
  onRemoveReaction,
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

  const handleReaction = (reactionType: string) => {
    if (post.user_reaction === reactionType) {
      onRemoveReaction(post.id)
    } else {
      onReact(post.id, reactionType)
    }
  }

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim()) return

    const sanitizedComment = sanitizeText(commentText.trim())
    if (!sanitizedComment.trim()) return

    setSubmitting(true)
    const result = await onComment(post.id, sanitizedComment)
    
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
      toast({
        title: "Link copied!",
        description: "Post link copied to clipboard",
      })
    }
  }

  const getTotalReactions = () => {
    return Object.values(post.reactions_summary || {}).reduce((sum, count) => sum + count, 0)
  }

  const getTopReactions = () => {
    const reactions = post.reactions_summary || {}
    return Object.entries(reactions)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
  }

  return (
    <Card className={`mb-4 overflow-hidden ${
      isJobPost ? 'border-primary/30 shadow-sm shadow-primary/10' : ''
    }`}>
      <CardContent className="p-6">
        {/* Privacy indicator */}
        {post.visibility !== 'public' && (
          <div className="mb-4">
            <Badge variant="outline" className="text-xs">
              <Users className="h-3 w-3 mr-1" />
              {post.visibility === 'connections' ? 'Connections only' : 'Private'}
            </Badge>
          </div>
        )}

        {/* Job Badge */}
        {isJobPost && (
          <div className="mb-4">
            <Badge className="bg-primary text-primary-foreground">
              <Briefcase className="h-4 w-4 mr-2" />
              HIRING - JOB POST
            </Badge>
          </div>
        )}

        {/* Post Header */}
        <div className="flex items-start gap-4 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={post.profiles?.profile_picture_url} />
            <AvatarFallback>
              {post.profiles?.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          
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
        </div>

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

        {/* Engagement Stats */}
        <div className="flex items-center justify-between py-3 border-t border-b border-border mb-4">
          <div className="flex items-center gap-4 text-sm">
            <button className="text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 rounded-lg">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views_count || 0} views</span>
              </div>
            </button>
            
            {getTotalReactions() > 0 && (
              <button className="text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 rounded-lg font-medium">
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {getTopReactions().map(([reaction], index) => (
                      <span key={reaction} className="text-xs">
                        {reaction === 'like' && '👍'}
                        {reaction === 'love' && '❤️'}
                        {reaction === 'laugh' && '😂'}
                        {reaction === 'wow' && '😮'}
                        {reaction === 'sad' && '😢'}
                        {reaction === 'angry' && '😠'}
                        {reaction === 'support' && '🤝'}
                      </span>
                    ))}
                  </div>
                  <span>{getTotalReactions()}</span>
                </div>
              </button>
            )}
            
            <button 
              onClick={() => setShowComments(!showComments)}
              className="text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-2 py-1 rounded-lg font-medium"
            >
              {post.comments_count || 0} comments
            </button>
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
          <ReactionPicker 
            onReact={handleReaction}
            currentReaction={post.user_reaction}
            className="flex-1"
          />
          
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
            <form onSubmit={handleSubmitComment} className="flex gap-3 mb-4">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">
                  {currentUserId?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={2}
                  className="resize-none"
                />
                <Button 
                  type="submit" 
                  size="sm"
                  disabled={!commentText.trim() || submitting}
                >
                  {submitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default EnhancedPostCard