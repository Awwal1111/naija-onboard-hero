import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'
import { useToast } from './use-toast'

export interface PostReaction {
  id: string
  post_id: string
  user_id: string
  reaction_type: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' | 'support'
  created_at: string
}

export interface EnhancedPost {
  id: string
  user_id: string
  content: string
  title?: string
  content_type: string
  visibility: 'public' | 'connections' | 'private'
  media_urls?: string[]
  created_at: string
  updated_at: string
  views_count: number
  likes_count: number
  comments_count: number
  shares_count: number
  reactions?: PostReaction[]
  reactions_summary?: Record<string, number>
  user_reaction?: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  highlighted: boolean
  parent_comment_id?: string
  created_at: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
  }
  replies?: Comment[]
}

export const useEnhancedFeed = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<EnhancedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  const fetchPosts = async () => {
    if (!user?.id) return

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles!posts_user_id_fkey(
            full_name,
            profile_picture_url,
            profession
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching posts:', error)
        return
      }

      // Fetch reactions for each post
      const postsWithReactions = await Promise.all(
        (data || []).map(async (post) => {
          // Get reactions summary
          const { data: reactions } = await supabase
            .from('post_reactions')
            .select('reaction_type, user_id')
            .eq('post_id', post.id)

          // Get user's reaction
          const userReaction = reactions?.find(r => r.user_id === user.id)?.reaction_type

          // Create reactions summary
          const reactionsSummary = reactions?.reduce((acc, reaction) => {
            acc[reaction.reaction_type] = (acc[reaction.reaction_type] || 0) + 1
            return acc
          }, {} as Record<string, number>) || {}

          return {
            ...post,
            reactions_summary: reactionsSummary,
            user_reaction: userReaction,
            visibility: (post.visibility || 'public') as 'public' | 'connections' | 'private',
            profiles: Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
          }
        })
      )

      setPosts(postsWithReactions)
    } catch (error) {
      console.error('Error fetching enhanced feed:', error)
    } finally {
      setLoading(false)
    }
  }

  const addReaction = async (postId: string, reactionType: string) => {
    if (!user?.id) return

    try {
      // First, remove any existing reaction
      await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      // Add new reaction
      const { error } = await supabase
        .from('post_reactions')
        .insert({
          post_id: postId,
          user_id: user.id,
          reaction_type: reactionType
        })

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add reaction",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId) {
          const newSummary = { ...post.reactions_summary }
          
          // Remove old reaction count
          if (post.user_reaction && newSummary[post.user_reaction]) {
            newSummary[post.user_reaction]--
            if (newSummary[post.user_reaction] === 0) {
              delete newSummary[post.user_reaction]
            }
          }
          
          // Add new reaction count
          newSummary[reactionType] = (newSummary[reactionType] || 0) + 1

          return {
            ...post,
            reactions_summary: newSummary,
            user_reaction: reactionType
          }
        }
        return post
      }))

    } catch (error) {
      console.error('Error adding reaction:', error)
    }
  }

  const removeReaction = async (postId: string) => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('post_reactions')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id)

      if (error) {
        toast({
          title: "Error",
          description: "Failed to remove reaction",
          variant: "destructive",
        })
        return
      }

      // Update local state
      setPosts(prev => prev.map(post => {
        if (post.id === postId && post.user_reaction) {
          const newSummary = { ...post.reactions_summary }
          
          if (newSummary[post.user_reaction]) {
            newSummary[post.user_reaction]--
            if (newSummary[post.user_reaction] === 0) {
              delete newSummary[post.user_reaction]
            }
          }

          return {
            ...post,
            reactions_summary: newSummary,
            user_reaction: undefined
          }
        }
        return post
      }))

    } catch (error) {
      console.error('Error removing reaction:', error)
    }
  }

  const getPostComments = async (postId: string): Promise<Comment[]> => {
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select(`
          *
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Error fetching comments:', error)
        return []
      }

      // Fetch profiles for each comment
      const commentsWithProfiles = await Promise.all(
        (data || []).map(async (comment) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', comment.user_id)
            .maybeSingle()

          return {
            ...comment,
            profiles: profile || { full_name: 'Anonymous' }
          }
        })
      )

      // Organize comments into threads
      const comments = commentsWithProfiles
      const topLevelComments = comments.filter(c => !c.parent_comment_id)
      const repliesMap = comments.filter(c => c.parent_comment_id).reduce((acc, reply) => {
        if (!acc[reply.parent_comment_id!]) {
          acc[reply.parent_comment_id!] = []
        }
        acc[reply.parent_comment_id!].push(reply)
        return acc
      }, {} as Record<string, Comment[]>)

      return topLevelComments.map(comment => ({
        ...comment,
        replies: repliesMap[comment.id] || []
      }))

    } catch (error) {
      console.error('Error fetching comments:', error)
      return []
    }
  }

  const addComment = async (postId: string, content: string, parentCommentId?: string) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content,
          parent_comment_id: parentCommentId
        })
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to add comment",
          variant: "destructive",
        })
        return { error: error.message }
      }

      toast({
        title: "Success",
        description: "Comment added successfully",
      })
      
      return { success: true, data }
    } catch (error: any) {
      console.error('Error adding comment:', error)
      return { error: error.message }
    }
  }

  const createPost = async (content: string, contentType: string = 'status', visibility: string = 'public', title?: string, mediaUrls?: string[]) => {
    if (!user?.id) return { error: 'Not authenticated' }

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          content_type: contentType,
          visibility,
          title,
          media_urls: mediaUrls
        })
        .select()
        .single()

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create post",
          variant: "destructive",
        })
        return { error: error.message }
      }

      toast({
        title: "Success",
        description: "Post created successfully",
      })

      // Refresh posts
      await fetchPosts()
      
      return { success: true, data }
    } catch (error: any) {
      console.error('Error creating post:', error)
      return { error: error.message }
    }
  }

  const filteredPosts = posts.filter(post => {
    if (!searchQuery) return true
    
    const searchLower = searchQuery.toLowerCase()
    return (
      post.content.toLowerCase().includes(searchLower) ||
      post.title?.toLowerCase().includes(searchLower) ||
      post.profiles?.full_name?.toLowerCase().includes(searchLower) ||
      post.profiles?.profession?.toLowerCase().includes(searchLower)
    )
  })

  useEffect(() => {
    if (user?.id) {
      fetchPosts()
    }
  }, [user?.id])

  return {
    posts: filteredPosts,
    loading,
    searchQuery,
    setSearchQuery,
    addReaction,
    removeReaction,
    getPostComments,
    addComment,
    createPost,
    refetch: fetchPosts
  }
}