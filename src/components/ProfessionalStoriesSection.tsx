import React from 'react'
import { Plus, Camera, Video, Briefcase, Lightbulb } from 'lucide-react'
import { Story } from '@/hooks/useFeed'

interface ProfessionalStoriesSectionProps {
  stories: Story[]
  onCreateStory: () => void
  onViewStory: (storyId: string) => void
  currentUserId?: string
}

const ProfessionalStoriesSection: React.FC<ProfessionalStoriesSectionProps> = ({
  stories,
  onCreateStory,
  onViewStory,
  currentUserId
}) => {
  const quickActions = [
    { icon: Camera, label: 'Work Progress', color: 'text-blue-600' },
    { icon: Video, label: 'Quick Tip', color: 'text-green-600' },
    { icon: Briefcase, label: 'Need Help?', color: 'text-purple-600' },
    { icon: Lightbulb, label: 'Idea Share', color: 'text-yellow-600' }
  ]

  return (
    <div className="px-6 py-4 border-b border-border">
      <h3 className="text-lg font-semibold text-text-primary mb-3">Professional Highlights</h3>
      
      <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
        {/* Add Story Button */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <button
            onClick={onCreateStory}
            className="w-16 h-16 bg-gradient-to-r from-primary to-primary-glow border-2 border-primary/30 rounded-full flex items-center justify-center hover:scale-105 transition-transform"
          >
            <Plus className="h-6 w-6 text-white" />
          </button>
          <span className="text-xs text-text-secondary font-medium">Add Story</span>
        </div>

        {/* Quick Action Stories */}
        {quickActions.map((action, index) => (
          <div key={index} className="flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={onCreateStory}
              className="w-16 h-16 bg-muted border-2 border-dashed border-border rounded-full flex items-center justify-center hover:bg-accent transition-colors group"
            >
              <action.icon className={`h-5 w-5 ${action.color} group-hover:scale-110 transition-transform`} />
            </button>
            <span className="text-xs text-text-secondary font-medium text-center leading-tight max-w-[70px]">
              {action.label}
            </span>
          </div>
        ))}

        {/* User Stories */}
        {stories.map((story) => (
          <div key={story.id} className="flex flex-col items-center gap-2 shrink-0">
            <button
              onClick={() => onViewStory(story.id)}
              className={`w-16 h-16 rounded-full p-0.5 transition-transform hover:scale-105 ${
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
            <span className="text-xs text-text-secondary font-medium truncate max-w-[70px]">
              {story.user_id === currentUserId ? 'You' : story.profiles?.full_name || 'User'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default ProfessionalStoriesSection