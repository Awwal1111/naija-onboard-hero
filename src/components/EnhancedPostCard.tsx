import React, { useState } from 'react'
import { MessageCircle, Share, Eye, MoreVertical, UserPlus, Briefcase, Clock, DollarSign, Users, Award, Calendar, Vote, Hash, MapPin, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
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
  const isAchievement = post.content_type === 'achievement'
  const isEvent = post.content_type === 'event'
  const isPoll = post.content_type === 'poll'
  const isOwnPost = post.user_id === currentUserId

  const getPostTypeInfo = () => {
    switch (post.content_type) {
      case 'job':
        return { 
          icon: Briefcase, 
          label: 'HIRING - JOB POST', 
          color: 'bg-primary text-primary-foreground',
          borderColor: 'border-primary/30 shadow-sm shadow-primary/10'
        }
      case 'achievement':
        return { 
          icon: Award, 
          label: 'ACHIEVEMENT', 
          color: 'bg-yellow-500 text-white',
          borderColor: 'border-yellow-500/30 shadow-sm shadow-yellow-500/10'
        }
      case 'event':
        return { 
          icon: Calendar, 
          label: 'EVENT', 
          color: 'bg-green-500 text-white',
          borderColor: 'border-green-500/30 shadow-sm shadow-green-500/10'
        }
      case 'poll':
        return { 
          icon: Vote, 
          label: 'POLL', 
          color: 'bg-purple-500 text-white',
          borderColor: 'border-purple-500/30 shadow-sm shadow-purple-500/10'
        }
      default:
        return null
    }
  }

  const postTypeInfo = getPostTypeInfo()

  // Extract hashtags from content
  const extractHashtags = (text: string) => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g
    return text.match(hashtagRegex) || []
  }

  const renderContentWithHashtags = (text: string) => {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g
    const parts = text.split(hashtagRegex)
    const hashtags = text.match(hashtagRegex) || []
    
    return parts.map((part, index) => (
      <React.Fragment key={index}>
        {part}
        {hashtags[index] && (
          <span className="text-primary font-medium cursor-pointer hover:text-primary/80">
            {hashtags[index]}
          </span>
        )}
      </React.Fragment>
    ))
  }

  // Post content component with read more/less functionality
  const PostContent = ({ content, renderContentWithHashtags }: { content: string, renderContentWithHashtags: (text: string) => React.ReactNode }) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const maxLength = 200
    const shouldTruncate = content.length > maxLength
    
    if (!shouldTruncate) {
      return (
        <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
          {renderContentWithHashtags(content)}
        </p>
      )
    }
    
    const truncatedContent = content.substring(0, maxLength) + '...'
    
    return (
      <div className="space-y-2">
        <p className="text-text-primary whitespace-pre-wrap leading-relaxed">
          {renderContentWithHashtags(isExpanded ? content : truncatedContent)}
        </p>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        >
          {isExpanded ? (
            <>
              <span>Show Less</span>
              <ChevronUp className="h-4 w-4" />
            </>
          ) : (
            <>
              <span>Read More</span>
              <ChevronDown className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    )
  }

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
    <Card className={`mb-4 overflow-hidden ${postTypeInfo?.borderColor || ''} transition-all duration-300 hover:shadow-lg`}>
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

        {/* Post Type Badge */}
        {postTypeInfo && (
          <div className="mb-4">
            <Badge className={postTypeInfo.color}>
              <postTypeInfo.icon className="h-4 w-4 mr-2" />
              {postTypeInfo.label}
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
          <PostContent content={post.content} renderContentWithHashtags={renderContentWithHashtags} />
          
          {/* Event details */}
          {isEvent && post.metadata?.event && (
            <div className="mt-3 p-3 bg-muted rounded-xl space-y-2">
              {post.metadata.event.date && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{new Date(post.metadata.event.date).toLocaleDateString()}</span>
                </div>
              )}
              {post.metadata.event.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{post.metadata.event.location}</span>
                </div>
              )}
              {post.metadata.event.link && (
                <div className="flex items-center gap-2 text-sm">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <a href={post.metadata.event.link} target="_blank" rel="noopener noreferrer" 
                     className="text-primary hover:text-primary/80">
                    Event Link
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Job details */}
          {isJobPost && post.metadata?.job && (
            <div className="mt-3 p-3 bg-muted rounded-xl space-y-2">
              {post.metadata.job.budget && (
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span>{post.metadata.job.budget}</span>
                </div>
              )}
              {post.metadata.job.location && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{post.metadata.job.location}</span>
                </div>
              )}
              {post.metadata.job.deadline && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>Apply by {new Date(post.metadata.job.deadline).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          )}

          {/* Poll options */}
          {isPoll && post.metadata?.poll && (
            <div className="mt-3 space-y-2">
              {post.metadata.poll.options?.map((option: any, index: number) => (
                <button
                  key={index}
                  className="w-full p-3 text-left bg-muted hover:bg-accent rounded-xl transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span>{option.text}</span>
                    <span className="text-sm text-text-secondary">{option.votes || 0} votes</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Achievement details */}
          {isAchievement && post.metadata?.achievement && (
            <div className="mt-3 p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/30 dark:to-orange-950/30 rounded-xl border border-yellow-200 dark:border-yellow-800">
              <div className="flex items-center gap-2 text-sm font-medium text-yellow-800 dark:text-yellow-200">
                <Award className="h-4 w-4" />
                <span>{post.metadata.achievement.type || 'Achievement Unlocked!'}</span>
              </div>
              {post.metadata.achievement.description && (
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  {post.metadata.achievement.description}
                </p>
              )}
            </div>
          )}
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
              <div className="flex-1">
                <Textarea
                  placeholder="Write a comment..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  rows={2}
                  className="resize-none mb-2"
                />
                <Button 
                  type="submit" 
                  size="sm" 
                  disabled={!commentText.trim() || submitting}
                  className="ml-auto block"
                >
                  {submitting ? 'Posting...' : 'Comment'}
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