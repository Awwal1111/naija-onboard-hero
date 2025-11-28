import React from 'react'
import { Plus } from 'lucide-react'
import { Story } from '@/hooks/useFeed'

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
  // Separate user's stories from others
  const userStories = stories.filter(s => s.user_id === currentUserId)
  const otherStories = stories.filter(s => s.user_id !== currentUserId)
  
  return (
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
          {userStories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
              <button
                onClick={() => onViewStory(story.id)}
                className={`w-20 h-20 rounded-full p-[3px] ${
                  story.user_viewed 
                    ? 'bg-muted' 
                    : 'bg-gradient-to-tr from-primary via-primary-glow to-primary'
                }`}
              >
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {story.profiles?.profile_picture_url ? (
                      <img 
                        src={story.profiles.profile_picture_url} 
                        alt="Your story"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                        {story.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                </div>
              </button>
              <span className="text-xs font-medium text-foreground">You</span>
            </div>
          ))}

          {/* Other Users' Stories */}
          {otherStories.map((story) => (
            <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
              <button
                onClick={() => onViewStory(story.id)}
                className={`w-20 h-20 rounded-full p-[3px] ${
                  story.user_viewed 
                    ? 'bg-muted' 
                    : 'bg-gradient-to-tr from-primary via-primary-glow to-primary'
                }`}
              >
                <div className="w-full h-full rounded-full bg-background p-[2px]">
                  <div className="w-full h-full rounded-full overflow-hidden">
                    {story.profiles?.profile_picture_url ? (
                      <img 
                        src={story.profiles.profile_picture_url} 
                        alt={story.profiles.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                        {story.profiles?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
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
  )
}

export default StoriesSection