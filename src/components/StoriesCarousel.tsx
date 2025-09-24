import React, { useState, useEffect } from 'react'
import { Plus, Play, Eye, X } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface Story {
  id: string
  user_id: string
  media_url: string
  media_type: string
  content?: string | null
  views_count: number
  created_at: string
  expires_at: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
  }
  is_viewed?: boolean
}

interface StoriesCarouselProps {
  onCreateStory: () => void
}

const StoriesCarousel: React.FC<StoriesCarouselProps> = ({ onCreateStory }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [userStories, setUserStories] = useState<Story[]>([])

  useEffect(() => {
    fetchStories()
  }, [user])

  const fetchStories = async () => {
    if (!user) return

    try {
      // Fetch active stories with profiles - using LEFT JOIN to avoid foreign key issues
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select(`
          id,
          user_id,
          media_url,
          media_type,
          content,
          views_count,
          created_at,
          expires_at
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (storiesError) {
        console.error('Error fetching stories:', storiesError)
        setStories([])
        setLoading(false)
        return
      }

      // Fetch profile data separately to avoid foreign key issues
      const userIds = storiesData?.map(story => story.user_id) || []
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', userIds)

      // Create a map for quick profile lookup
      const profilesMap = new Map(
        profilesData?.map(profile => [profile.user_id, profile]) || []
      )

      // Check which stories the user has viewed using existing story_views table
      const { data: viewedStories } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id)

      const viewedStoryIds = new Set(viewedStories?.map(v => v.story_id) || [])

      // Process stories with profile data
      const processedStories = (storiesData || []).map(story => ({
        ...story,
        is_viewed: viewedStoryIds.has(story.id) || story.user_id === user.id,
        profiles: profilesMap.get(story.user_id) || { full_name: 'Anonymous' }
      }))

      setStories(processedStories)

      // Get current user's stories  
      const myStories = processedStories.filter(story => story.user_id === user.id)
      setUserStories(myStories)

    } catch (error) {
      console.error('Error fetching stories:', error)
      toast({
        title: "Error loading stories",
        description: "Please try again later",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const markStoryAsViewed = async (storyId: string) => {
    if (!user) return

    try {
      // Use existing story_views table
      await supabase
        .from('story_views')
        .insert({
          story_id: storyId,
          user_id: user.id
        })
    } catch (error) {
      console.error('Error marking story as viewed:', error)
    }
  }

  const handleStoryClick = async (story: Story, index: number) => {
    setViewingStory(story)
    setCurrentStoryIndex(index)
    
    // Mark as viewed if it's not the user's own story
    if (story.user_id !== user?.id) {
      await markStoryAsViewed(story.id)
      
      // Update local state to reflect viewed status
      setStories(prev => prev.map(s => 
        s.id === story.id ? { ...s, is_viewed: true } : s
      ))
    }
  }

  const nextStory = () => {
    if (currentStoryIndex < stories.length - 1) {
      const nextIndex = currentStoryIndex + 1
      const nextStory = stories[nextIndex]
      setCurrentStoryIndex(nextIndex)
      setViewingStory(nextStory)
      if (nextStory.user_id !== user?.id) {
        markStoryAsViewed(nextStory.id)
      }
    } else {
      setViewingStory(null)
    }
  }

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1
      setCurrentStoryIndex(prevIndex)
      setViewingStory(stories[prevIndex])
    }
  }

  const closeStoryViewer = () => {
    setViewingStory(null)
  }

  // Group stories by user
  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.user_id]) {
      acc[story.user_id] = []
    }
    acc[story.user_id].push(story)
    return acc
  }, {} as Record<string, Story[]>)

  if (loading) {
    return (
      <div className="flex gap-4 p-4 overflow-x-auto">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex-shrink-0 w-16 h-16 bg-muted rounded-full animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <>
      <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide">
        {/* Add Story Button */}
        <button
          onClick={onCreateStory}
          className="flex-shrink-0 flex flex-col items-center gap-2 group"
        >
          <div className="relative w-16 h-16 bg-gradient-to-br from-primary to-brand-green rounded-full flex items-center justify-center border-2 border-background group-hover:scale-105 transition-transform">
            <Plus className="h-6 w-6 text-white" />
            {userStories.length > 0 && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-xs text-white font-bold">
                {userStories.length}
              </div>
            )}
          </div>
          <span className="text-xs text-text-secondary font-medium">Your Story</span>
        </button>

        {/* User Stories */}
        {Object.entries(groupedStories).map(([userId, userStories]) => {
          const latestStory = userStories[0]
          const hasUnviewedStories = userStories.some(story => !story.is_viewed && story.user_id !== user?.id)
          
          return (
            <button
              key={userId}
              onClick={() => handleStoryClick(latestStory, 0)}
              className="flex-shrink-0 flex flex-col items-center gap-2 group"
            >
              <div className={`relative w-16 h-16 rounded-full p-0.5 group-hover:scale-105 transition-transform ${
                hasUnviewedStories 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                  : 'bg-gray-300'
              }`}>
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={latestStory.profiles?.profile_picture_url} />
                  <AvatarFallback className="text-xs">
                    {latestStory.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                {userStories.length > 1 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {userStories.length}
                  </div>
                )}
              </div>
              <span className="text-xs text-text-secondary font-medium max-w-16 truncate">
                {latestStory.profiles?.full_name || 'Anonymous'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!viewingStory} onOpenChange={() => setViewingStory(null)}>
        <DialogContent className="max-w-md w-full h-[600px] p-0 overflow-hidden">
          {viewingStory && (
            <div className="relative w-full h-full bg-black">
              {/* Story Progress Bars */}
              <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
                {Object.entries(groupedStories).map(([userId, userStories]) => {
                  if (userId === viewingStory.user_id) {
                    return userStories.map((_, index) => (
                      <div
                        key={index}
                        className={`flex-1 h-1 rounded-full ${
                          index === currentStoryIndex ? 'bg-white' : 'bg-white/30'
                        }`}
                      />
                    ))
                  }
                  return null
                })}
              </div>

              {/* Story Header */}
              <div className="absolute top-8 left-4 right-4 z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={viewingStory.profiles?.profile_picture_url} />
                    <AvatarFallback className="text-xs">
                      {viewingStory.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-white text-sm font-medium">
                    {viewingStory.profiles?.full_name || 'Anonymous'}
                  </span>
                  <span className="text-white/70 text-xs">
                    {new Date(viewingStory.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={closeStoryViewer}
                  className="text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Story Content */}
              <div className="w-full h-full flex items-center justify-center">
                {viewingStory.media_type?.startsWith('image') ? (
                  <img
                    src={viewingStory.media_url}
                    alt="Story content"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : viewingStory.media_type?.startsWith('video') ? (
                  <video
                    src={viewingStory.media_url}
                    controls
                    autoPlay
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-white text-center p-8">
                    <p>{viewingStory.content}</p>
                  </div>
                )}
              </div>

              {/* Navigation Areas */}
              <div className="absolute inset-0 flex">
                <button
                  onClick={previousStory}
                  className="flex-1 h-full bg-transparent"
                  disabled={currentStoryIndex === 0}
                />
                <button
                  onClick={nextStory}
                  className="flex-1 h-full bg-transparent"
                />
              </div>

              {/* Story Text Content */}
              {viewingStory.content && (
                <div className="absolute bottom-8 left-4 right-4 z-10">
                  <p className="text-white text-sm text-center bg-black/50 p-3 rounded-lg">
                    {viewingStory.content}
                  </p>
                </div>
              )}

              {/* View Count */}
              <div className="absolute bottom-4 left-4 z-10 flex items-center gap-1 text-white/70">
                <Eye className="h-4 w-4" />
                <span className="text-xs">{viewingStory.views_count}</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default StoriesCarousel