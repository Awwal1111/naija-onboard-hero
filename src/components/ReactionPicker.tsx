import React, { useState } from 'react'
import { Heart, Laugh, Frown, ThumbsUp, MessageCircle, Zap, Shield } from 'lucide-react'

interface ReactionPickerProps {
  onReact: (reactionType: string) => void
  currentReaction?: string
  className?: string
}

const reactionTypes = [
  { type: 'like', icon: ThumbsUp, label: 'Like', color: 'text-blue-500', bgColor: 'bg-blue-50 hover:bg-blue-100' },
  { type: 'love', icon: Heart, label: 'Love', color: 'text-red-500', bgColor: 'bg-red-50 hover:bg-red-100' },
  { type: 'laugh', icon: Laugh, label: 'Laugh', color: 'text-yellow-500', bgColor: 'bg-yellow-50 hover:bg-yellow-100' },
  { type: 'wow', icon: Zap, label: 'Wow', color: 'text-purple-500', bgColor: 'bg-purple-50 hover:bg-purple-100' },
  { type: 'sad', icon: Frown, label: 'Sad', color: 'text-gray-500', bgColor: 'bg-gray-50 hover:bg-gray-100' },
  { type: 'angry', icon: MessageCircle, label: 'Angry', color: 'text-orange-500', bgColor: 'bg-orange-50 hover:bg-orange-100' },
  { type: 'support', icon: Shield, label: 'Support', color: 'text-green-500', bgColor: 'bg-green-50 hover:bg-green-100' }
]

const ReactionPicker: React.FC<ReactionPickerProps> = ({ 
  onReact, 
  currentReaction, 
  className = '' 
}) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleReaction = (reactionType: string) => {
    onReact(reactionType)
    setIsOpen(false)
  }

  const getCurrentReactionConfig = () => {
    return reactionTypes.find(r => r.type === currentReaction)
  }

  const currentConfig = getCurrentReactionConfig()

  return (
    <div className={`relative ${className}`}>
      {/* Main reaction button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all flex-1 justify-center ${
          currentReaction
            ? `${currentConfig?.color} ${currentConfig?.bgColor}`
            : 'text-text-secondary hover:text-primary hover:bg-primary/10'
        }`}
      >
        {currentConfig ? (
          <currentConfig.icon className="h-5 w-5" />
        ) : (
          <ThumbsUp className="h-5 w-5" />
        )}
        <span className="text-lg">👍</span>
      </button>

      {/* Reaction picker popup */}
      {isOpen && (
        <div 
          className="absolute bottom-full left-0 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-border p-2 z-50 min-w-max"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex gap-1">
            {reactionTypes.map((reaction) => (
              <button
                key={reaction.type}
                onClick={() => handleReaction(reaction.type)}
                className={`
                  flex flex-col items-center gap-1 p-3 rounded-xl transition-all hover:scale-110 
                  ${reaction.bgColor} ${reaction.color}
                  ${currentReaction === reaction.type ? 'ring-2 ring-primary' : ''}
                `}
                title={reaction.label}
              >
                <reaction.icon className="h-6 w-6" />
                <span className="text-xs font-medium">{reaction.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default ReactionPicker