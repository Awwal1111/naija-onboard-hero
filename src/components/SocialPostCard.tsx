import React, { useState, useEffect, useRef } from 'react'
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play, MapPin, Verified, Crown, Star, Zap } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { cn } from '@/lib/utils'

interface Profile {
  full_name: string
  profile_picture_url?: string
  profession?: string
  location?: string
  is_expert?: boolean
  email_confirmed?: boolean
  phone_verified?: boolean
  face_verified?: boolean
}

interface SocialPostCardProps {
  post: {
    id: string
    user_id: string
    content: string
    title?: string
    content_type?: string
    media_urls?: string[]
    likes_count: number
    comments_count: number
    shares_count: number
    views_count?: number
    created_at: string
    user_liked?: boolean
    profiles?: Profile
    metadata?: any
  }
  onLike: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onProfileClick?: (userId: string) => void
  currentUserId?: string
}

const SocialPostCard: React.FC<SocialPostCardProps> = ({
  post,
  onLike,
  onComment,
  onProfileClick,
  currentUserId
}) => {
  const [isLiked, setIsLiked] = useState(post.user_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [isSaved, setIsSaved] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showFullCaption, setShowFullCaption] = useState(false)
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0)
  const { toast } = useToast()
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsLiked(post.user_liked || false)
    setLikesCount(post.likes_count || 0)
  }, [post.user_liked, post.likes_count])

  useEffect(() => {
    checkIfSaved()
  }, [post.id, currentUserId])

  const checkIfSaved = async () => {
    if (!currentUserId) return
    try {
      const { data } = await supabase
        .from('saved_posts')
        .select('id')
        .eq('user_id', currentUserId)
        .eq('post_id', post.id)
        .maybeSingle()
      setIsSaved(!!data)
    } catch (error) {
      console.error('Error checking saved status:', error)
    }
  }

  const handleLike = () => {
    const newLikedState = !isLiked
    setIsLiked(newLikedState)
    setLikesCount(prev => newLikedState ? prev + 1 : prev - 1)
    onLike(post.id)
  }

  const handleDoubleTapLike = () => {
    if (!isLiked) {
      setIsLiked(true)
      setLikesCount(prev => prev + 1)
      onLike(post.id)
    }
  }

  const handleSave = async () => {
    if (!currentUserId) {
      toast({ title: "Login required", variant: "destructive" })
      return
    }

    try {
      if (isSaved) {
        await supabase.from('saved_posts').delete().eq('user_id', currentUserId).eq('post_id', post.id)
        setIsSaved(false)
        toast({ title: "Removed from saved" })
      } else {
        await supabase.from('saved_posts').insert({ user_id: currentUserId, post_id: post.id })
        setIsSaved(true)
        toast({ title: "Saved" })
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    }
  }

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({ title: post.title || 'Check this out', text: post.content?.substring(0, 100), url: shareUrl })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      await navigator.clipboard.writeText(shareUrl)
      toast({ title: "Link copied!" })
    }
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return
    setIsSubmitting(true)
    const result = await onComment(post.id, commentText.trim())
    if (result.success) {
      setCommentText('')
      setShowCommentInput(false)
      toast({ title: "Comment added" })
    }
    setIsSubmitting(false)
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const postTime = new Date(date)
    const diffInSeconds = Math.floor((now.getTime() - postTime.getTime()) / 1000)
    
    if (diffInSeconds < 60) return 'now'
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m`
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h`
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d`
    return postTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isVideo = (url: string) => {
    return url?.includes('.mp4') || url?.includes('.mov') || url?.includes('video')
  }

  const hasMedia = post.media_urls && post.media_urls.length > 0
  const isVerified = post.profiles?.email_confirmed && post.profiles?.phone_verified && post.profiles?.face_verified
  const captionLimit = 150
  const shouldTruncate = post.content?.length > captionLimit

  // Get badges for user
  const getUserBadges = () => {
    const badges: React.ReactNode[] = []
    if (post.profiles?.is_expert) {
      badges.push(<Star key="expert" className="h-3.5 w-3.5 text-yellow-500" />)
    }
    if (isVerified) {
      badges.push(<Verified key="verified" className="h-3.5 w-3.5 text-primary" />)
    }
    return badges
  }

  return (
    <article 
      ref={cardRef}
      className="bg-card border-b border-border"
      onDoubleClick={handleDoubleTapLike}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => onProfileClick?.(post.user_id)}
            className="relative"
          >
            <Avatar className="h-10 w-10 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
              <AvatarImage src={post.profiles?.profile_picture_url} className="object-cover" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
                {post.profiles?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
          </button>
          
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => onProfileClick?.(post.user_id)}
                className="font-semibold text-foreground text-sm hover:opacity-70 transition-opacity"
              >
                {post.profiles?.full_name || 'User'}
              </button>
              {getUserBadges()}
            </div>
            {post.profiles?.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {post.profiles.location}
              </span>
            )}
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={handleSave}>
              <Bookmark className={cn("h-4 w-4 mr-2", isSaved && "fill-current")} />
              {isSaved ? 'Unsave' : 'Save'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleShare}>
              <Send className="h-4 w-4 mr-2" />
              Share
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Report
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content Type Badge */}
      {post.content_type && post.content_type !== 'status' && (
        <div className="px-4 pb-2">
          <Badge variant="secondary" className="text-xs font-medium">
            {post.content_type === 'job' && '💼 Job Post'}
            {post.content_type === 'achievement' && '🏆 Achievement'}
            {post.content_type === 'event' && '📅 Event'}
            {post.content_type === 'poll' && '📊 Poll'}
          </Badge>
        </div>
      )}

      {/* Media Section - Instagram Style */}
      {hasMedia && (
        <div className="relative bg-muted aspect-square overflow-hidden">
          {post.media_urls!.length === 1 ? (
            // Single media - full display
            isVideo(post.media_urls![0]) ? (
              <video
                src={post.media_urls![0]}
                className="w-full h-full object-cover"
                controls
                playsInline
              />
            ) : (
              <img
                src={post.media_urls![0]}
                alt="Post"
                className="w-full h-full object-cover"
                loading="lazy"
              />
            )
          ) : (
            // Multiple media - carousel style
            <>
              {isVideo(post.media_urls![currentMediaIndex]) ? (
                <video
                  src={post.media_urls![currentMediaIndex]}
                  className="w-full h-full object-cover"
                  controls
                  playsInline
                />
              ) : (
                <img
                  src={post.media_urls![currentMediaIndex]}
                  alt={`Post ${currentMediaIndex + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              )}
              
              {/* Carousel Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {post.media_urls!.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMediaIndex(index)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      index === currentMediaIndex 
                        ? "bg-primary w-4" 
                        : "bg-white/60 hover:bg-white/80"
                    )}
                  />
                ))}
              </div>
              
              {/* Navigation arrows for larger screens */}
              {post.media_urls!.length > 1 && (
                <>
                  <button
                    onClick={() => setCurrentMediaIndex(prev => prev === 0 ? post.media_urls!.length - 1 : prev - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity hidden md:flex"
                  >
                    ‹
                  </button>
                  <button
                    onClick={() => setCurrentMediaIndex(prev => (prev + 1) % post.media_urls!.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity hidden md:flex"
                  >
                    ›
                  </button>
                </>
              )}
              
              {/* Media count indicator */}
              <div className="absolute top-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                {currentMediaIndex + 1}/{post.media_urls!.length}
              </div>
            </>
          )}
        </div>
      )}

      {/* Action Buttons - Instagram Style */}
      <div className="px-4 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleLike}
              className="p-1 hover:opacity-70 transition-all active:scale-90"
            >
              <Heart 
                className={cn(
                  "h-6 w-6 transition-all",
                  isLiked 
                    ? "fill-red-500 text-red-500 scale-110" 
                    : "text-foreground"
                )} 
              />
            </button>
            <button 
              onClick={() => setShowCommentInput(!showCommentInput)}
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <MessageCircle className="h-6 w-6" />
            </button>
            <button 
              onClick={handleShare}
              className="p-1 hover:opacity-70 transition-opacity"
            >
              <Send className="h-6 w-6" />
            </button>
          </div>
          <button 
            onClick={handleSave}
            className="p-1 hover:opacity-70 transition-opacity"
          >
            <Bookmark className={cn("h-6 w-6", isSaved && "fill-current")} />
          </button>
        </div>

        {/* Likes Count */}
        {likesCount > 0 && (
          <p className="font-semibold text-sm mb-1">
            {likesCount.toLocaleString()} {likesCount === 1 ? 'like' : 'likes'}
          </p>
        )}

        {/* Caption */}
        {post.content && (
          <div className="mb-2">
            <span className="text-sm">
              <button 
                onClick={() => onProfileClick?.(post.user_id)}
                className="font-semibold mr-1.5 hover:opacity-70"
              >
                {post.profiles?.full_name}
              </button>
              {shouldTruncate && !showFullCaption ? (
                <>
                  {post.content.substring(0, captionLimit)}...
                  <button 
                    onClick={() => setShowFullCaption(true)}
                    className="text-muted-foreground ml-1 hover:text-foreground"
                  >
                    more
                  </button>
                </>
              ) : (
                <span className="whitespace-pre-wrap">{post.content}</span>
              )}
            </span>
          </div>
        )}

        {/* View Comments */}
        {post.comments_count > 0 && (
          <button 
            onClick={() => setShowCommentInput(!showCommentInput)}
            className="text-muted-foreground text-sm mb-1 hover:text-foreground transition-colors"
          >
            View all {post.comments_count} comments
          </button>
        )}

        {/* Comment Input */}
        {showCommentInput && (
          <div className="flex items-center gap-2 py-2 border-t border-border mt-2">
            <input
              type="text"
              placeholder="Add a comment..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={handleSubmitComment}
              disabled={!commentText.trim() || isSubmitting}
              className="text-primary font-semibold text-sm disabled:opacity-50 hover:opacity-70 transition-opacity"
            >
              Post
            </button>
          </div>
        )}

        {/* Timestamp */}
        <p className="text-muted-foreground text-xs uppercase tracking-wide mt-1 pb-3">
          {formatTimeAgo(post.created_at)}
        </p>
      </div>
    </article>
  )
}

export default SocialPostCard
