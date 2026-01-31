import React from 'react'
import { Badge } from '@/components/ui/badge'
import { useTimezone } from '@/hooks/useTimezone'
import { Clock } from 'lucide-react'

interface TimestampDisplayProps {
  date: string | Date
  showRelative?: boolean
  showTime?: boolean
  showDate?: boolean
  showTimezone?: boolean
  className?: string
}

export const TimestampDisplay: React.FC<TimestampDisplayProps> = ({
  date,
  showRelative = false,
  showTime = true,
  showDate = true,
  showTimezone = false,
  className = ''
}) => {
  const { formatDateTime, formatRelative, formatTime, formatDate, getCurrentTimezoneLabel } = useTimezone()

  if (showRelative) {
    return (
      <span className={`text-muted-foreground ${className}`}>
        {formatRelative(date)}
      </span>
    )
  }

  const displayParts: string[] = []
  if (showDate) displayParts.push(formatDate(date))
  if (showTime) displayParts.push(formatTime(date))

  return (
    <span className={`flex items-center gap-1 ${className}`}>
      <span>{displayParts.join(' • ')}</span>
      {showTimezone && (
        <Badge variant="outline" className="text-xs ml-1">
          <Clock className="h-3 w-3 mr-1" />
          {getCurrentTimezoneLabel().split('(')[0].trim()}
        </Badge>
      )}
    </span>
  )
}

// Utility for formatting dates in lists
export const useFormattedDate = (date: string | Date) => {
  const { formatRelative, formatDateTime, formatDate, formatTime } = useTimezone()
  
  return {
    relative: formatRelative(date),
    full: formatDateTime(date),
    date: formatDate(date),
    time: formatTime(date)
  }
}
