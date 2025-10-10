import React, { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

interface ExpandableTextProps {
  text: string
  maxLength?: number
  className?: string
}

export const ExpandableText: React.FC<ExpandableTextProps> = ({ 
  text, 
  maxLength = 200,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const shouldTruncate = text.length > maxLength

  if (!shouldTruncate) {
    return <p className={`whitespace-pre-wrap ${className}`}>{text}</p>
  }

  return (
    <div>
      <p className={`whitespace-pre-wrap ${className}`}>
        {isExpanded ? text : `${text.slice(0, maxLength)}...`}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-1 text-sm text-primary hover:text-primary/80 transition-colors mt-2 font-medium"
      >
        {isExpanded ? (
          <>
            <span>Show less</span>
            <ChevronUp className="h-4 w-4" />
          </>
        ) : (
          <>
            <span>Show more</span>
            <ChevronDown className="h-4 w-4" />
          </>
        )}
      </button>
    </div>
  )
}
