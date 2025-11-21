import React, { useState, useEffect } from 'react'
import { MessageCircle, Heart, Reply, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useEnhancedFeed, Comment } from '@/hooks/useEnhancedFeed'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import ProfilePreview from '@/components/ProfilePreview'

interface CommentsSectionProps {
  postId: string
  isOpen: boolean
  onClose: () => void
}

const CommentsSection: React.FC<CommentsSectionProps> = ({
  postId,
  isOpen,
  onClose
}) => {
  const { user } = useAuth()
  const { getPostComments, addComment } = useEnhancedFeed()
  const { toast } = useToast()
  const [comments, setComments] = useState<Comment[]>([])
  const [loading, setLoading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [profilePreview, setProfilePreview] = useState<{ isOpen: boolean; userId: string | null }>({ isOpen: false, userId: null })

  const loadComments = async () => {
    if (!isOpen) return
    
    setLoading(true)
    const fetchedComments = await getPostComments(postId)
    setComments(fetchedComments)
    setLoading(false)
  }

  useEffect(() => {
    loadComments()
  }, [isOpen, postId])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !user) return

    setSubmitting(true)
    const result = await addComment(postId, newComment.trim())
    
    if (result.success) {
      setNewComment('')
      await loadComments()
    }
    setSubmitting(false)
  }

  const handleSubmitReply = async (e: React.FormEvent, parentId: string) => {
    e.preventDefault()
    if (!replyText.trim() || !user) return

    setSubmitting(true)
    const result = await addComment(postId, replyText.trim(), parentId)
    
    if (result.success) {
      setReplyText('')
      setReplyingTo(null)
      await loadComments()
    }
    setSubmitting(false)
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) return
    
    try {
      // Toggle like on comment (simplified - you might want to create a separate table)
      toast({
        title: "Feature coming soon",
        description: "Comment likes will be available soon!",
      })
    } catch (error) {
      console.error('Error liking comment:', error)
    }
  }

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const commentTime = new Date(date)
    const diffInHours = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const days = Math.floor(diffInHours / 24)
    if (days < 7) return `${days}d ago`
    return commentTime.toLocaleDateString()
  }

  if (!isOpen) return null

  return (
    <div className="border-t border-border pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-text-primary">Comments</h4>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <MessageCircle className="h-4 w-4" />
        </Button>
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmitComment} className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-sm">
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <Textarea
            placeholder="Write a comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={2}
            className="resize-none mb-2"
          />
          <Button 
            type="submit" 
            size="sm" 
            disabled={!newComment.trim() || submitting}
            className="ml-auto block"
          >
            {submitting ? 'Posting...' : 'Comment'}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4 max-h-96 overflow-y-auto">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-text-secondary">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Main Comment */}
              <div className="flex gap-3">
                <Avatar 
                  className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setProfilePreview({ isOpen: true, userId: comment.user_id })}
                >
                  <AvatarImage src={comment.profiles?.profile_picture_url} />
                  <AvatarFallback className="text-sm">
                    {comment.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="bg-muted rounded-xl px-3 py-2">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="font-semibold text-sm text-text-primary cursor-pointer hover:text-primary transition-colors"
                        onClick={() => setProfilePreview({ isOpen: true, userId: comment.user_id })}
                      >
                        {comment.profiles?.full_name || 'Anonymous'}
                      </span>
                      <span className="text-xs text-text-secondary">
                        {formatTimeAgo(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary whitespace-pre-wrap">
                      {comment.content}
                    </p>
                  </div>
                  
                  {/* Comment Actions */}
                  <div className="flex items-center gap-4 mt-2 px-3">
                    <button
                      onClick={() => handleLikeComment(comment.id)}
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                    >
                      <Heart className="h-3 w-3" />
                      <span>Like</span>
                    </button>
                    
                    <button
                      onClick={() => setReplyingTo(comment.id)}
                      className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                    >
                      <Reply className="h-3 w-3" />
                      <span>Reply</span>
                    </button>

                    {comment.user_id === user?.id && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="text-xs text-text-secondary hover:text-primary transition-colors">
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="text-destructive">
                            Delete Comment
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="ml-11 flex gap-3">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <form onSubmit={(e) => handleSubmitReply(e, comment.id)}>
                      <Textarea
                        placeholder={`Reply to ${comment.profiles?.full_name}...`}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        rows={2}
                        className="resize-none mb-2 text-sm"
                      />
                      <div className="flex gap-2">
                        <Button 
                          type="submit" 
                          size="sm" 
                          disabled={!replyText.trim() || submitting}
                        >
                          {submitting ? 'Replying...' : 'Reply'}
                        </Button>
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm" 
                          onClick={() => {
                            setReplyingTo(null)
                            setReplyText('')
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 space-y-3">
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className="flex gap-3">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={reply.profiles?.profile_picture_url} />
                        <AvatarFallback className="text-xs">
                          {reply.profiles?.full_name?.charAt(0) || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="bg-muted rounded-xl px-3 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-xs text-text-primary">
                              {reply.profiles?.full_name || 'Anonymous'}
                            </span>
                            <span className="text-xs text-text-secondary">
                              {formatTimeAgo(reply.created_at)}
                            </span>
                          </div>
                          <p className="text-xs text-text-primary whitespace-pre-wrap">
                            {reply.content}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 px-3">
                          <button
                            onClick={() => handleLikeComment(reply.id)}
                            className="flex items-center gap-1 text-xs text-text-secondary hover:text-primary transition-colors"
                          >
                            <Heart className="h-3 w-3" />
                            <span>Like</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Profile Preview Dialog */}
      <ProfilePreview
        isOpen={profilePreview.isOpen}
        onClose={() => setProfilePreview({ isOpen: false, userId: null })}
        profileId={profilePreview.userId || ''}
      />
    </div>
  )
}

export default CommentsSection