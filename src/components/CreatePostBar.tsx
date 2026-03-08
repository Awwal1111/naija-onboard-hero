import React from 'react'
import { Camera, FileText, Briefcase, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'

interface CreatePostBarProps {
  profilePictureUrl?: string
  fullName?: string
  onCreatePost: () => void
}

const quickActions = [
  { icon: Camera, label: 'Photo', color: 'text-emerald-600' },
  { icon: FileText, label: 'Article', color: 'text-blue-600' },
  { icon: Briefcase, label: 'Job', color: 'text-amber-600' },
  { icon: Calendar, label: 'Event', color: 'text-rose-500' },
]

const CreatePostBar: React.FC<CreatePostBarProps> = ({ profilePictureUrl, fullName, onCreatePost }) => {
  return (
    <div className="bg-card border-b border-border/50">
      <div className="p-4 pb-2">
        <div 
          onClick={onCreatePost}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <Avatar className="h-10 w-10 ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
            <AvatarImage src={profilePictureUrl} />
            <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
              {fullName?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 py-2.5 px-4 bg-muted/30 hover:bg-muted/50 rounded-full transition-all duration-200 border border-border/40 hover:border-border">
            <span className="text-muted-foreground text-sm">Share something with the community...</span>
          </div>
        </div>
      </div>
      {/* Quick action buttons */}
      <div className="flex items-center justify-around px-4 pb-3 pt-1">
        {quickActions.map(({ icon: Icon, label, color }) => (
          <button
            key={label}
            onClick={onCreatePost}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-muted/40 transition-colors text-sm"
          >
            <Icon className={`h-4 w-4 ${color}`} />
            <span className="text-muted-foreground font-medium hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default CreatePostBar
