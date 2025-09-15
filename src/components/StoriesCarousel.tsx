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
      // Fetch active stories with profiles
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
          expires_at,
          profiles(full_name, profile_picture_url)
        `)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (storiesError) throw storiesError

      // Check which stories the user has viewed using existing story_views table
      const { data: viewedStories } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id)

      const viewedStoryIds = new Set(viewedStories?.map(v => v.story_id) || [])

      // Process stories and mark viewed ones
      const processedStories = (storiesData || []).map(story => ({
        ...story,
        is_viewed: viewedStoryIds.has(story.id) || story.user_id === user.id,
        profiles: Array.isArray(story.profiles) && story.profiles.length > 0 
          ? story.profiles[0] 
          : { full_name: 'Anonymous' }
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
    
    // Mark as viewed if not own story
    if (story.user_id !== user?.id) {
      await markStoryAsViewed(story.id)
      // Update local state
      setStories(prev => prev.map(s => 
        s.id === story.id ? { ...s, is_viewed: true } : s
      ))
    }
  }

  const closeStoryViewer = () => {
    setViewingStory(null)
  }

  const navigateStory = (direction: 'next' | 'prev') => {
    const userStoriesGroup = stories.filter(s => s.user_id === viewingStory?.user_id)
    const currentIndex = userStoriesGroup.findIndex(s => s.id === viewingStory?.id)
    
    if (direction === 'next' && currentIndex < userStoriesGroup.length - 1) {
      const nextStory = userStoriesGroup[currentIndex + 1]
      handleStoryClick(nextStory, currentIndex + 1)
    } else if (direction === 'prev' && currentIndex > 0) {
      const prevStory = userStoriesGroup[currentIndex - 1]
      handleStoryClick(prevStory, currentIndex - 1)
    }
  }

  // Group stories by user for display
  const groupedStories = stories.reduce((groups: { [key: string]: Story[] }, story) => {
    if (!groups[story.user_id]) {
      groups[story.user_id] = []
    }
    groups[story.user_id].push(story)
    return groups
  }, {})

  const formatTimeAgo = (date: string) => {
    const now = new Date()
    const storyTime = new Date(date)
    const diffInHours = Math.floor((now.getTime() - storyTime.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'now'
    if (diffInHours < 24) return `${diffInHours}h`
    return `${Math.floor(diffInHours / 24)}d`
  }

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
                  ? 'bg-gradient-to-tr from-purple-500 via-pink-500 to-orange-500' 
                  : 'bg-border'
              }`}>
                <Avatar className="w-full h-full border-2 border-background">
                  <AvatarImage src={latestStory.profiles?.profile_picture_url || undefined} />
                  <AvatarFallback className="bg-muted text-text-secondary">
                    {latestStory.profiles?.full_name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                {/* Story count badge */}
                {userStories.length > 1 && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-xs text-white font-bold">
                    {userStories.length}
                  </div>
                )}

                {/* Play icon overlay */}
                <div className="absolute inset-0 bg-black/20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Play className="h-4 w-4 text-white fill-current" />
                </div>
              </div>
              
              <div className="text-center max-w-16">
                <p className="text-xs text-text-primary font-medium truncate">
                  {latestStory.profiles?.full_name || 'User'}
                </p>
                <p className="text-xs text-text-secondary">
                  {formatTimeAgo(latestStory.created_at)}
                </p>
              </div>
            </button>
          )
        })}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!viewingStory} onOpenChange={closeStoryViewer}>
        <DialogContent className="max-w-sm p-0 bg-black border-none overflow-hidden">
          {viewingStory && (
            <div className="relative h-screen max-h-[80vh] bg-black text-white">
              {/* Header */}
              <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/60 to-transparent p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={viewingStory.profiles?.profile_picture_url || undefined} />
                      <AvatarFallback className="bg-muted text-text-secondary text-xs">
                        {viewingStory.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">{viewingStory.profiles?.full_name}</p>
                      <p className="text-xs text-white/70">{formatTimeAgo(viewingStory.created_at)}</p>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeStoryViewer}
                    className="text-white hover:bg-white/20 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Progress bar */}
                <div className="mt-3 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-white rounded-full w-full animate-pulse" />
                </div>
              </div>

              {/* Story Content */}
              <div className="relative h-full flex items-center justify-center">
                {viewingStory.media_type.startsWith('image') ? (
                  <img 
                    src={viewingStory.media_url} 
                    alt="Story"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <video 
                    src={viewingStory.media_url} 
                    autoPlay 
                    muted 
                    className="max-w-full max-h-full object-contain"
                  />
                )}
                
                {/* Navigation areas */}
                <div 
                  className="absolute left-0 top-0 w-1/3 h-full cursor-pointer"
                  onClick={() => navigateStory('prev')}
                />
                <div 
                  className="absolute right-0 top-0 w-1/3 h-full cursor-pointer"
                  onClick={() => navigateStory('next')}
                />
              </div>

              {/* Story text content */}
              {viewingStory.content && (
                <div className="absolute bottom-4 left-4 right-4 z-10">
                  <p className="text-white text-center bg-black/50 rounded-lg p-3">
                    {viewingStory.content}
                  </p>
                </div>
              )}

              {/* View count for own stories */}
              {viewingStory.user_id === user?.id && (
                <div className="absolute bottom-16 left-4 flex items-center gap-1 text-white/70">
                  <Eye className="h-4 w-4" />
                  <span className="text-xs">{viewingStory.views_count} views</span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default StoriesCarousel