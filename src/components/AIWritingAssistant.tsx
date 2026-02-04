import React, { useState } from 'react'
import { Sparkles, Wand2, MessageSquare, FileText, User, Briefcase, Languages, Check, X, Loader2, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

type WritingMode = 
  | 'refine_message' 
  | 'make_professional' 
  | 'make_friendly' 
  | 'make_shorter' 
  | 'make_longer'
  | 'fix_grammar'
  | 'write_bio'
  | 'write_post'
  | 'write_proposal'
  | 'write_job_description'
  | 'improve_profile'
  | 'translate_pidgin'
  | 'translate_english';

interface AIWritingAssistantProps {
  text: string
  onApply: (newText: string) => void
  context?: 'message' | 'post' | 'profile' | 'proposal' | 'job'
  placeholder?: string
  contextData?: {
    profession?: string
    industry?: string
    tone?: string
  }
  variant?: 'icon' | 'button' | 'inline'
  className?: string
}

const modeConfig: Record<WritingMode, { label: string; icon: React.ReactNode; description: string }> = {
  refine_message: { 
    label: 'Refine Message', 
    icon: <Wand2 className="h-4 w-4" />,
    description: 'Make it clearer and more impactful'
  },
  make_professional: { 
    label: 'Make Professional', 
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Formal and polished tone'
  },
  make_friendly: { 
    label: 'Make Friendly', 
    icon: <MessageSquare className="h-4 w-4" />,
    description: 'Warm and conversational'
  },
  make_shorter: { 
    label: 'Make Shorter', 
    icon: <FileText className="h-4 w-4" />,
    description: 'Condense to key points'
  },
  make_longer: { 
    label: 'Expand Text', 
    icon: <FileText className="h-4 w-4" />,
    description: 'Add more detail'
  },
  fix_grammar: { 
    label: 'Fix Grammar', 
    icon: <Check className="h-4 w-4" />,
    description: 'Correct errors only'
  },
  write_bio: { 
    label: 'Write Bio', 
    icon: <User className="h-4 w-4" />,
    description: 'Create professional bio'
  },
  write_post: { 
    label: 'Write Post', 
    icon: <FileText className="h-4 w-4" />,
    description: 'Create engaging post'
  },
  write_proposal: { 
    label: 'Write Proposal', 
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Create cover letter'
  },
  write_job_description: { 
    label: 'Write Job Post', 
    icon: <Briefcase className="h-4 w-4" />,
    description: 'Create job listing'
  },
  improve_profile: { 
    label: 'Improve Profile', 
    icon: <User className="h-4 w-4" />,
    description: 'Optimize for visibility'
  },
  translate_pidgin: { 
    label: 'Translate to Pidgin', 
    icon: <Languages className="h-4 w-4" />,
    description: 'Nigerian Pidgin English'
  },
  translate_english: { 
    label: 'Translate to English', 
    icon: <Languages className="h-4 w-4" />,
    description: 'Standard English'
  }
}

const contextModes: Record<string, WritingMode[]> = {
  message: ['refine_message', 'make_professional', 'make_friendly', 'make_shorter', 'fix_grammar', 'translate_pidgin', 'translate_english'],
  post: ['refine_message', 'write_post', 'make_professional', 'make_shorter', 'make_longer', 'fix_grammar'],
  profile: ['improve_profile', 'write_bio', 'make_professional', 'make_shorter', 'fix_grammar'],
  proposal: ['write_proposal', 'make_professional', 'refine_message', 'make_longer'],
  job: ['write_job_description', 'improve_profile', 'make_professional']
}

export const AIWritingAssistant: React.FC<AIWritingAssistantProps> = ({
  text,
  onApply,
  context = 'message',
  placeholder = 'Enter your text or describe what you want to write...',
  contextData,
  variant = 'icon',
  className = ''
}) => {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [inputText, setInputText] = useState(text)
  const [result, setResult] = useState<string | null>(null)
  const [selectedMode, setSelectedMode] = useState<WritingMode | null>(null)

  const availableModes = contextModes[context] || contextModes.message

  const handleModeSelect = async (mode: WritingMode) => {
    if (!inputText.trim() && !['write_bio', 'write_post', 'write_proposal', 'write_job_description'].includes(mode)) {
      toast({
        title: "No text provided",
        description: "Please enter some text first",
        variant: "destructive"
      })
      return
    }

    setSelectedMode(mode)
    setIsLoading(true)
    setResult(null)

    try {
      const { data, error } = await supabase.functions.invoke('ai-writing-assistant', {
        body: {
          text: inputText || `Create a ${mode.replace(/_/g, ' ')} for a ${contextData?.profession || 'professional'}`,
          mode,
          context: contextData
        }
      })

      if (error) throw error

      if (data.success) {
        setResult(data.result)
      } else {
        toast({
          title: "AI Error",
          description: data.error || "Failed to process text",
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('AI Writing error:', error)
      toast({
        title: "Error",
        description: "Failed to connect to AI. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleApply = () => {
    if (result) {
      onApply(result)
      setIsOpen(false)
      setResult(null)
      setSelectedMode(null)
      toast({
        title: "Applied! ✨",
        description: "AI suggestion applied to your text"
      })
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setInputText(text)
      setResult(null)
      setSelectedMode(null)
    }
  }

  // Quick action dropdown for inline use
  if (variant === 'inline' && text.trim()) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-7 px-2 text-xs gap-1 text-primary hover:text-primary hover:bg-primary/10 ${className}`}
          >
            <Sparkles className="h-3 w-3" />
            AI
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            Quick Actions
          </DropdownMenuLabel>
          {availableModes.slice(0, 5).map((mode) => (
            <DropdownMenuItem 
              key={mode} 
              onClick={() => {
                setInputText(text)
                handleModeSelect(mode)
                setIsOpen(true)
              }}
              className="gap-2"
            >
              {modeConfig[mode].icon}
              <div className="flex-1">
                <p className="text-sm">{modeConfig[mode].label}</p>
                <p className="text-xs text-muted-foreground">{modeConfig[mode].description}</p>
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => handleOpenChange(true)} className="gap-2">
            <Wand2 className="h-4 w-4" />
            More options...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <>
      {/* Trigger Button */}
      {variant === 'icon' ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => handleOpenChange(true)}
          className={`h-8 w-8 text-primary hover:text-primary hover:bg-primary/10 ${className}`}
          title="AI Writing Assistant"
        >
          <Sparkles className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleOpenChange(true)}
          className={`gap-2 ${className}`}
        >
          <Sparkles className="h-4 w-4" />
          AI Assist
        </Button>
      )}

      {/* Main Dialog */}
      <Dialog open={isOpen} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary/60 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              AI Writing Assistant
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Input Area */}
            <div>
              <label className="text-sm font-medium mb-2 block">Your Text</label>
              <Textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={placeholder}
                rows={4}
                className="resize-none"
              />
            </div>

            {/* Mode Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">What would you like to do?</label>
              <div className="flex flex-wrap gap-2">
                {availableModes.map((mode) => (
                  <Badge
                    key={mode}
                    variant={selectedMode === mode ? "default" : "outline"}
                    className={`cursor-pointer py-1.5 px-3 transition-all ${
                      selectedMode === mode 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-primary/10 hover:border-primary'
                    }`}
                    onClick={() => !isLoading && handleModeSelect(mode)}
                  >
                    <span className="flex items-center gap-1.5">
                      {modeConfig[mode].icon}
                      {modeConfig[mode].label}
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="text-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">AI is writing...</p>
                </div>
              </div>
            )}

            {/* Result Area */}
            {result && !isLoading && (
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  AI Suggestion
                </label>
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{result}</p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            {result && (
              <Button onClick={handleApply} className="gap-2">
                <Check className="h-4 w-4" />
                Apply
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default AIWritingAssistant
