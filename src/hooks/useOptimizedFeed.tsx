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
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  status: string
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string
    profession: string
    profile_picture_url?: string
  } | null
  user_liked?: boolean
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

export const useOptimizedFeed = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')

  // Fetch stories with caching
  const { data: stories = [], isLoading: storiesLoading } = useQuery({
    queryKey: ['stories', user?.id],
    queryFn: async () => {
      if (!user) return []

      // First get stories
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      if (!storiesData) return []

      // Get user IDs for profile fetching
      const userIds = [...new Set(storiesData.map(story => story.user_id))]
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', userIds)

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

      // Check which stories the user has viewed
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
  })

  // Infinite query for posts with pagination
  const {
    data: postsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: postsLoading,
    refetch: refetchPosts
  } = useInfiniteQuery({
    queryKey: ['posts', user?.id],
    queryFn: async ({ pageParam = 0 }) => {
      if (!user) return { posts: [], nextPage: null }

      const from = pageParam * POSTS_PER_PAGE
      const to = from + POSTS_PER_PAGE - 1

      // First get posts
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .range(from, to)

      if (error) throw error
      if (!postsData) return { posts: [], nextPage: null }

      // Get user IDs for profile fetching
      const userIds = [...new Set(postsData.map(post => post.user_id))]
      
      // Fetch profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url')
        .in('user_id', userIds)

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

      // Check which posts the user has liked
      const { data: userLikes } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postsData.map(p => p.id))

      const likedPostIds = new Set(userLikes?.map(like => like.post_id) || [])

      const enrichedPosts: Post[] = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null,
        user_liked: likedPostIds.has(post.id)
      }))

      return {
        posts: enrichedPosts,
        nextPage: enrichedPosts.length === POSTS_PER_PAGE ? pageParam + 1 : null
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
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
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [posts, searchQuery])

  const loading = postsLoading || storiesLoading

  // Optimized post creation with cache invalidation
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

      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['posts'] })

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

  // Optimized story creation
  const createStory = useCallback(async (mediaUrl: string, mediaType: string, content?: string) => {
    if (!user) return { error: 'User not authenticated' }

    try {
      const { error } = await supabase
        .from('stories')
        .insert({
          user_id: user.id,
          media_url: mediaUrl,
          media_type: mediaType,
          content
        })

      if (error) throw error

      // Invalidate and refetch stories
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
    queryClient.setQueryData(['posts', user.id], (oldData: any) => {
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
      // Revert optimistic update on error
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      console.error('Error toggling like:', error)
    }
  }, [user, posts, queryClient])

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

      // Update cache optimistically
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
    refreshFeed: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['stories'] })
    }
  }
}