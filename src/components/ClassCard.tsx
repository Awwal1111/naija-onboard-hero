import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, Clock, Users, DollarSign } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ExpertClass } from '@/hooks/useExpertClasses'
import { format } from 'date-fns'

interface ClassCardProps {
  classItem: ExpertClass
}

export const ClassCard: React.FC<ClassCardProps> = ({ classItem }) => {
  const navigate = useNavigate()

  const getStatusBadge = () => {
    if (classItem.status === 'live') {
      return <Badge className="bg-red-500 text-white animate-pulse">● LIVE</Badge>
    }
    if (classItem.status === 'scheduled') {
      return <Badge variant="secondary">Upcoming</Badge>
    }
    return <Badge variant="outline">Completed</Badge>
  }

  const getActionButton = () => {
    if (classItem.status === 'live') {
      return (
        <Button 
          onClick={() => navigate(`/expert-class/room/${classItem.id}`)}
          className="w-full bg-red-500 hover:bg-red-600 text-white"
        >
          Join Live Class
        </Button>
      )
    }
    if (classItem.status === 'scheduled') {
      return (
        <Button 
          onClick={() => navigate(`/expert-class/${classItem.id}`)}
          variant="secondary"
          className="w-full"
        >
          View Details
        </Button>
      )
    }
    return (
      <Button 
        onClick={() => navigate(`/expert-class/${classItem.id}`)}
        variant="outline"
        className="w-full"
      >
        View Recording
      </Button>
    )
  }

  const startTime = classItem.scheduled_start 
    ? format(new Date(classItem.scheduled_start), 'MMM dd, yyyy • h:mm a')
    : 'TBA'

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      {classItem.thumbnail_url && (
        <div className="h-40 bg-muted overflow-hidden">
          <img 
            src={classItem.thumbnail_url} 
            alt={classItem.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          {classItem.is_free ? (
            <Badge variant="outline" className="text-green-600">FREE</Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              ₦{classItem.price}
            </Badge>
          )}
        </div>

        <h3 className="font-semibold text-lg line-clamp-2">{classItem.title}</h3>
        
        {classItem.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {classItem.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Expert Info */}
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={classItem.expert?.avatar_url || ''} />
            <AvatarFallback>
              {classItem.expert?.full_name?.charAt(0) || 'E'}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">
            {classItem.expert?.full_name || 'Expert'}
          </span>
        </div>

        {/* Class Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>{startTime}</span>
          </div>
          
          {classItem.duration_minutes && (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{classItem.duration_minutes} minutes</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {classItem.current_participants} / {classItem.max_participants} participants
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter>
        {getActionButton()}
      </CardFooter>
    </Card>
  )
}
