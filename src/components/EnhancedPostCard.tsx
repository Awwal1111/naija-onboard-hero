import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Share, Eye, MoreVertical, Briefcase, Clock, DollarSign, Users, Award, Calendar, Vote, Hash, MapPin, ExternalLink, ChevronDown, ChevronUp, Bookmark, Flag, Link, Edit, Trash2 } from 'lucide-react'
import { EnhancedPost } from '@/hooks/useEnhancedFeed'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import ReactionPicker from './ReactionPicker'
import CommentsSection from './CommentsSection'
import MediaGallery from './MediaGallery'
import { useToast } from '@/hooks/use-toast'
import { usePostViews } from '@/hooks/usePostViews'
import { sanitizeText } from '@/lib/security'
import PostOptionsMenu from './PostOptionsMenu'
import { supabase } from '@/integrations/supabase/client'

interface EnhancedPostCardProps {
  post: EnhancedPost
  onReact: (postId: string, reactionType: string) => void
  onRemoveReaction: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onJobApply?: (jobPost: EnhancedPost) => void
  onProfileClick?: (userId: string) => void
  currentUserId?: string
}

const EnhancedPostCard: React.FC<EnhancedPostCardProps> = ({ 
  post, 
  onReact,
  onRemoveReaction,
  onComment, 
  onJobApply,
  onProfileClick,
  currentUserId
}) => {
  const [showComments, setShowComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const viewTracked = useRef(false)
  const { toast } = useToast()
  const { trackPostView } = usePostViews()

  // Check if post is saved
  useEffect(() => {
    checkIfSaved()
  }, [post.id, currentUserId])

  const checkIfSaved = async () => {
    if (!currentUserId) return
    
    try {
      const { data, error } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
        .maybeSingle()
      
      if (error && error.code !== 'PGRST116') throw error
      setIsSaved(!!data)
    } catch (error) {
      console.error('Error checking saved status:', error)
    }
  }

  const handleSavePost = async () => {
    if (!currentUserId) {
      toast({
        title: "Login required",
        description: "Please login to save posts",
        variant: "destructive"
      })
      return
    }

    try {
      if (isSaved) {
        // Unsave
        const { error } = await supabase
          .from('saved_posts')
          .delete()
          .eq('user_id', currentUserId)
          .eq('post_id', post.id)
        
        if (error) throw error
        setIsSaved(false)
        toast({
          title: "Post unsaved",
          description: "Removed from your saved posts"
        })
      } else {
        // Save
        const { error } = await supabase
          .from('saved_posts')
          .insert({
            user_id: currentUserId,
            post_id: post.id
          })
        
        if (error) throw error
        setIsSaved(true)
        toast({
          title: "Post saved",
          description: "Added to your saved posts"
        })
      }
    } catch (error: any) {
      console.error('Error saving post:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive"
      })
    }
  }

  // Handler functions for post menu actions
  const handleEditPost = async () => {
    // Navigate to edit page or open edit modal
    window.location.href = `/post/edit/${post.id}`
  }

  const handleDeletePost = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }
    
    try {
      // Don't filter by user_id - RLS handles authorization
      // This allows both post owners AND admins to delete
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id)
      
      if (error) throw error
      
      toast({
        title: "Post Deleted",
        description: "The post has been deleted successfully",
      })
      
      // Reload the page to reflect changes
      window.location.reload()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete post. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleReportPost = async () => {
    const reason = prompt('Please provide a reason for reporting this post:')
    if (!reason) return
    
    try {
      const { error } = await supabase
        .from('post_reports')
        .insert({
          post_id: post.id,
          reported_by: currentUserId,
          reason: reason.trim()
        })
      
      if (error) throw error
      
      toast({
        title: "Post Reported",
        description: "Thank you for reporting. We'll review this content.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      })
    }
  }

  const handleCopyLink = () => {
    const postUrl = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(postUrl)
    toast({
      title: "Link Copied",
      description: "Post link copied to clipboard",
    })
  }

  // Track post view when 50% of post is visible using IntersectionObserver
  useEffect(() => {
    if (!viewTracked.current && currentUserId && post.id) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !viewTracked.current) {
              trackPostView(post.id)
              viewTracked.current = true
              observer.disconnect()
            }
          })
        },
        { threshold: 0.5 } // Track when 50% of post is visible
      )

      const element = document.getElementById(`post-${post.id}`)
      if (element) {
        observer.observe(element)
      }

      return () => observer.disconnect()
    }
  }, [post.id, currentUserId, trackPostView])

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
      case 'gig':
        return { 
          icon: Briefcase, 
          label: 'SERVICE / GIG', 
          color: 'bg-blue-600 text-white',
          borderColor: 'border-blue-600/30 shadow-sm shadow-blue-600/10'
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
    <div className="space-y-4">
      <p className="text-foreground whitespace-pre-wrap leading-relaxed text-base">
        {renderContentWithHashtags(isExpanded ? content : truncatedContent)}
      </p>
      
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-base font-medium text-primary hover:text-primary/80 transition-colors"
      >
        {isExpanded ? (
          <>
            <span>Show Less</span>
            <ChevronUp className="h-5 w-5" />
          </>
        ) : (
          <>
            <span>Read More</span>
            <ChevronDown className="h-5 w-5" />
          </>
        )}
      </button>
    </div>
    )
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
    <Card id={`post-${post.id}`} className={`mb-6 overflow-hidden ${postTypeInfo?.borderColor || ''} transition-all duration-300 hover:shadow-lg`}>
      <CardContent className="p-6">
        {/* Privacy indicator */}
        {post.visibility !== 'public' && (
          <div className="mb-4">
            <Badge variant="outline" className="text-sm px-3 py-1">
              <Users className="h-4 w-4 mr-2" />
              {post.visibility === 'connections' ? 'Connections only' : 'Private'}
            </Badge>
          </div>
        )}

        {/* Post Type Badge */}
        {postTypeInfo && (
          <div className="mb-4">
            <Badge className={`${postTypeInfo.color} text-sm px-3 py-1.5`}>
              <postTypeInfo.icon className="h-5 w-5 mr-2" />
              {postTypeInfo.label}
            </Badge>
          </div>
        )}

        {/* Post Header */}
        <div className="flex items-start gap-4 mb-5">
          <button onClick={() => onProfileClick?.(post.user_id)}>
            <Avatar className="h-14 w-14 hover:ring-2 hover:ring-primary/50 transition-all">
              <AvatarImage src={post.profiles?.profile_picture_url} />
              <AvatarFallback className="text-base font-semibold">
                {post.profiles?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </button>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <button 
                onClick={() => onProfileClick?.(post.user_id)}
                className="font-semibold text-foreground truncate hover:text-primary transition-colors text-lg"
              >
                {post.profiles?.full_name || 'Anonymous User'}
              </button>
              <PostOptionsMenu
                isOwnPost={isOwnPost}
                postId={post.id}
                isSaved={isSaved}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onSave={handleSavePost}
                onReport={handleReportPost}
                onCopyLink={handleCopyLink}
              />
            </div>
            
            {post.profiles?.profession && (
              <p className="text-muted-foreground text-base mb-1">
                {post.profiles.profession}
              </p>
            )}
            
            <span className="text-sm text-muted-foreground">
              {formatTimeAgo(post.created_at)}
            </span>
          </div>
        </div>

        {/* Post Content */}
        <div className="mb-5">
          {post.title && (
            <h4 className="text-xl font-bold text-foreground mb-3">
              {post.title}
            </h4>
          )}
          <PostContent content={post.content} renderContentWithHashtags={renderContentWithHashtags} />
        </div>

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="mb-5">
            <MediaGallery media={post.media_urls} />
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center justify-between py-4 border-t border-b border-border mb-4">
          <div className="flex items-center gap-6 text-base">
            {getTotalReactions() > 0 && (
              <button className="text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 px-3 py-2 rounded-lg font-medium">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {getTopReactions().map(([reaction], index) => (
                      <span key={reaction} className="text-base">
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
              className="text-muted-foreground hover:text-primary transition-colors hover:bg-primary/10 px-3 py-2 rounded-lg font-medium"
            >
              {post.comments_count || 0} comments
            </button>
          </div>
          
          <button 
            onClick={handleShare}
            className="text-[10px] sm:text-xs text-text-secondary hover:text-primary transition-colors hover:bg-primary/10 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-lg whitespace-nowrap"
          >
            {post.shares_count || 0} shares
          </button>
        </div>

        {/* Action Buttons */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center justify-center gap-1.5 sm:gap-3 py-1.5 sm:py-2">
            <ReactionPicker 
              onReact={handleReaction}
              currentReaction={post.user_reaction}
            />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowComments(!showComments)}
              className="text-text-secondary hover:text-primary hover:bg-primary/10 flex-1 max-w-[100px] sm:max-w-[140px] h-8 sm:h-9 px-2 sm:px-3"
            >
              <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs sm:text-sm">Comment</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="text-text-secondary hover:text-primary hover:bg-primary/10 flex-1 max-w-[100px] sm:max-w-[140px] h-8 sm:h-9 px-2 sm:px-3"
            >
              <Share className="h-3.5 w-3.5 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline text-xs sm:text-sm">Share</span>
            </Button>
          </div>
          
          <div className="flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm text-text-secondary mt-1.5 sm:mt-2">
            <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{post.views_count || 0} views</span>
          </div>
        </div>

        {/* Comment Section */}
        <CommentsSection 
          postId={post.id} 
          isOpen={showComments} 
          onClose={() => setShowComments(false)} 
        />
      </CardContent>
    </Card>
  )
}

export default EnhancedPostCard