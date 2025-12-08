import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, DollarSign, Share2, Video, Play } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ExpertClass } from '@/hooks/useExpertClasses'
import { format, formatDistanceToNow, differenceInSeconds } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

interface ClassCardProps {
  classItem: ExpertClass
}

export const ClassCard: React.FC<ClassCardProps> = ({ classItem }) => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const isExpert = classItem.expert_id === user?.id
  const [countdown, setCountdown] = useState('')

  // Countdown timer for upcoming classes
  useEffect(() => {
    if (classItem.status !== 'scheduled' || !classItem.scheduled_start) return

    const updateCountdown = () => {
      const now = new Date()
      const start = new Date(classItem.scheduled_start!)
      const diff = differenceInSeconds(start, now)
      
      if (diff <= 0) {
        setCountdown('Starting soon...')
        return
      }

      const days = Math.floor(diff / 86400)
      const hours = Math.floor((diff % 86400) / 3600)
      const minutes = Math.floor((diff % 3600) / 60)
      const seconds = diff % 60

      if (days > 0) {
        setCountdown(`${days}d ${hours}h ${minutes}m`)
      } else if (hours > 0) {
        setCountdown(`${hours}h ${minutes}m ${seconds}s`)
      } else {
        setCountdown(`${minutes}m ${seconds}s`)
      }
    }

    updateCountdown()
    const interval = setInterval(updateCountdown, 1000)
    return () => clearInterval(interval)
  }, [classItem.status, classItem.scheduled_start])

  const handleShareClass = (e: React.MouseEvent) => {
    e.stopPropagation()
    const classUrl = `${window.location.origin}/expert-class/room/${classItem.id}`
    navigator.clipboard.writeText(classUrl)
    toast({
      title: 'Link Copied!',
      description: 'Class link copied to clipboard',
    })
  }

  const handleAction = () => {
    if (!user) {
      navigate('/login')
      return
    }
    navigate(`/expert-class/room/${classItem.id}`)
  }

  const getStatusBadge = () => {
    if (classItem.status === 'live') {
      return (
        <Badge className="bg-red-500 hover:bg-red-500 text-white">
          <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />
          LIVE
        </Badge>
      )
    }
    if (classItem.status === 'scheduled') {
      return <Badge variant="secondary">Upcoming</Badge>
    }
    if (classItem.status === 'ended') {
      return <Badge variant="outline" className="text-muted-foreground">Ended</Badge>
    }
    return null
  }

  const getActionButton = () => {
    if (!user) {
      return (
        <Button onClick={handleAction} variant="outline" size="sm" className="w-full">
          Login to Join
        </Button>
      )
    }

    if (classItem.status === 'live') {
      return (
        <Button onClick={handleAction} size="sm" className="w-full bg-red-500 hover:bg-red-600">
          <Play className="h-3.5 w-3.5 mr-1.5" />
          {isExpert ? 'Enter Class' : 'Join Live'}
        </Button>
      )
    }
    
    if (classItem.status === 'scheduled') {
      const now = new Date()
      const scheduledStart = classItem.scheduled_start ? new Date(classItem.scheduled_start) : null
      const canJoin = scheduledStart && (now >= new Date(scheduledStart.getTime() - 10 * 60 * 1000))
      
      return (
        <Button 
          onClick={handleAction} 
          size="sm" 
          className="w-full"
          disabled={!isExpert && !canJoin}
        >
          <Video className="h-3.5 w-3.5 mr-1.5" />
          {isExpert ? 'Start Class' : canJoin ? 'Join Waiting Room' : 'Set Reminder'}
        </Button>
      )
    }
    
    if (classItem.recording_url) {
      return (
        <Button 
          onClick={() => window.open(classItem.recording_url, '_blank')}
          variant="secondary" 
          size="sm" 
          className="w-full"
        >
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Watch Recording
        </Button>
      )
    }

    return (
      <Button variant="outline" size="sm" className="w-full" disabled>
        No Recording
      </Button>
    )
  }

  const startTime = classItem.scheduled_start 
    ? format(new Date(classItem.scheduled_start), 'MMM dd • h:mm a')
    : 'TBA'

  // Default thumbnail gradient based on category
  const getDefaultThumbnail = () => {
    const colors = [
      'from-blue-500 to-purple-600',
      'from-green-500 to-teal-600',
      'from-orange-500 to-red-600',
      'from-pink-500 to-rose-600',
      'from-indigo-500 to-blue-600',
    ]
    const index = (classItem.title?.length || 0) % colors.length
    return colors[index]
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-all group cursor-pointer" onClick={handleAction}>
      {/* Thumbnail */}
      <div className="relative h-36 overflow-hidden">
        {classItem.thumbnail_url ? (
          <img 
            src={classItem.thumbnail_url} 
            alt={classItem.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className={`w-full h-full bg-gradient-to-br ${getDefaultThumbnail()} flex items-center justify-center`}>
            <Video className="h-10 w-10 text-white/80" />
          </div>
        )}
        
        {/* Overlay badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {getStatusBadge()}
        </div>
        
        <div className="absolute top-2 right-2">
          {classItem.is_free ? (
            <Badge className="bg-green-500/90 hover:bg-green-500 text-white text-xs">FREE</Badge>
          ) : (
            <Badge className="bg-background/90 text-foreground text-xs">
              ₦{classItem.price?.toLocaleString()}
            </Badge>
          )}
        </div>

        {/* Countdown for upcoming */}
        {classItem.status === 'scheduled' && countdown && (
          <div className="absolute bottom-2 right-2">
            <Badge variant="secondary" className="bg-background/90 text-xs font-mono">
              {countdown}
            </Badge>
          </div>
        )}

        {/* Live indicator overlay */}
        {classItem.status === 'live' && (
          <div className="absolute inset-0 bg-red-500/10 pointer-events-none" />
        )}
      </div>
      
      <CardContent className="p-3 space-y-2">
        <h3 className="font-semibold text-sm line-clamp-2 leading-tight">{classItem.title}</h3>
        
        {/* Expert Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={classItem.expert?.avatar_url || ''} />
            <AvatarFallback className="text-xs">
              {classItem.expert?.full_name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground truncate">
            {classItem.expert?.full_name || 'Expert'}
          </span>
        </div>

        {/* Class Details */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{startTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{classItem.current_participants}/{classItem.max_participants}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-3 pt-0 flex gap-2">
        <div className="flex-1" onClick={(e) => e.stopPropagation()}>
          {getActionButton()}
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 shrink-0"
          onClick={handleShareClass}
        >
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  )
}
