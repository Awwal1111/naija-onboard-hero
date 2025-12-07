import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Share2, Heart, Eye, MoreHorizontal, MapPin, Briefcase, Award, Calendar, Send, Bookmark, BookmarkCheck, Flag, Link2, Copy } from 'lucide-react'
import { EnhancedPost } from '@/hooks/useEnhancedFeed'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import MediaGallery from './MediaGallery'
import { UserBadges } from './UserBadges'
import { usePostViews } from '@/hooks/usePostViews'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

interface LinkedInPostCardProps {
  post: EnhancedPost & { user_saved?: boolean }
  onReact: (postId: string, reactionType: string) => void
  onRemoveReaction: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onJobApply?: (jobPost: EnhancedPost) => void
  onProfileClick?: (userId: string) => void
  onSave?: (postId: string) => void
  currentUserId?: string
}

const LinkedInPostCard: React.FC<LinkedInPostCardProps> = ({
  post,
  onReact,
  onRemoveReaction,
  onComment,
  onJobApply,
  onProfileClick,
  onSave,
  currentUserId
}) => {
  const [showFullText, setShowFullText] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [isLiked, setIsLiked] = useState(!!post.user_reaction)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [isSaved, setIsSaved] = useState(post.user_saved || false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showReportDialog, setShowReportDialog] = useState(false)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [isReporting, setIsReporting] = useState(false)
  const viewTracked = useRef(false)
  const { trackPostView } = usePostViews()
  const { toast } = useToast()

  const isOwnPost = currentUserId === post.user_id

  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isLiked) {
      setIsLiked(false)
      setLikesCount(prev => Math.max(0, prev - 1))
      onRemoveReaction(post.id)
    } else {
      setIsLiked(true)
      setLikesCount(prev => prev + 1)
      onReact(post.id, 'like')
    }
  }

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newSavedState = !isSaved
    setIsSaved(newSavedState)
    onSave?.(post.id)
    toast({
      title: newSavedState ? "Post saved" : "Post unsaved",
      description: newSavedState ? "Added to your saved posts" : "Removed from saved posts"
    })
  }

  const handleCopyLink = (e: React.MouseEvent) => {
    e.stopPropagation()
    const shareUrl = `${window.location.origin}/post/${post.id}`
    navigator.clipboard.writeText(shareUrl)
    toast({
      title: "Link copied",
      description: "Post link copied to clipboard"
    })
  }

  const handleSubmitComment = async () => {
    if (!commentText.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onComment(post.id, commentText.trim())
      setCommentText('')
      setShowCommentInput(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const shareUrl = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Check out this post on NaijaLancers',
          text: post.content?.slice(0, 100),
          url: shareUrl
        })
      } catch (err) {
        // User cancelled or error - copy to clipboard as fallback
        navigator.clipboard.writeText(shareUrl)
        toast({
          title: "Link copied",
          description: "Share link copied to clipboard"
        })
      }
    } else {
      navigator.clipboard.writeText(shareUrl)
      toast({
        title: "Link copied",
        description: "Share link copied to clipboard"
      })
    }
  }

  const handleReport = async () => {
    if (!reportReason || !currentUserId) return
    setIsReporting(true)

    try {
      const { error } = await supabase
        .from('post_reports')
        .insert({
          post_id: post.id,
          reported_by: currentUserId,
          reason: `${reportReason}${reportDetails ? ': ' + reportDetails : ''}`
        })

      if (error) throw error

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe"
      })
      setShowReportDialog(false)
      setReportReason('')
      setReportDetails('')
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsReporting(false)
    }
  }

  // Track post view
  useEffect(() => {
    if (!viewTracked.current && currentUserId) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !viewTracked.current) {
              trackPostView(post.id)
              viewTracked.current = true
            }
          })
        },
        { threshold: 0.5 }
      )

      const element = document.getElementById(`post-${post.id}`)
      if (element) observer.observe(element)

      return () => observer.disconnect()
    }
  }, [post.id, currentUserId])

  const contentPreview = post.content?.slice(0, 200) || ''
  const needsTruncation = (post.content?.length || 0) > 200

  const renderContentType = () => {
    switch (post.content_type) {
      case 'job':
        const jobLocation = post.metadata?.job?.location
        const jobBudget = post.metadata?.job?.budget
        return (
          <div className="mx-4 mb-3 p-4 bg-primary/5 border border-primary/10 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-primary/10 rounded-xl">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground">{post.title}</h3>
                {jobLocation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {jobLocation}
                  </p>
                )}
                {jobBudget && (
                  <p className="text-sm font-medium text-primary mt-1">{jobBudget}</p>
                )}
              </div>
            </div>
            {onJobApply && (
              <Button onClick={() => onJobApply(post)} size="sm" className="w-full mt-3">
                Apply Now
              </Button>
            )}
          </div>
        )
      case 'achievement':
        return (
          <div className="mx-4 mb-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-full">
              <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{post.title}</p>
              <p className="text-sm text-muted-foreground">Achievement unlocked</p>
            </div>
          </div>
        )
      case 'event':
        return (
          <div className="mx-4 mb-3 p-4 bg-purple-500/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-full">
              <Calendar className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{post.title}</p>
              <p className="text-sm text-muted-foreground">Event</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <>
      <article id={`post-${post.id}`} className="bg-card">
        {/* Header */}
        <div className="flex items-center justify-between p-4 pb-3">
          <div 
            className="flex items-center gap-3 flex-1 cursor-pointer"
            onClick={() => onProfileClick?.(post.user_id)}
          >
            <Avatar className="h-11 w-11 ring-2 ring-border">
              <AvatarImage src={post.profiles?.profile_picture_url} />
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {post.profiles?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-semibold text-foreground">
                  {post.profiles?.full_name || 'User'}
                </span>
                <UserBadges 
                  badges={{
                    isExpert: post.profiles?.is_expert,
                    emailVerified: post.profiles?.email_verified,
                    phoneVerified: post.profiles?.phone_verified,
                    faceVerified: post.profiles?.face_verified,
                    averageRating: post.profiles?.average_rating,
                    ratingCount: post.profiles?.rating_count,
                    avgResponseTimeSeconds: post.profiles?.avg_response_time_seconds
                  }}
                  size="sm"
                />
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{post.profiles?.profession || 'Member'}</span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem onClick={handleSave}>
                {isSaved ? <BookmarkCheck className="mr-2 h-4 w-4 text-primary" /> : <Bookmark className="mr-2 h-4 w-4" />}
                {isSaved ? 'Unsave post' : 'Save post'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              {!isOwnPost && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowReportDialog(true)
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Report post
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Content */}
        {post.content && (
          <div className="px-4 pb-3">
            {post.title && !['job', 'achievement', 'event'].includes(post.content_type || '') && (
              <h2 className="text-base font-bold text-foreground mb-1.5">{post.title}</h2>
            )}
            <p className="text-foreground text-[15px] leading-relaxed whitespace-pre-wrap">
              {showFullText ? post.content : contentPreview}
              {needsTruncation && !showFullText && '...'}
            </p>
            {needsTruncation && (
              <button
                onClick={() => setShowFullText(!showFullText)}
                className="text-muted-foreground text-sm font-medium mt-1 hover:text-foreground"
              >
                {showFullText ? 'less' : 'more'}
              </button>
            )}
          </div>
        )}

        {/* Content Type Cards */}
        {renderContentType()}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <MediaGallery media={post.media_urls} />
        )}

        {/* Engagement Stats */}
        <div className="px-4 py-2 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            {likesCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="flex items-center justify-center w-5 h-5 bg-red-500 rounded-full">
                  <Heart className="h-3 w-3 text-white fill-white" />
                </span>
                <span>{likesCount}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            {(post.comments_count || 0) > 0 && (
              <span>{post.comments_count} comments</span>
            )}
            {(post.views_count || 0) > 0 && (
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" />
                {post.views_count}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-2 py-1 border-t border-border flex items-center">
          <button
            onClick={handleLike}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg transition-colors",
              isLiked ? "text-red-500" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Heart className={cn("h-5 w-5", isLiked && "fill-current")} />
            <span className="text-sm font-medium">Like</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowCommentInput(!showCommentInput)
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium">Comment</span>
          </button>

          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-muted-foreground hover:bg-muted transition-colors"
          >
            <Share2 className="h-5 w-5" />
            <span className="text-sm font-medium">Share</span>
          </button>
        </div>

        {/* Quick Comment Input */}
        {showCommentInput && (
          <div className="px-4 py-3 border-t border-border flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">U</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent text-sm outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || isSubmitting}
                className="text-primary disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </article>

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Why are you reporting this post?</Label>
              <RadioGroup value={reportReason} onValueChange={setReportReason} className="mt-2 space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="spam" id="spam" />
                  <Label htmlFor="spam" className="font-normal">Spam or misleading</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="harassment" id="harassment" />
                  <Label htmlFor="harassment" className="font-normal">Harassment or bullying</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hate_speech" id="hate_speech" />
                  <Label htmlFor="hate_speech" className="font-normal">Hate speech</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="inappropriate" id="inappropriate" />
                  <Label htmlFor="inappropriate" className="font-normal">Inappropriate content</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="scam" id="scam" />
                  <Label htmlFor="scam" className="font-normal">Scam or fraud</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="other" id="other" />
                  <Label htmlFor="other" className="font-normal">Other</Label>
                </div>
              </RadioGroup>
            </div>
            <div>
              <Label htmlFor="details" className="text-sm font-medium">Additional details (optional)</Label>
              <Textarea
                id="details"
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Provide more context..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleReport} 
              disabled={!reportReason || isReporting}
              variant="destructive"
            >
              {isReporting ? 'Submitting...' : 'Submit Report'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default LinkedInPostCard