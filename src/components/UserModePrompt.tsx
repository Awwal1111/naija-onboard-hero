import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Briefcase, UserCheck, Shuffle, ArrowRight, Sparkles } from 'lucide-react'
import { useUserMode, UserMode } from '@/hooks/useUserMode'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface UserModePromptProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export const UserModePrompt: React.FC<UserModePromptProps> = ({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { mode, setMode, isLoading: modeLoading } = useUserMode()
  const [internalOpen, setInternalOpen] = useState(false)
  const [selectedMode, setSelectedMode] = useState<UserMode | null>(null)
  const [saving, setSaving] = useState(false)

  // Determine if this is controlled or uncontrolled
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const onOpenChange = isControlled ? controlledOnOpenChange : setInternalOpen

  // Check if user needs to be prompted (existing user without user_mode set)
  useEffect(() => {
    if (!isControlled && user && profile && !modeLoading) {
      const p = profile as any
      // Show prompt if:
      // 1. User exists and has completed basic profile
      // 2. But hasn't set user_mode in database (it's null or defaulted)
      const hasNoUserMode = !p.user_mode
      const isRecentOnboarding = p.onboarding_completed && p.updated_at && 
        (Date.now() - new Date(p.updated_at).getTime()) < 60000 // Skip if onboarded < 1 min ago
      const hasCompletedBasicProfile = p.full_name && p.onboarding_completed !== false
      const hasNotDismissed = !localStorage.getItem('user_mode_prompt_dismissed')
      
      if (hasNoUserMode && hasCompletedBasicProfile && hasNotDismissed && !isRecentOnboarding) {
        // Small delay to not interrupt initial load
        const timer = setTimeout(() => setInternalOpen(true), 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [user, profile, modeLoading, isControlled])

  const handleSelectMode = async () => {
    if (!selectedMode || !user) return

    setSaving(true)
    try {
      // Update profile with user_mode
      await supabase
        .from('profiles')
        .update({ user_mode: selectedMode } as any)
        .eq('user_id', user.id)

      // Update local state
      await setMode(selectedMode)

      const modeLabels = {
        freelancer: 'Freelancer',
        client: 'Client',
        both: 'Both'
      }

      toast.success(`Welcome! You're set up as a ${modeLabels[selectedMode]}`, {
        description: selectedMode === 'freelancer' 
          ? "We'll show you jobs and earning opportunities"
          : selectedMode === 'client'
          ? "We'll help you find and hire talent"
          : "You'll see both hiring and earning features"
      })

      onOpenChange?.(false)
    } catch (error) {
      console.error('Failed to set user mode:', error)
      toast.error('Failed to save preference')
    } finally {
      setSaving(false)
    }
  }

  const handleSkip = () => {
    localStorage.setItem('user_mode_prompt_dismissed', 'true')
    onOpenChange?.(false)
  }

  const modes = [
    {
      value: 'freelancer' as UserMode,
      label: 'Freelancer',
      description: 'I offer services and want to earn money',
      icon: Briefcase,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
      features: ['Find job opportunities', 'Create & sell gigs', 'Build your portfolio']
    },
    {
      value: 'client' as UserMode,
      label: 'Client / Hirer',
      description: 'I want to hire talent for my projects',
      icon: UserCheck,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950',
      features: ['Post jobs & contests', 'Browse verified experts', 'AI-powered matching']
    },
    {
      value: 'both' as UserMode,
      label: 'Both',
      description: 'I do both - hire and offer services',
      icon: Shuffle,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
      features: ['Access all features', 'Flexible dashboard', 'Full platform access']
    }
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 px-6 py-5">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-primary/10">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">How will you use NaijaLancers?</DialogTitle>
            </div>
            <DialogDescription className="text-sm">
              Help us personalize your experience by telling us your primary role
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Options */}
        <div className="p-6 space-y-3">
          {modes.map((modeOption) => (
            <button
              key={modeOption.value}
              onClick={() => setSelectedMode(modeOption.value)}
              className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                selectedMode === modeOption.value
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border hover:border-primary/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`p-2.5 rounded-xl ${modeOption.bgColor}`}>
                  <modeOption.icon className={`h-5 w-5 ${modeOption.color}`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-foreground">{modeOption.label}</p>
                    {selectedMode === modeOption.value && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                        <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{modeOption.description}</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {modeOption.features.map((feature, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <Button variant="ghost" onClick={handleSkip} className="flex-1">
            Skip for now
          </Button>
          <Button 
            onClick={handleSelectMode} 
            disabled={!selectedMode || saving}
            className="flex-1 gap-2"
          >
            {saving ? 'Saving...' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4 px-6">
          You can change this anytime in Settings → Account Mode
        </p>
      </DialogContent>
    </Dialog>
  )
}

export default UserModePrompt
