import React from 'react'
import { Camera, Briefcase, Star, FileText, User, Image } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ChatContext {
  context?: 'story' | 'gig' | 'expert' | 'job' | 'post' | 'profile'
  context_label?: string
  story_id?: string
  story_content?: string
  gig_id?: string
  gig_title?: string
  expert_id?: string
  job_id?: string
  job_title?: string
  post_id?: string
}

interface ChatContextBadgeProps {
  payload?: ChatContext | null
  className?: string
}

const ChatContextBadge: React.FC<ChatContextBadgeProps> = ({ payload, className = '' }) => {
  if (!payload?.context) return null

  const getContextInfo = () => {
    switch (payload.context) {
      case 'story':
        return {
          icon: Camera,
          label: payload.context_label || 'From Story',
          color: 'bg-purple-500/20 text-purple-600 border-purple-500/30',
          description: payload.story_content
        }
      case 'gig':
        return {
          icon: Briefcase,
          label: payload.context_label || 'From Gig',
          color: 'bg-blue-500/20 text-blue-600 border-blue-500/30',
          description: payload.gig_title
        }
      case 'expert':
        return {
          icon: Star,
          label: payload.context_label || 'From Expert Profile',
          color: 'bg-yellow-500/20 text-yellow-600 border-yellow-500/30',
          description: null
        }
      case 'job':
        return {
          icon: FileText,
          label: payload.context_label || 'From Job Post',
          color: 'bg-green-500/20 text-green-600 border-green-500/30',
          description: payload.job_title
        }
      case 'post':
        return {
          icon: Image,
          label: payload.context_label || 'From Post',
          color: 'bg-primary/20 text-primary border-primary/30',
          description: null
        }
      case 'profile':
        return {
          icon: User,
          label: payload.context_label || 'From Profile',
          color: 'bg-muted text-muted-foreground border-border',
          description: null
        }
      default:
        return null
    }
  }

  const contextInfo = getContextInfo()
  if (!contextInfo) return null

  const Icon = contextInfo.icon

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <Badge 
        variant="outline" 
        className={`text-xs font-medium flex items-center gap-1.5 w-fit ${contextInfo.color}`}
      >
        <Icon className="h-3 w-3" />
        {contextInfo.label}
      </Badge>
      {contextInfo.description && (
        <p className="text-xs text-muted-foreground italic line-clamp-1 ml-1">
          "{contextInfo.description}"
        </p>
      )}
    </div>
  )
}

export default ChatContextBadge
