import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Bug, 
  Loader2, 
  Send, 
  CheckCircle, 
  Sparkles, 
  AlertTriangle,
  Zap,
  Layout,
  Server,
  Smartphone
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

interface BugReportDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
}

type BugCategory = 'ui' | 'functional' | 'performance' | 'mobile' | 'other'
type BugSeverity = 'low' | 'medium' | 'high' | 'critical'

const categoryConfig: Record<BugCategory, { label: string; icon: React.ReactNode; description: string }> = {
  ui: { label: 'UI/Display Issue', icon: <Layout className="h-4 w-4" />, description: 'Visual glitches, layout problems' },
  functional: { label: 'Feature Not Working', icon: <Zap className="h-4 w-4" />, description: 'Buttons, forms, actions broken' },
  performance: { label: 'Slow/Laggy', icon: <Server className="h-4 w-4" />, description: 'App is slow or unresponsive' },
  mobile: { label: 'Mobile Issue', icon: <Smartphone className="h-4 w-4" />, description: 'Problems on mobile devices' },
  other: { label: 'Other', icon: <Bug className="h-4 w-4" />, description: 'Something else' }
}

const severityConfig: Record<BugSeverity, { label: string; color: string; description: string }> = {
  low: { label: 'Low', color: 'bg-blue-500', description: 'Minor inconvenience' },
  medium: { label: 'Medium', color: 'bg-yellow-500', description: 'Affects usability' },
  high: { label: 'High', color: 'bg-orange-500', description: 'Major feature broken' },
  critical: { label: 'Critical', color: 'bg-red-500', description: 'Cannot use platform' }
}

export const BugReportDialog: React.FC<BugReportDialogProps> = ({
  isOpen,
  onOpenChange
}) => {
  const { toast } = useToast()
  const { user } = useAuth()
  const { profile } = useProfile()
  
  const [step, setStep] = useState<'form' | 'ai_response' | 'success'>('form')
  const [isLoading, setIsLoading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  
  const [category, setCategory] = useState<BugCategory | null>(null)
  const [severity, setSeverity] = useState<BugSeverity | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [stepsToReproduce, setStepsToReproduce] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [ticketId, setTicketId] = useState('')

  const resetForm = () => {
    setStep('form')
    setCategory(null)
    setSeverity(null)
    setTitle('')
    setDescription('')
    setStepsToReproduce('')
    setAiResponse('')
    setTicketId('')
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetForm()
    }
    onOpenChange(open)
  }

  const generateAIResponse = async () => {
    if (!category || !severity || !description.trim()) {
      toast({
        title: "Missing information",
        description: "Please fill in all required fields",
        variant: "destructive"
      })
      return
    }

    setIsLoading(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('ai-bug-report', {
        body: {
          category,
          severity,
          title,
          description,
          stepsToReproduce,
          userContext: {
            userId: user?.id,
            userName: profile?.full_name,
            userEmail: user?.email
          }
        }
      })

      if (error) throw error

      if (data.success) {
        setAiResponse(data.response)
        setStep('ai_response')
      } else {
        throw new Error(data.error || 'Failed to generate response')
      }
    } catch (error: any) {
      console.error('AI Bug Report error:', error)
      // Fallback response if AI fails
      setAiResponse(getFallbackResponse(category, severity))
      setStep('ai_response')
    } finally {
      setIsLoading(false)
    }
  }

  const getFallbackResponse = (cat: BugCategory, sev: BugSeverity): string => {
    const severityText = sev === 'critical' || sev === 'high' 
      ? "We understand this is urgent and affecting your work." 
      : "We'll look into this as soon as possible."
    
    return `Thank you for reporting this ${categoryConfig[cat].label.toLowerCase()} issue. ${severityText}\n\nOur team has been notified and will investigate. You'll receive updates via email.\n\nIn the meantime, try refreshing the page or clearing your browser cache as a temporary fix.`
  }

  const submitBugReport = async () => {
    setIsSending(true)
    
    try {
      // Generate ticket ID
      const newTicketId = `BUG-${Date.now().toString(36).toUpperCase()}`
      setTicketId(newTicketId)

      // Send email to support
      const { error: emailError } = await supabase.functions.invoke('send-bug-report', {
        body: {
          ticketId: newTicketId,
          category,
          severity,
          title: title || `${categoryConfig[category!].label} Report`,
          description,
          stepsToReproduce,
          aiResponse,
          userInfo: {
            userId: user?.id || 'anonymous',
            userName: profile?.full_name || 'Unknown User',
            userEmail: user?.email || 'No email',
            userPhone: profile?.phone_number || 'No phone'
          },
          metadata: {
            userAgent: navigator.userAgent,
            url: window.location.href,
            timestamp: new Date().toISOString()
          }
        }
      })

      if (emailError) {
        console.error('Email error:', emailError)
        // Continue anyway - the report is still valuable
      }

      // Store in database
      const { error: dbError } = await supabase
        .from('support_tickets')
        .insert({
          name: profile?.full_name || 'Anonymous User',
          email: user?.email || 'no-email@naijalancers.name.ng',
          subject: title || `${categoryConfig[category!].label}: ${description.slice(0, 50)}...`,
          description: `**Category:** ${categoryConfig[category!].label}\n**Severity:** ${severityConfig[severity!].label}\n\n**Description:**\n${description}\n\n**Steps to Reproduce:**\n${stepsToReproduce || 'Not provided'}\n\n**AI Response:**\n${aiResponse}`,
          category: 'bug_report',
          status: severity === 'critical' ? 'urgent' : 'open',
          priority: severity === 'critical' ? 'urgent' : severity === 'high' ? 'high' : 'normal'
        })

      if (dbError) {
        console.error('DB error:', dbError)
      }

      setStep('success')
      
      toast({
        title: "Bug Report Submitted! 🎉",
        description: `Ticket ID: ${newTicketId}`,
      })
    } catch (error: any) {
      console.error('Submit bug report error:', error)
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive"
      })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-orange-500 rounded-lg flex items-center justify-center">
              <Bug className="h-4 w-4 text-white" />
            </div>
            {step === 'success' ? 'Report Submitted!' : 'Report a Bug'}
          </DialogTitle>
          <DialogDescription>
            {step === 'form' && "Help us improve NaijaLancers by reporting issues you encounter."}
            {step === 'ai_response' && "Here's what we understand about your issue."}
            {step === 'success' && "Thank you for helping us improve!"}
          </DialogDescription>
        </DialogHeader>

        {step === 'form' && (
          <div className="space-y-4">
            {/* Category Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">What type of issue is this? *</Label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(categoryConfig) as BugCategory[]).map((cat) => (
                  <Badge
                    key={cat}
                    variant={category === cat ? "default" : "outline"}
                    className={`cursor-pointer py-2 px-3 justify-start transition-all ${
                      category === cat 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-primary/10 hover:border-primary'
                    }`}
                    onClick={() => setCategory(cat)}
                  >
                    <span className="flex items-center gap-2">
                      {categoryConfig[cat].icon}
                      <span className="text-xs">{categoryConfig[cat].label}</span>
                    </span>
                  </Badge>
                ))}
              </div>
            </div>

            {/* Severity Selection */}
            <div>
              <Label className="text-sm font-medium mb-2 block">How severe is this issue? *</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(severityConfig) as BugSeverity[]).map((sev) => (
                  <Badge
                    key={sev}
                    variant={severity === sev ? "default" : "outline"}
                    className={`cursor-pointer py-1.5 px-3 transition-all ${
                      severity === sev 
                        ? `${severityConfig[sev].color} text-white border-transparent` 
                        : 'hover:bg-muted'
                    }`}
                    onClick={() => setSeverity(sev)}
                  >
                    {severityConfig[sev].label}
                  </Badge>
                ))}
              </div>
              {severity && (
                <p className="text-xs text-muted-foreground mt-1">
                  {severityConfig[severity].description}
                </p>
              )}
            </div>

            {/* Title */}
            <div>
              <Label htmlFor="bug-title" className="text-sm font-medium mb-2 block">
                Brief Title (optional)
              </Label>
              <Input
                id="bug-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Profile dialog won't close"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="bug-description" className="text-sm font-medium mb-2 block">
                Describe the issue *
              </Label>
              <Textarea
                id="bug-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What happened? What did you expect to happen?"
                rows={3}
                className="resize-none"
              />
            </div>

            {/* Steps to Reproduce */}
            <div>
              <Label htmlFor="bug-steps" className="text-sm font-medium mb-2 block">
                Steps to reproduce (optional)
              </Label>
              <Textarea
                id="bug-steps"
                value={stepsToReproduce}
                onChange={(e) => setStepsToReproduce(e.target.value)}
                placeholder="1. Go to...\n2. Click on...\n3. See error..."
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
        )}

        {step === 'ai_response' && (
          <div className="space-y-4">
            {/* Issue Summary */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="gap-1">
                {category && categoryConfig[category].icon}
                {category && categoryConfig[category].label}
              </Badge>
              <Badge className={`${severity && severityConfig[severity].color} text-white`}>
                {severity && severityConfig[severity].label} Priority
              </Badge>
            </div>

            {/* AI Response */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">AI Response</span>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">{aiResponse}</p>
            </div>

            {/* Warning for critical bugs */}
            {severity === 'critical' && (
              <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-500">Critical Issue Detected</p>
                  <p className="text-muted-foreground">This report will be sent immediately to our support team at support@naijalancers.name.ng</p>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 'success' && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <p className="font-medium text-lg">Thank you for your report!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your ticket ID is: <span className="font-mono font-medium">{ticketId}</span>
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Our team has been notified and will investigate. 
              {user?.email && ` Updates will be sent to ${user.email}`}
            </p>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {step === 'form' && (
            <>
              <Button variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={generateAIResponse}
                disabled={!category || !severity || !description.trim() || isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'ai_response' && (
            <>
              <Button variant="outline" onClick={() => setStep('form')}>
                Edit Report
              </Button>
              <Button 
                onClick={submitBugReport}
                disabled={isSending}
                className="gap-2"
              >
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Report
                  </>
                )}
              </Button>
            </>
          )}

          {step === 'success' && (
            <Button onClick={() => handleOpenChange(false)} className="w-full">
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default BugReportDialog