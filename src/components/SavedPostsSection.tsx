import React, { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Card, CardContent } from '@/components/ui/card'
import { Bookmark, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'

interface SavedPost {
  id: string
  post_id: string
  created_at: string
  posts: {
    id: string
    content: string
    media_urls?: string[]
    created_at: string
    user_id: string
    profiles: {
      full_name: string
      profile_picture_url?: string
    }
  }
}

export const SavedPostsSection = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [savedPosts, setSavedPosts] = useState<SavedPost[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSavedPosts()
  }, [])

  const fetchSavedPosts = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('saved_posts')
        .select(`
          id,
          post_id,
          created_at,
          posts (
            id,
            content,
            media_urls,
            created_at,
            user_id,
            profiles:user_id (
              full_name,
              profile_picture_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedPosts(data || [])
    } catch (error) {
      console.error('Error fetching saved posts:', error)
      toast({
        title: "Error",
        description: "Failed to load saved posts",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleUnsave = async (savedPostId: string) => {
    try {
      const { error } = await supabase
        .from('saved_posts')
        .delete()
        .eq('id', savedPostId)

      if (error) throw error

      setSavedPosts(prev => prev.filter(p => p.id !== savedPostId))
      toast({
        title: "Post unsaved",
        description: "Post removed from saved items"
      })
    } catch (error) {
      console.error('Error unsaving post:', error)
      toast({
        title: "Error",
        description: "Failed to unsave post",
        variant: "destructive"
      })
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-20 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (savedPosts.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Bookmark className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-semibold text-lg mb-2">No saved posts yet</h3>
          <p className="text-sm text-text-secondary mb-4">
            Save posts from your feed to view them later
          </p>
          <Button onClick={() => navigate('/feed')} variant="outline">
            Browse Feed
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {savedPosts.map((saved) => {
        const post = saved.posts
        if (!post) return null

        return (
          <Card key={saved.id} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
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
                  <p className="font-semibold text-sm">{post.profiles?.full_name}</p>
                  <p className="text-xs text-text-secondary">
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>

              <p className="text-sm text-text-primary mb-3 line-clamp-3">
                {post.content}
              </p>

              {post.media_urls && post.media_urls.length > 0 && (
                <div className="mb-3">
                  <img 
                    src={post.media_urls[0]} 
                    alt="Post media"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/feed')}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Post
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleUnsave(saved.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>

              <p className="text-xs text-text-secondary mt-3">
                Saved {formatDistanceToNow(new Date(saved.created_at), { addSuffix: true })}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
