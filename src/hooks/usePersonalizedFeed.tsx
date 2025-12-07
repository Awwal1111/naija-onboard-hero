import { useState, useCallback, useMemo } from 'react'
import { useQuery, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface Post {
  id: string
  user_id: string
  content_type: string
  title?: string
  content: string
  media_urls?: string[]
  metadata?: any
  visibility?: string
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  status: string
  created_at: string
  updated_at: string
  relevance_score?: number
  profiles?: {
    full_name: string
    profession: string
    profile_picture_url?: string
    is_expert?: boolean
  } | null
  user_liked?: boolean
  user_saved?: boolean
}

export interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: string
  content?: string
  expires_at: string
  views_count: number
  created_at: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
  } | null
  user_viewed?: boolean
}

const POSTS_PER_PAGE = 10

export const usePersonalizedFeed = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch stories with caching
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!storiesData) return []

      const userIds = [...new Set(storiesData.map(story => story.user_id))]
      
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', userIds)

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

      const { data: userViews } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id)
        .in('story_id', storiesData.map(s => s.id))

      const viewedStoryIds = new Set(userViews?.map(view => view.story_id) || [])

      return storiesData.map(story => ({
        ...story,
        profiles: profilesMap.get(story.user_id) || null,
        user_viewed: viewedStoryIds.has(story.id)
      }))
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  })

  // Personalized infinite query for posts
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
    refetch: refetchPosts
  } = useInfiniteQuery({
    queryKey: ['personalized-posts-v2', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { posts: [], nextPage: null }

      const offset = pageParam * POSTS_PER_PAGE

      // Use the personalized feed function
      const { data: personalizedPosts, error } = await supabase
        .rpc('get_personalized_feed', {
          p_user_id: user.id,
          p_limit: POSTS_PER_PAGE,
          p_offset: offset
        })

      if (error) {
        console.error('Personalized feed error:', error)
        // Fallback to regular posts if function fails
        const { data: fallbackPosts } = await supabase
          .from('posts')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .range(offset, offset + POSTS_PER_PAGE - 1)
        
        return { posts: fallbackPosts || [], nextPage: null }
      }

      if (!personalizedPosts || personalizedPosts.length === 0) {
        return { posts: [], nextPage: null }
      }

      // Get user IDs for profile fetching
      const userIds = [...new Set(personalizedPosts.map((post: any) => post.user_id))]
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, is_expert')
        .in('user_id', userIds)

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

      // Check which posts the user has liked
      const { data: userLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', personalizedPosts.map((p: any) => p.id))

      const likedPostIds = new Set(userLikes?.map(like => like.post_id) || [])

      // Check saved posts
      const { data: savedPosts } = await supabase
        .from('saved_posts')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', personalizedPosts.map((p: any) => p.id))

      const savedPostIds = new Set(savedPosts?.map(save => save.post_id) || [])

      const enrichedPosts: Post[] = personalizedPosts.map((post: any) => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null,
        user_liked: likedPostIds.has(post.id),
        user_saved: savedPostIds.has(post.id)
      }))

      return {
        posts: enrichedPosts,
        nextPage: enrichedPosts.length === POSTS_PER_PAGE ? pageParam + 1 : null
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    initialPageParam: 0,
  })

  // Flatten posts from all pages
  const posts = useMemo(() => {
    return postsData?.pages.flatMap(page => page.posts) || []
  }, [postsData])

  // Filter posts based on search query
  const filteredPosts = useMemo(() => {
    if (!searchQuery.trim()) return posts

    return posts.filter(post => 
      post.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [posts, searchQuery])

  const loading = postsLoading || storiesLoading

  // Post creation with cache invalidation
  const createPost = useCallback(async (content: string, contentType: string = 'status', title?: string, mediaUrls?: string[]) => {
    if (!user) return { error: 'User not authenticated' }

    try {
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          content,
          content_type: contentType,
          title,
          media_urls: mediaUrls
        })

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['personalized-posts-v2'] })

      toast({
        title: "Post created",
        description: "Your post has been shared successfully"
      })

      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create post",
        variant: "destructive"
      })
      return { error: error.message }
    }
  }, [user, queryClient, toast])

  // Story creation
  const createStory = useCallback(async (mediaUrl: string, mediaType: string, content?: string) => {
    if (!user) return { error: 'User not authenticated' }

    try {
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 24)

      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          content,
          expires_at: expiresAt.toISOString()
        })

      if (error) throw error

      queryClient.invalidateQueries({ queryKey: ['stories'] })

      toast({
        title: "Story created",
        description: "Your story has been shared successfully"
      })

      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create story",
        variant: "destructive"
      })
      return { error: error.message }
    }
  }, [user, queryClient, toast])

  // Optimistic like toggle
  const toggleLike = useCallback(async (postId: string) => {
    if (!user) return

    const post = posts.find(p => p.id === postId)
    if (!post) return

    // Optimistic update
      queryClient.setQueryData(['personalized-posts-v2', user.id], (oldData: any) => {
      if (!oldData) return oldData

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: Post) => 
            p.id === postId 
              ? { 
                  ...p, 
                  user_liked: !p.user_liked,
                  likes_count: p.user_liked ? p.likes_count - 1 : p.likes_count + 1
                }
              : p
          )
        }))
      }
    })

    try {
      if (post.user_liked) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          })
      }
    } catch (error) {
      queryClient.invalidateQueries({ queryKey: ['personalized-posts-v2'] })
      console.error('Error toggling like:', error)
    }
  }, [user, posts, queryClient])

  // Save post toggle
  const savePost = useCallback(async (postId: string) => {
    if (!user) return { error: 'User not authenticated' }

    const post = posts.find(p => p.id === postId)
    if (!post) return { error: 'Post not found' }

    // Optimistic update
    queryClient.setQueryData(['personalized-posts-v2', user.id], (oldData: any) => {
      if (!oldData) return oldData

      return {
        ...oldData,
        pages: oldData.pages.map((page: any) => ({
          ...page,
          posts: page.posts.map((p: Post) => 
            p.id === postId ? { ...p, user_saved: !p.user_saved } : p
          )
        }))
      }
    })

    try {
      if (post.user_saved) {
        await supabase
          .from('saved_posts')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('saved_posts')
          .insert({
            post_id: postId,
            user_id: user.id
          })
      }

      toast({
        title: post.user_saved ? "Post unsaved" : "Post saved",
        description: post.user_saved ? "Removed from saved posts" : "Added to saved posts"
      })

      return { success: true }
    } catch (error: any) {
      queryClient.invalidateQueries({ queryKey: ['personalized-posts-v2'] })
      toast({
        title: "Error",
        description: error.message || "Failed to save post",
        variant: "destructive"
      })
      return { error: error.message }
    }
  }, [user, posts, queryClient, toast])

  const addComment = useCallback(async (postId: string, content: string) => {
    if (!user) return { error: 'User not authenticated' }

    try {
      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content
        })

      if (error) throw error

      toast({
        title: "Comment added",
        description: "Your comment has been posted"
      })

      return { success: true }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add comment",
        variant: "destructive"
      })
      return { error: error.message }
    }
  }, [user, toast])

  const viewStory = useCallback(async (storyId: string) => {
    if (!user) return

    try {
      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          user_id: user.id
        })

      queryClient.setQueryData(['stories', user.id], (oldStories: Story[] = []) => 
        oldStories.map(s => 
          s.id === storyId 
            ? { ...s, user_viewed: true, views_count: s.views_count + (s.user_viewed ? 0 : 1) }
            : s
        )
      )
    } catch (error) {
      console.error('Error viewing story:', error)
    }
  }, [user, queryClient])

  return {
    posts: filteredPosts,
    stories,
    loading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    searchQuery,
    setSearchQuery,
    createPost,
    createStory,
    toggleLike,
    addComment,
    viewStory,
    savePost,
    refreshFeed: () => {
      queryClient.invalidateQueries({ queryKey: ['personalized-posts-v2'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    }
  }
}
