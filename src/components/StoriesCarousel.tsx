import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Plus, Eye, X, ChevronUp } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { formatDistanceToNow } from 'date-fns'

interface Story {
  id: string
  user_id: string
  media_url: string | null
  media_type: string
  content?: string | null
  background_color?: string | null
  views_count: number
  created_at: string
  expires_at: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
  }
  is_viewed?: boolean
}

interface StoryViewer {
  user_id: string
  viewed_at: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
  }
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
  const [currentUserIndex, setCurrentUserIndex] = useState(0)
  const [currentStoryIndexInUser, setCurrentStoryIndexInUser] = useState(0)
  const [myStories, setMyStories] = useState<Story[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const [viewers, setViewers] = useState<StoryViewer[]>([])
  const [loadingViewers, setLoadingViewers] = useState(false)

  // Group stories by user
  const groupedStories = useMemo(() => {
    return stories.reduce((acc, story) => {
      if (!acc[story.user_id]) {
        acc[story.user_id] = []
      }
      acc[story.user_id].push(story)
      return acc
    }, {} as Record<string, Story[]>)
  }, [stories])

  // Get ordered list of user IDs
  const userIds = useMemo(() => Object.keys(groupedStories), [groupedStories])

  useEffect(() => {
    fetchStories()
    
    const channel = supabase
      .channel('stories-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, () => {
        fetchStories()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchStories = async () => {
    if (!user) return

    try {
      const { data: storiesData, error: storiesError } = await supabase
        .from('stories')
        .select('id, user_id, media_url, media_type, content, background_color, views_count, created_at, expires_at')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })

      if (storiesError) {
        console.error('Error fetching stories:', storiesError)
        setStories([])
        setLoading(false)
        return
      }

      const userIds = storiesData?.map(story => story.user_id) || []
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', userIds)

      const profilesMap = new Map(
        profilesData?.map(profile => [profile.user_id, profile]) || []
      )

      const { data: viewedStories } = await supabase
        .from('story_views')
        .select('story_id')
        .eq('user_id', user.id)

      const viewedStoryIds = new Set(viewedStories?.map(v => v.story_id) || [])

      const processedStories = (storiesData || []).map(story => ({
        ...story,
        is_viewed: viewedStoryIds.has(story.id) || story.user_id === user.id,
        profiles: profilesMap.get(story.user_id) || { full_name: 'Anonymous' }
      }))

      setStories(processedStories)
      setMyStories(processedStories.filter(story => story.user_id === user.id))
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

  const fetchViewers = async (storyId: string) => {
    if (!user) return
    setLoadingViewers(true)

    try {
      const { data: viewsData } = await supabase
        .from('story_views')
        .select('user_id, created_at')
        .eq('story_id', storyId)
        .order('created_at', { ascending: false })

      if (viewsData && viewsData.length > 0) {
        const viewerIds = viewsData.map(v => v.user_id)
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, profile_picture_url')
          .in('user_id', viewerIds)

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        )

        const processedViewers: StoryViewer[] = viewsData.map(v => ({
          user_id: v.user_id,
          viewed_at: v.created_at,
          profiles: profilesMap.get(v.user_id) || { full_name: 'Anonymous' }
        }))

        setViewers(processedViewers)
      } else {
        setViewers([])
      }
    } catch (error) {
      console.error('Error fetching viewers:', error)
    } finally {
      setLoadingViewers(false)
    }
  }

  const markStoryAsViewed = async (storyId: string, storyOwnerId: string) => {
    if (!user || storyOwnerId === user.id) return

    try {
      // Insert view record (will fail silently if already exists due to unique constraint)
      const { error } = await supabase
        .from('story_views')
        .insert({ story_id: storyId, user_id: user.id })

      if (!error) {
        // Increment views_count on the story
        await supabase
          .from('stories')
          .update({ views_count: (viewingStory?.views_count || 0) + 1 })
          .eq('id', storyId)
      }
    } catch (error) {
      // Silent fail - view tracking shouldn't break UX
    }
  }

  const handleStoryClick = useCallback((userId: string) => {
    const userIndex = userIds.indexOf(userId)
    if (userIndex === -1) return

    setCurrentUserIndex(userIndex)
    setCurrentStoryIndexInUser(0)
    
    const userStories = groupedStories[userId]
    if (userStories && userStories.length > 0) {
      const story = userStories[0]
      setViewingStory(story)
      markStoryAsViewed(story.id, story.user_id)
      
      // Update local viewed state
      setStories(prev => prev.map(s => 
        s.id === story.id ? { ...s, is_viewed: true } : s
      ))
    }
  }, [userIds, groupedStories])

  const nextStory = useCallback(() => {
    const currentUserId = userIds[currentUserIndex]
    const currentUserStories = groupedStories[currentUserId] || []

    if (currentStoryIndexInUser < currentUserStories.length - 1) {
      // Next story from same user
      const nextIndex = currentStoryIndexInUser + 1
      setCurrentStoryIndexInUser(nextIndex)
      const story = currentUserStories[nextIndex]
      setViewingStory(story)
      markStoryAsViewed(story.id, story.user_id)
      setStories(prev => prev.map(s => 
        s.id === story.id ? { ...s, is_viewed: true } : s
      ))
    } else if (currentUserIndex < userIds.length - 1) {
      // Move to next user
      const nextUserIndex = currentUserIndex + 1
      setCurrentUserIndex(nextUserIndex)
      setCurrentStoryIndexInUser(0)
      const nextUserId = userIds[nextUserIndex]
      const nextUserStories = groupedStories[nextUserId]
      if (nextUserStories && nextUserStories.length > 0) {
        const story = nextUserStories[0]
        setViewingStory(story)
        markStoryAsViewed(story.id, story.user_id)
        setStories(prev => prev.map(s => 
          s.id === story.id ? { ...s, is_viewed: true } : s
        ))
      }
    } else {
      // End of all stories
      setViewingStory(null)
      setShowViewers(false)
    }
  }, [currentUserIndex, currentStoryIndexInUser, userIds, groupedStories])

  const previousStory = useCallback(() => {
    const currentUserId = userIds[currentUserIndex]
    const currentUserStories = groupedStories[currentUserId] || []

    if (currentStoryIndexInUser > 0) {
      // Previous story from same user
      const prevIndex = currentStoryIndexInUser - 1
      setCurrentStoryIndexInUser(prevIndex)
      setViewingStory(currentUserStories[prevIndex])
    } else if (currentUserIndex > 0) {
      // Move to previous user's last story
      const prevUserIndex = currentUserIndex - 1
      setCurrentUserIndex(prevUserIndex)
      const prevUserId = userIds[prevUserIndex]
      const prevUserStories = groupedStories[prevUserId]
      if (prevUserStories && prevUserStories.length > 0) {
        const lastIndex = prevUserStories.length - 1
        setCurrentStoryIndexInUser(lastIndex)
        setViewingStory(prevUserStories[lastIndex])
      }
    }
  }, [currentUserIndex, currentStoryIndexInUser, userIds, groupedStories])

  const closeStoryViewer = () => {
    setViewingStory(null)
    setShowViewers(false)
  }

  const handleViewersClick = () => {
    if (viewingStory && viewingStory.user_id === user?.id) {
      fetchViewers(viewingStory.id)
      setShowViewers(true)
    }
  }

  // Get current user's stories for progress bar
  const currentUserStories = useMemo(() => {
    if (!viewingStory) return []
    return groupedStories[viewingStory.user_id] || []
  }, [viewingStory, groupedStories])

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
      <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
        {/* Add Story Button */}
        <button
          onClick={onCreateStory}
          className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
        >
          <div className="relative w-14 h-14 bg-gradient-to-br from-primary to-brand-green rounded-full flex items-center justify-center border-2 border-background group-hover:scale-105 transition-transform shadow-sm">
            <Plus className="h-5 w-5 text-white" />
            {myStories.length > 0 && (
              <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-background">
                {myStories.length}
              </div>
            )}
          </div>
          <span className="text-[10px] text-text-secondary font-medium">You</span>
        </button>

        {/* User Stories */}
        {userIds.map((userId) => {
          const userStories = groupedStories[userId]
          const latestStory = userStories[0]
          const hasUnviewedStories = userStories.some(story => !story.is_viewed && story.user_id !== user?.id)
          
          return (
            <button
              key={userId}
              onClick={() => handleStoryClick(userId)}
              className="flex-shrink-0 flex flex-col items-center gap-1.5 group"
            >
              <div className={`relative w-14 h-14 rounded-full p-[2px] group-hover:scale-105 transition-transform shadow-sm ${
                hasUnviewedStories 
                  ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
                  : 'bg-muted'
              }`}>
                <div className="w-full h-full rounded-full overflow-hidden border-2 border-background">
                  {latestStory.media_type?.startsWith('image') && latestStory.media_url ? (
                    <img src={latestStory.media_url} alt="Story" className="w-full h-full object-cover" />
                  ) : latestStory.media_type?.startsWith('video') && latestStory.media_url ? (
                    <video src={latestStory.media_url} className="w-full h-full object-cover" />
                  ) : latestStory.media_type === 'text' || latestStory.content ? (
                    <div className={`w-full h-full flex items-center justify-center text-[8px] font-semibold text-white p-1 ${
                      latestStory.background_color === 'gradient-purple' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                      latestStory.background_color === 'gradient-blue' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                      latestStory.background_color === 'gradient-orange' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                      latestStory.background_color === 'solid-black' ? 'bg-black' :
                      'bg-gradient-to-br from-primary to-brand-green'
                    }`}>
                      <span className="line-clamp-3 text-center leading-tight">
                        {latestStory.content?.substring(0, 30)}...
                      </span>
                    </div>
                  ) : (
                    <Avatar className="w-full h-full">
                      <AvatarImage src={latestStory.profiles?.profile_picture_url} />
                      <AvatarFallback className="text-xs">
                        {latestStory.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                {userStories.length > 1 && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center text-[10px] text-white font-bold border border-background">
                    {userStories.length}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-text-secondary font-medium max-w-[56px] truncate">
                {latestStory.profiles?.full_name || 'Anonymous'}
              </span>
            </button>
          )
        })}
      </div>

      {/* Story Viewer Dialog */}
      <Dialog open={!!viewingStory} onOpenChange={() => closeStoryViewer()}>
        <DialogContent className="max-w-md w-full h-[90vh] max-h-[600px] p-0 overflow-hidden">
          {viewingStory && (
            <div className="relative w-full h-full bg-black">
              {/* Story Progress Bars - Per User */}
              <div className="absolute top-4 left-4 right-4 z-10 flex gap-1">
                {currentUserStories.map((story, index) => (
                  <div
                    key={story.id}
                    className={`flex-1 h-1 rounded-full transition-all ${
                      index < currentStoryIndexInUser 
                        ? 'bg-white' 
                        : index === currentStoryIndexInUser 
                          ? 'bg-white' 
                          : 'bg-white/30'
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
                  <div className="flex flex-col">
                    <span className="text-white text-sm font-medium">
                      {viewingStory.profiles?.full_name || 'Anonymous'}
                    </span>
                    <span className="text-white/70 text-xs">
                      {formatDistanceToNow(new Date(viewingStory.created_at), { addSuffix: true })}
                    </span>
                  </div>
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
                {viewingStory.media_type === 'text' || (!viewingStory.media_url && viewingStory.content) ? (
                  <div className={`w-full h-full flex items-center justify-center p-8 ${
                    viewingStory.background_color === 'gradient-purple' ? 'bg-gradient-to-br from-purple-500 to-pink-500' :
                    viewingStory.background_color === 'gradient-blue' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' :
                    viewingStory.background_color === 'gradient-orange' ? 'bg-gradient-to-br from-orange-500 to-red-500' :
                    viewingStory.background_color === 'solid-black' ? 'bg-black' :
                    'bg-gradient-to-br from-primary to-brand-green'
                  }`}>
                    <p className="text-white text-2xl font-semibold text-center max-w-md leading-relaxed">
                      {viewingStory.content}
                    </p>
                  </div>
                ) : viewingStory.media_type?.startsWith('image') ? (
                  <img
                    src={viewingStory.media_url!}
                    alt="Story content"
                    className="max-w-full max-h-full object-contain"
                  />
                ) : viewingStory.media_type?.startsWith('video') ? (
                  <video
                    src={viewingStory.media_url!}
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
              <div className="absolute inset-0 flex pointer-events-none">
                <button
                  onClick={previousStory}
                  className="flex-1 h-full bg-transparent pointer-events-auto"
                />
                <button
                  onClick={nextStory}
                  className="flex-1 h-full bg-transparent pointer-events-auto"
                />
              </div>

              {/* Story Text Content Overlay */}
              {viewingStory.content && viewingStory.media_url && (
                <div className="absolute bottom-20 left-4 right-4 z-10">
                  <p className="text-white text-sm text-center bg-black/50 p-3 rounded-lg">
                    {viewingStory.content}
                  </p>
                </div>
              )}

              {/* Bottom Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between">
                {/* View Count - Only visible to story owner, clickable to see viewers */}
                {viewingStory.user_id === user?.id ? (
                  <button 
                    onClick={handleViewersClick}
                    className="flex items-center gap-1 text-white/90 hover:text-white transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                    <span className="text-xs font-medium">{viewingStory.views_count} views</span>
                    <ChevronUp className="h-3 w-3" />
                  </button>
                ) : (
                  <div />
                )}

                {/* Hire Me Button - Only for other users' stories */}
                {viewingStory.user_id !== user?.id && (
                  <Button
                    onClick={async () => {
                      const { data: existingChat } = await supabase
                        .from('chats')
                        .select('id')
                        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${viewingStory.user_id}),and(user1_id.eq.${viewingStory.user_id},user2_id.eq.${user?.id})`)
                        .single()

                      if (existingChat) {
                        window.location.href = `/chat/${existingChat.id}`
                      } else {
                        const { data: newChat } = await supabase
                          .from('chats')
                          .insert({ user1_id: user?.id, user2_id: viewingStory.user_id })
                          .select()
                          .single()

                        if (newChat) {
                          window.location.href = `/chat/${newChat.id}`
                        }
                      }
                    }}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-white font-medium px-4 py-2 h-8"
                  >
                    Hire Me
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Viewers Sheet */}
      <Sheet open={showViewers} onOpenChange={setShowViewers}>
        <SheetContent side="bottom" className="h-[50vh] rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Story Viewers ({viewers.length})
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-full mt-4 pb-8">
            {loadingViewers ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : viewers.length === 0 ? (
              <div className="text-center py-8 text-text-secondary">
                No views yet
              </div>
            ) : (
              <div className="space-y-3">
                {viewers.map((viewer) => (
                  <div key={viewer.user_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={viewer.profiles?.profile_picture_url} />
                      <AvatarFallback>
                        {viewer.profiles?.full_name?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-text-primary">
                        {viewer.profiles?.full_name || 'Anonymous'}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {formatDistanceToNow(new Date(viewer.viewed_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </>
  )
}

export default StoriesCarousel
