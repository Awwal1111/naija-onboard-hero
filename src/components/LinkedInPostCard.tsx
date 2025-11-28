import React, { useState, useEffect, useRef } from 'react'
import { MessageCircle, Share2, ThumbsUp, Eye, MoreVertical, MapPin, Briefcase, Award, Calendar, ExternalLink } from 'lucide-react'
import { EnhancedPost } from '@/hooks/useEnhancedFeed'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import ReactionPicker from './ReactionPicker'
import CommentsSection from './CommentsSection'
import MediaGallery from './MediaGallery'
import PostOptionsMenu from './PostOptionsMenu'
import { usePostViews } from '@/hooks/usePostViews'
import { formatDistanceToNow } from 'date-fns'
import { sanitizeText } from '@/lib/security'

interface LinkedInPostCardProps {
  post: EnhancedPost
  onReact: (postId: string, reactionType: string) => void
  onRemoveReaction: (postId: string) => void
  onComment: (postId: string, content: string) => Promise<{ success?: boolean; error?: string }>
  onJobApply?: (jobPost: EnhancedPost) => void
  onProfileClick?: (userId: string) => void
  currentUserId?: string
}

const LinkedInPostCard: React.FC<LinkedInPostCardProps> = ({
  post,
  onReact,
  onRemoveReaction,
  onComment,
  onJobApply,
  onProfileClick,
  currentUserId
}) => {
  const [showFullText, setShowFullText] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const viewTracked = useRef(false)
  const { trackPostView } = usePostViews()

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

  const contentPreview = post.content?.slice(0, 180) || ''
  const needsTruncation = (post.content?.length || 0) > 180

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/post/${post.id}`
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title || 'Check out this post',
          text: contentPreview,
          url: shareUrl
        })
      } catch (err) {
        console.log('Share cancelled')
      }
    } else {
      navigator.clipboard.writeText(shareUrl)
    }
  }

  const renderContentType = () => {
    switch (post.content_type) {
      case 'job':
        const jobLocation = post.metadata?.job?.location
        const jobBudget = post.metadata?.job?.budget
        return (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mt-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <Briefcase className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{post.title}</h3>
                {jobLocation && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="h-3 w-3" />
                    {jobLocation}
                  </p>
                )}
                {jobBudget && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Budget: {jobBudget}
                  </p>
                )}
              </div>
            </div>
            {onJobApply && (
              <Button onClick={() => onJobApply(post)} className="w-full mt-3">
                Apply Now
              </Button>
            )}
          </div>
        )
      case 'achievement':
        return (
          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mt-3 flex items-center gap-3">
            <Award className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            <div>
              <p className="font-semibold text-foreground">{post.title}</p>
              <p className="text-sm text-muted-foreground">Celebrated an achievement</p>
            </div>
          </div>
        )
      case 'event':
        return (
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 mt-3 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            <div>
              <p className="font-semibold text-foreground">{post.title}</p>
              <p className="text-sm text-muted-foreground">Event announcement</p>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  const renderHashtags = (text: string) => {
    const parts = text.split(/(#\w+)/g)
    return parts.map((part, index) => {
      if (part.startsWith('#')) {
        return (
          <span key={index} className="text-primary font-medium cursor-pointer hover:underline">
            {part}
          </span>
        )
      }
      return part
    })
  }

  return (
    <Card id={`post-${post.id}`} className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 flex items-start justify-between">
          <div 
            className="flex items-start gap-3 flex-1 cursor-pointer"
            onClick={() => onProfileClick?.(post.user_id)}
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.profiles?.profile_picture_url} />
              <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                {post.profiles?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground text-base">
                {post.profiles?.full_name || 'User'}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-1">
                {post.profiles?.profession || 'NaijaLancers Member'}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="px-4 pb-3">
          {post.title && (
            <h2 className="text-lg font-bold text-foreground mb-2">{post.title}</h2>
          )}
          <div className="text-foreground whitespace-pre-wrap">
            {showFullText ? (
              renderHashtags(post.content || '')
            ) : (
              <>
                {renderHashtags(contentPreview)}
                {needsTruncation && '...'}
              </>
            )}
          </div>
          {needsTruncation && (
            <button
              onClick={() => setShowFullText(!showFullText)}
              className="text-primary text-sm font-medium mt-2 hover:underline"
            >
              {showFullText ? 'See less' : 'See more'}
            </button>
          )}
          {renderContentType()}
        </div>

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <MediaGallery media={post.media_urls} />
        )}

        {/* Engagement Stats */}
        <div className="px-4 py-3 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <ThumbsUp className="h-4 w-4" />
              {post.likes_count || 0}
            </span>
            <span>{post.comments_count || 0} comments</span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="h-4 w-4" />
            {post.views_count || 0} views
          </div>
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="px-2 py-2 flex items-center justify-around">
          <div className="flex-1 flex justify-center">
            <ReactionPicker
              currentReaction={post.user_reaction}
              onReact={(reactionType) => onReact(post.id, reactionType)}
              className="w-full"
            />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex-1 gap-2 hover:bg-primary/10"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline">Comment</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="flex-1 gap-2 hover:bg-primary/10"
          >
            <Share2 className="h-5 w-5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <>
            <Separator />
            <div className="p-4">
              <CommentsSection
                postId={post.id}
                isOpen={showComments}
                onClose={() => setShowComments(false)}
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default LinkedInPostCard
