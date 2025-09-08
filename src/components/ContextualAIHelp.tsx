import React, { useState } from 'react'
import { HelpCircle, Sparkles, X, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ContextualAIHelpProps {
  context: string
  suggestions: string[]
  onAskAI: (question: string) => void
}

const ContextualAIHelp: React.FC<ContextualAIHelpProps> = ({ 
  context, 
  suggestions, 
  onAskAI 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [hasBeenShown, setHasBeenShown] = useState(false)

  React.useEffect(() => {
    if (!hasBeenShown) {
      const timer = setTimeout(() => {
        setIsVisible(true)
        setHasBeenShown(true)
      }, 3000) // Show after 3 seconds
      return () => clearTimeout(timer)
    }
  }, [hasBeenShown])

  if (!isVisible) {
    return (
      <div className="fixed bottom-24 left-6 z-40">
        <Button
          onClick={() => setIsVisible(true)}
          className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 shadow-lg"
        >
          <HelpCircle className="h-5 w-5 text-white" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-24 left-6 z-40 max-w-sm">
      <Card className="shadow-xl border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                <Lightbulb className="h-3 w-3 text-white" />
              </div>
              <span className="text-sm font-medium text-text-primary">Quick Help</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          <p className="text-xs text-text-secondary mb-3">{context}</p>
          
          <div className="space-y-2">
            {suggestions.slice(0, 3).map((suggestion, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer text-xs py-1 px-2 hover:bg-blue-100 hover:border-blue-300 dark:hover:bg-blue-900/50 transition-colors w-full justify-start"
                onClick={() => {
                  onAskAI(suggestion)
                  setIsVisible(false)
                }}
              >
                {suggestion}
              </Badge>
            ))}
          </div>
          
          <Button
            onClick={() => {
              onAskAI("I need help with this page")
              setIsVisible(false)
            }}
            size="sm"
            className="w-full mt-3 text-xs"
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Ask AI Assistant
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default ContextualAIHelp