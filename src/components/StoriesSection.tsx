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
  return (
    <div className="px-6 py-4 border-b border-border">
      <div className="flex gap-4 overflow-x-auto scrollbar-hide">
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={onCreateStory}
            className="w-16 h-16 bg-muted border-2 border-dashed border-primary rounded-full flex items-center justify-center hover:bg-primary/10 transition-colors"
          >
            <Plus className="h-6 w-6 text-primary" />
          </button>
          <span className="text-xs text-text-secondary font-medium">Your Story</span>
        </div>

        {/* Stories */}
        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={() => onViewStory(story.id)}
              className={`w-16 h-16 rounded-full p-0.5 ${
                story.user_viewed 
                  ? 'bg-muted' 
                  : 'bg-gradient-to-r from-primary to-primary-glow'
              }`}
            >
              <div className="w-full h-full rounded-full bg-background p-0.5">
                <div className="w-full h-full rounded-full bg-primary flex items-center justify-center text-white font-bold text-lg overflow-hidden">
                  {story.profiles?.profile_picture_url ? (
                    <img 
                      src={story.profiles.profile_picture_url} 
                      alt={story.profiles.full_name}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    story.profiles?.full_name?.charAt(0) || 'U'
                  )}
                </div>
              </div>
            </button>
            <span className="text-xs text-text-secondary font-medium truncate max-w-[64px]">
              {story.user_id === currentUserId ? 'You' : story.profiles?.full_name || 'User'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default StoriesSection