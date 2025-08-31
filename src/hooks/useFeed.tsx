import { useState, useEffect } from 'react'
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

export const useFeed = () => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [posts, setPosts] = useState<Post[]>([])
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchFeedData()
      setupRealtimeSubscriptions()
    }
  }, [user])

  const fetchFeedData = async () => {
    try {
      await Promise.all([fetchPosts(), fetchStories()])
    } catch (error) {
      console.error('Error fetching feed data:', error)
      toast({
        title: "Error",
        description: "Failed to load feed",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPosts = async () => {
    try {
      const { data: postsData, error } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      if (!postsData) {
        setPosts([])
        return
      }

      // Get unique user IDs
      const userIds = [...new Set(postsData.map(post => post.user_id))]
      
      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url')
        .in('user_id', userIds)

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

      // Check which posts the user has liked
      let likedPostIds = new Set<string>()
      if (user) {
        const { data: userLikes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', postsData.map(p => p.id))

        likedPostIds = new Set(userLikes?.map(like => like.post_id) || [])
      }

      const enrichedPosts: Post[] = postsData.map(post => ({
        ...post,
        profiles: profilesMap.get(post.user_id) || null,
        user_liked: likedPostIds.has(post.id)
      }))

      setPosts(enrichedPosts)
    } catch (error) {
      console.error('Error fetching posts:', error)
      setPosts([])
    }
  }

  const fetchStories = async () => {
    try {
      const { data: storiesData, error } = await supabase
        .from('stories')
        .select('*')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (error) throw error

      if (!storiesData) {
        setStories([])
        return
      }

      // Get unique user IDs
      const userIds = [...new Set(storiesData.map(story => story.user_id))]
      
      // Fetch profiles for all users
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', userIds)

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || [])

      // Check which stories the user has viewed
      let viewedStoryIds = new Set<string>()
      if (user) {
        const { data: userViews } = await supabase
          .from('story_views')
          .select('story_id')
          .eq('user_id', user.id)
          .in('story_id', storiesData.map(s => s.id))

        viewedStoryIds = new Set(userViews?.map(view => view.story_id) || [])
      }

      const enrichedStories: Story[] = storiesData.map(story => ({
        ...story,
        profiles: profilesMap.get(story.user_id) || null,
        user_viewed: viewedStoryIds.has(story.id)
      }))

      setStories(enrichedStories)
    } catch (error) {
      console.error('Error fetching stories:', error)
      setStories([])
    }
  }

  const setupRealtimeSubscriptions = () => {
    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => fetchPosts()
      )
      .subscribe()

    const storiesChannel = supabase
      .channel('stories-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stories'
        },
        () => fetchStories()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(postsChannel)
      supabase.removeChannel(storiesChannel)
    }
  }

  const createPost = async (content: string, contentType: string = 'status', title?: string, mediaUrls?: string[]) => {
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
  }

  const createStory = async (mediaUrl: string, mediaType: string, content?: string) => {
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
  }

  const toggleLike = async (postId: string) => {
    if (!user) return

    const post = posts.find(p => p.id === postId)
    if (!post) return

    try {
      if (post.user_liked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id)
      } else {
        // Like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          })
      }

      // Update local state optimistically
      setPosts(prev => prev.map(p => 
        p.id === postId 
          ? { 
              ...p, 
              user_liked: !p.user_liked,
              likes_count: p.user_liked ? p.likes_count - 1 : p.likes_count + 1
            }
          : p
      ))
    } catch (error) {
      console.error('Error toggling like:', error)
    }
  }

  const addComment = async (postId: string, content: string) => {
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
  }

  const viewStory = async (storyId: string) => {
    if (!user) return

    try {
      await supabase
        .from('story_views')
        .upsert({
          story_id: storyId,
          user_id: user.id
        })

      // Update local state
      setStories(prev => prev.map(s => 
        s.id === storyId 
          ? { ...s, user_viewed: true, views_count: s.views_count + (s.user_viewed ? 0 : 1) }
          : s
      ))
    } catch (error) {
      console.error('Error viewing story:', error)
    }
  }

  return {
    posts,
    stories,
    loading,
    createPost,
    createStory,
    toggleLike,
    addComment,
    viewStory,
    refreshFeed: fetchFeedData
  }
}