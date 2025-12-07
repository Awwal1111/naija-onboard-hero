import React from 'react'
import { Plus } from 'lucide-react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface Story {
  id: string
  user_id: string
  media_url: string
  content?: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
  }
  viewed?: boolean
}

interface SocialStoriesRowProps {
  stories: Story[]
  onCreateStory: () => void
  onViewStory: (storyId: string) => void
  currentUserId?: string
  currentUserAvatar?: string
  currentUserName?: string
}

const SocialStoriesRow: React.FC<SocialStoriesRowProps> = ({
  stories,
  onCreateStory,
  onViewStory,
  currentUserId,
  currentUserAvatar,
  currentUserName
}) => {
  // Group stories by user, keeping only the latest per user
  const uniqueUserStories = React.useMemo(() => {
    const userMap = new Map<string, Story>()
    stories.forEach(story => {
      if (!userMap.has(story.user_id)) {
        userMap.set(story.user_id, story)
      }
    })
    return Array.from(userMap.values())
  }, [stories])

  return (
    <div className="bg-card border-b border-border py-4">
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 px-4">
          {/* Your Story - Always First */}
          <button
            onClick={onCreateStory}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
          >
            <div className="relative">
              <Avatar className="h-16 w-16 ring-2 ring-border group-hover:ring-primary/40 transition-all">
                <AvatarImage src={currentUserAvatar} className="object-cover" />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground text-lg font-semibold">
                  {currentUserName?.charAt(0) || 'Y'}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center border-2 border-card">
                <Plus className="h-3.5 w-3.5 text-primary-foreground" />
              </div>
            </div>
            <span className="text-xs font-medium text-foreground">Your Story</span>
          </button>

          {/* Other Stories */}
          {uniqueUserStories
            .filter(story => story.user_id !== currentUserId)
            .map((story) => (
              <button
                key={story.id}
                onClick={() => onViewStory(story.id)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
              >
                <div className={cn(
                  "p-0.5 rounded-full bg-gradient-to-tr transition-all",
                  story.viewed 
                    ? "from-muted to-muted" 
                    : "from-primary via-yellow-500 to-pink-500"
                )}>
                  <Avatar className="h-16 w-16 ring-2 ring-card">
                    <AvatarImage 
                      src={story.profiles?.profile_picture_url} 
                      className="object-cover"
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground text-lg font-semibold">
                      {story.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <span className={cn(
                  "text-xs font-medium max-w-16 truncate",
                  story.viewed ? "text-muted-foreground" : "text-foreground"
                )}>
                  {story.profiles?.full_name?.split(' ')[0] || 'User'}
                </span>
              </button>
            ))}
        </div>
        <ScrollBar orientation="horizontal" className="h-1.5" />
      </ScrollArea>
    </div>
  )
}

export default SocialStoriesRow
