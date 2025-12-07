import React, { useState } from 'react'
import { Plus, X, Eye } from 'lucide-react'
import { Story } from '@/hooks/useFeed'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

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
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0)

  // Separate user's stories from others
  const userStories = stories.filter(s => s.user_id === currentUserId)
  const otherStories = stories.filter(s => s.user_id !== currentUserId)
  const allStories = [...userStories, ...otherStories]

  const handleStoryClick = (story: Story, index: number) => {
    setViewingStory(story)
    setCurrentStoryIndex(index)
    // Mark as viewed via parent callback
    onViewStory(story.id)
  }

  const nextStory = () => {
    if (currentStoryIndex < allStories.length - 1) {
      const nextIndex = currentStoryIndex + 1
      const nextStory = allStories[nextIndex]
      setCurrentStoryIndex(nextIndex)
      setViewingStory(nextStory)
      onViewStory(nextStory.id)
    } else {
      setViewingStory(null)
    }
  }

  const previousStory = () => {
    if (currentStoryIndex > 0) {
      const prevIndex = currentStoryIndex - 1
      setCurrentStoryIndex(prevIndex)
      setViewingStory(allStories[prevIndex])
    }
  }

  const closeStoryViewer = () => {
    setViewingStory(null)
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
      // Text story - show colored background with text preview
      return (
        <div className={`w-full h-full flex items-center justify-center p-1 ${getBackgroundClass(story.background_color)}`}>
          <span className="text-white text-[8px] font-semibold text-center line-clamp-3 leading-tight">
            {story.content?.substring(0, 30) || ''}
          </span>
        </div>
      )
    } else {
      // Fallback to profile picture
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
            {userStories.map((story, index) => (
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

            {/* Other Users' Stories */}
            {otherStories.map((story, index) => (
              <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
                <button
                  onClick={() => handleStoryClick(story, userStories.length + index)}
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
            <div className="relative w-full h-full bg-black">
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
              <div className="w-full h-full flex items-center justify-center">
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
              <div className="absolute inset-0 flex z-5">
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
              {viewingStory.content && viewingStory.media_url && (
                <div className="absolute bottom-20 left-4 right-4 z-10">
                  <p className="text-white text-sm text-center bg-black/50 p-3 rounded-lg">
                    {viewingStory.content}
                  </p>
                </div>
              )}

              {/* Bottom Bar */}
              <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between">
                {/* View Count - Only visible to story owner */}
                {viewingStory.user_id === currentUserId ? (
                  <div className="flex items-center gap-1 text-white/70">
                    <Eye className="h-4 w-4" />
                    <span className="text-xs">{viewingStory.views_count || 0} views</span>
                  </div>
                ) : (
                  <div />
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

export default StoriesSection
