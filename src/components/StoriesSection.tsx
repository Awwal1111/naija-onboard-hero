import React, { useState, useEffect } from 'react'
import { Plus, X, Eye, Users, ChevronDown, ChevronUp } from 'lucide-react'
import { Story } from '@/hooks/useFeed'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { supabase } from '@/integrations/supabase/client'
import { useNavigate } from 'react-router-dom'

interface StoryViewer {
  user_id: string
  viewed_at: string
  profiles: {
    full_name: string
    profile_picture_url?: string
    profession?: string
  }
}

interface StoriesSectionProps {
  stories: Story[]
  onCreateStory: () => void
  onViewStory: (storyId: string) => void
  currentUserId?: string
}

const StoriesSection: React.FC<StoriesSectionProps> = ({
  stories,
  onCreateStory,
  onViewStory,
  currentUserId
}) => {
  const navigate = useNavigate()
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)
  const [storyViewers, setStoryViewers] = useState<StoryViewer[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const [loadingViewers, setLoadingViewers] = useState(false)
  const [userConnections, setUserConnections] = useState<Set<string>>(new Set())

  // Fetch user connections for story ranking
  useEffect(() => {
    const fetchConnections = async () => {
      if (!currentUserId) return
      
      const { data } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
      
      if (data) {
        const connectionIds = new Set(
          data.map(c => c.user1_id === currentUserId ? c.user2_id : c.user1_id)
        )
        setUserConnections(connectionIds)
      }
    }
    
    fetchConnections()
  }, [currentUserId])

  // Sort stories with algorithm: connections first, unviewed, then recency
  const sortedStories = React.useMemo(() => {
    const userStories = stories.filter(s => s.user_id === currentUserId)
    const otherStories = stories.filter(s => s.user_id !== currentUserId)
    
    // Sort other stories by algorithm
    const rankedOtherStories = otherStories.sort((a, b) => {
      // Priority 1: Unviewed stories first
      if (!a.user_viewed && b.user_viewed) return -1
      if (a.user_viewed && !b.user_viewed) return 1
      
      // Priority 2: Connection stories first
      const aIsConnection = userConnections.has(a.user_id)
      const bIsConnection = userConnections.has(b.user_id)
      if (aIsConnection && !bIsConnection) return -1
      if (!aIsConnection && bIsConnection) return 1
      
      // Priority 3: More recent stories first
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
    
    return { userStories, rankedOtherStories }
  }, [stories, currentUserId, userConnections])

  const allStories = [...sortedStories.userStories, ...sortedStories.rankedOtherStories]

  // Fetch story viewers when viewing own story
  const fetchStoryViewers = async (storyId: string) => {
    setLoadingViewers(true)
    try {
      const { data, error } = await supabase
        .from('story_views')
        .select(`
          user_id,
          viewed_at,
          profiles:user_id (
            full_name,
            profile_picture_url,
            profession
          )
        `)
        .eq('story_id', storyId)
        .order('viewed_at', { ascending: false })

      if (!error && data) {
        // Transform data to match interface
        const viewers = data.map((item: any) => ({
          user_id: item.user_id,
          viewed_at: item.viewed_at,
          profiles: item.profiles || { full_name: 'Anonymous' }
        }))
        setStoryViewers(viewers)
      }
    } catch (error) {
      console.error('Error fetching story viewers:', error)
    } finally {
      setLoadingViewers(false)
    }
  }

  const handleStoryClick = (story: Story, index: number) => {
    setViewingStory(story)
    setCurrentStoryIndex(index)
    setShowViewers(false)
    setStoryViewers([])
    
    // Mark as viewed via parent callback
    onViewStory(story.id)
    
    // If own story, fetch viewers
    if (story.user_id === currentUserId) {
      fetchStoryViewers(story.id)
    }
  }

  const nextStory = () => {
    if (currentStoryIndex < allStories.length - 1) {
      const nextIndex = currentStoryIndex + 1
      const nextStory = allStories[nextIndex]
      setCurrentStoryIndex(nextIndex)
      setViewingStory(nextStory)
      setShowViewers(false)
      setStoryViewers([])
      onViewStory(nextStory.id)
      
      if (nextStory.user_id === currentUserId) {
        fetchStoryViewers(nextStory.id)
      }
    } else {
      setViewingStory(null)
    }
  }

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1
      const prevStory = allStories[prevIndex]
      setCurrentStoryIndex(prevIndex)
      setViewingStory(prevStory)
      setShowViewers(false)
      setStoryViewers([])
      
      if (prevStory.user_id === currentUserId) {
        fetchStoryViewers(prevStory.id)
      }
    }
  }

  const closeStoryViewer = () => {
    setViewingStory(null)
    setShowViewers(false)
    setStoryViewers([])
  }

  const handleViewerClick = (userId: string) => {
    closeStoryViewer()
    navigate(`/profile/${userId}`)
  }

  // Get background class for text stories
  const getBackgroundClass = (bgColor: string | undefined) => {
    switch (bgColor) {
      case 'gradient-purple':
        return 'bg-gradient-to-br from-purple-500 to-pink-500'
      case 'gradient-blue':
        return 'bg-gradient-to-br from-blue-500 to-cyan-500'
      case 'gradient-orange':
        return 'bg-gradient-to-br from-orange-500 to-red-500'
      case 'gradient-primary':
        return 'bg-gradient-to-br from-primary to-brand-green'
      case 'solid-black':
        return 'bg-black'
      default:
        return 'bg-gradient-to-br from-primary to-brand-green'
    }
  }

  // Render story preview thumbnail
  const renderStoryPreview = (story: Story) => {
    if (story.media_url && (story.media_type?.startsWith('image') || story.media_type?.includes('image'))) {
      return (
        <img 
          src={story.media_url} 
          alt="Story preview"
          className="w-full h-full object-cover"
        />
      )
    } else if (story.media_url && story.media_type?.startsWith('video')) {
      return (
        <video 
          src={story.media_url} 
          className="w-full h-full object-cover"
          muted
        />
      )
    } else if (story.media_type === 'text' || story.content) {
      return (
        <div className={`w-full h-full flex items-center justify-center p-1 ${getBackgroundClass(story.background_color)}`}>
          <span className="text-white text-[8px] font-semibold text-center line-clamp-3 leading-tight">
            {story.content?.substring(0, 30) || ''}
          </span>
        </div>
      )
    } else {
      return story.profiles?.profile_picture_url ? (
        <img 
          src={story.profiles.profile_picture_url} 
          alt={story.profiles?.full_name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
          {story.profiles?.full_name?.charAt(0) || 'U'}
        </div>
      )
    }
  }
  
  return (
    <>
      <div className="bg-card">
        <div className="px-4 py-4">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide">
            {/* Your Story - Always First */}
            <div className="flex flex-col items-center gap-2 shrink-0">
              <button
                onClick={onCreateStory}
                className="relative w-20 h-20 rounded-full overflow-hidden"
              >
                <div className="w-full h-full rounded-full border-2 border-dashed border-primary bg-muted flex items-center justify-center hover:bg-primary/10 transition-colors">
                  <Plus className="h-8 w-8 text-primary" />
                </div>
              </button>
              <span className="text-xs font-medium text-foreground">Your Story</span>
            </div>

            {/* User's Posted Stories */}
            {sortedStories.userStories.map((story, index) => (
              <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
                <button
                  onClick={() => handleStoryClick(story, index)}
                  className={`w-20 h-20 rounded-full p-[3px] ${
                    story.user_viewed 
                      ? 'bg-muted' 
                      : 'bg-gradient-to-tr from-primary via-primary-glow to-primary'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      {renderStoryPreview(story)}
                    </div>
                  </div>
                </button>
                <span className="text-xs font-medium text-foreground">You</span>
              </div>
            ))}

            {/* Other Users' Stories (Ranked) */}
            {sortedStories.rankedOtherStories.map((story, index) => (
              <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
                <button
                  onClick={() => handleStoryClick(story, sortedStories.userStories.length + index)}
                  className={`w-20 h-20 rounded-full p-[3px] relative ${
                    story.user_viewed 
                      ? 'bg-muted' 
                      : 'bg-gradient-to-tr from-primary via-primary-glow to-primary'
                  }`}
                >
                  <div className="w-full h-full rounded-full bg-background p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden">
                      {renderStoryPreview(story)}
                    </div>
                  </div>
                  {/* Connection indicator */}
                  {userConnections.has(story.user_id) && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center border-2 border-background">
                      <Users className="h-3 w-3 text-white" />
                    </div>
                  )}
                </button>
                <span className="text-xs font-medium text-foreground truncate max-w-[80px]">
                  {story.profiles?.full_name || 'User'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!viewingStory} onOpenChange={() => setViewingStory(null)}>
        <DialogContent className="max-w-md w-full h-[90vh] max-h-[600px] p-0 overflow-hidden">
          {viewingStory && (
            <div className="relative w-full h-full bg-black flex flex-col">
              {/* Story Progress Bars */}
              <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
                {allStories.map((_, index) => (
                  <div
                    key={index}
                    className={`flex-1 h-1 rounded-full ${
                      index <= currentStoryIndex ? 'bg-white' : 'bg-white/30'
                    }`}
                  />
                ))}
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
              <div className={`flex-1 flex items-center justify-center ${showViewers ? 'h-1/2' : 'h-full'}`}>
                {viewingStory.media_type === 'text' || (!viewingStory.media_url && viewingStory.content) ? (
                  <div className={`w-full h-full flex items-center justify-center p-8 ${getBackgroundClass(viewingStory.background_color)}`}>
                    <p className="text-white text-2xl font-semibold text-center max-w-md leading-relaxed">
                      {viewingStory.content}
                    </p>
                  </div>
                ) : viewingStory.media_type?.startsWith('image') ? (
                  <img
                    src={viewingStory.media_url || ''}
                    alt="Story content"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : viewingStory.media_type?.startsWith('video') ? (
                  <video
                    src={viewingStory.media_url || ''}
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
              <div className="absolute inset-0 flex z-5" style={{ pointerEvents: showViewers ? 'none' : 'auto' }}>
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

              {/* Story Text Content Overlay for media stories with captions */}
              {viewingStory.content && viewingStory.media_url && !showViewers && (
                <div className="absolute bottom-20 left-4 right-4 z-10">
                  <p className="text-white text-sm text-center bg-black/50 p-3 rounded-lg">
                    {viewingStory.content}
                  </p>
                </div>
              )}

              {/* Bottom Bar - Views Toggle for Own Stories */}
              {viewingStory.user_id === currentUserId && (
                <div className="absolute bottom-0 left-0 right-0 z-20">
                  {/* Viewers Toggle Button */}
                  <button
                    onClick={() => setShowViewers(!showViewers)}
                    className="w-full py-3 px-4 bg-black/80 flex items-center justify-between text-white border-t border-white/10"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {storyViewers.length} {storyViewers.length === 1 ? 'view' : 'views'}
                      </span>
                    </div>
                    {showViewers ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </button>

                  {/* Viewers List */}
                  {showViewers && (
                    <div className="bg-black/95 max-h-[200px]">
                      <ScrollArea className="h-full max-h-[200px]">
                        {loadingViewers ? (
                          <div className="p-4 text-center text-white/70 text-sm">
                            Loading viewers...
                          </div>
                        ) : storyViewers.length === 0 ? (
                          <div className="p-4 text-center text-white/70 text-sm">
                            No views yet
                          </div>
                        ) : (
                          <div className="divide-y divide-white/10">
                            {storyViewers.map((viewer) => (
                              <button
                                key={viewer.user_id}
                                onClick={() => handleViewerClick(viewer.user_id)}
                                className="w-full p-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
                              >
                                <Avatar className="h-10 w-10">
                                  <AvatarImage src={viewer.profiles?.profile_picture_url} />
                                  <AvatarFallback className="text-xs bg-primary text-white">
                                    {viewer.profiles?.full_name?.charAt(0) || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 text-left">
                                  <p className="text-white text-sm font-medium">
                                    {viewer.profiles?.full_name || 'Anonymous'}
                                  </p>
                                  {viewer.profiles?.profession && (
                                    <p className="text-white/60 text-xs">
                                      {viewer.profiles.profession}
                                    </p>
                                  )}
                                </div>
                                <span className="text-white/50 text-xs">
                                  {new Date(viewer.viewed_at).toLocaleTimeString()}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default StoriesSection
