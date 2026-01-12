import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wallet, CheckCircle, User, Briefcase, Mail, Loader2, Globe, MapPin } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useMiniPayContext } from './MiniPayAuthWrapper'
import { useNigerianStates } from '@/hooks/useNigerianStates'

interface MiniPayProfileCompletionProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onComplete: () => void
  actionName?: string
}

const PROFESSIONS = [
  'Software Developer',
  'Web Designer',
  'Graphics Designer',
  'Content Writer',
  'Video Editor',
  'Social Media Manager',
  'Virtual Assistant',
  'Data Entry',
  'Digital Marketer',
  'Photographer',
  'Translator',
  'Accountant',
  'Teacher/Tutor',
  'Customer Service',
  'Other'
]

const COUNTRIES = [
  'Nigeria',
  'Ghana',
  'Kenya',
  'South Africa',
  'Tanzania',
  'Uganda',
  'Rwanda',
  'Ethiopia',
  'Egypt',
  'Morocco',
  'Cameroon',
  'Ivory Coast',
  'Senegal',
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'France',
  'Netherlands',
  'India',
  'Brazil',
  'Other'
]

/**
 * MiniPayProfileCompletion is shown when a MiniPay user with incomplete profile
 * tries to perform a protected action. This is NOT a login/signup form.
 * The user already exists - we're just collecting additional details.
 */
export const MiniPayProfileCompletion = ({
  open,
  onOpenChange,
  onComplete,
  actionName = 'continue'
}: MiniPayProfileCompletionProps) => {
  const { walletAddress, userId, refreshUserState } = useMiniPayContext()
  const { toast } = useToast()
  const { states, loadingStates, fetchLGAs } = useNigerianStates()
  
  const [formData, setFormData] = useState({
    fullName: '',
    profession: '',
    email: '',
    country: '',
    state: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch LGAs when state changes (Nigeria only)
  useEffect(() => {
    if (formData.country === 'Nigeria' && formData.state) {
      fetchLGAs(formData.state)
    }
  }, [formData.state, formData.country, fetchLGAs])

  // Reset state when country changes away from Nigeria
  useEffect(() => {
    if (formData.country !== 'Nigeria') {
      setFormData(prev => ({ ...prev, state: '' }))
    }
  }, [formData.country])

  const isNigeria = formData.country === 'Nigeria'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.fullName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue",
        variant: "destructive"
      })
      return
    }

    if (!formData.profession) {
      toast({
        title: "Profession required",
        description: "Please select your profession",
        variant: "destructive"
      })
      return
    }

    if (!formData.country) {
      toast({
        title: "Country required",
        description: "Please select your country",
        variant: "destructive"
      })
      return
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "Unable to update profile. Please try again.",
        variant: "destructive"
      })
      return
    }

    setIsSubmitting(true)

    try {
      // Build update object
      const updateData: Record<string, any> = {
        full_name: formData.fullName.trim(),
        profession: formData.profession,
        country: formData.country,
        onboarding_completed: true,
        updated_at: new Date().toISOString()
      }

      // Only add state for Nigeria
      if (isNigeria && formData.state) {
        updateData.state = formData.state
      }

      // Update the user's profile
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', userId)

      if (error) {
        console.error('[MiniPayProfile] Update error:', error)
        toast({
          title: "Update failed",
          description: "Could not save your profile. Please try again.",
          variant: "destructive"
        })
        setIsSubmitting(false)
        return
      }

      // Refresh the user state to reflect changes
      await refreshUserState()

      toast({
        title: "Profile completed!",
        description: `Welcome to NaijaLancers, ${formData.fullName.split(' ')[0]}!`
      })

      setIsSubmitting(false)
      onOpenChange(false)
      onComplete()
    } catch (error) {
      console.error('[MiniPayProfile] Error:', error)
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5 text-primary" />
            Complete Your Profile
          </DialogTitle>
          <DialogDescription>
            Just a few details to {actionName}. Your wallet is already connected!
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Wallet Badge */}
          {walletAddress && (
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <Wallet className="h-4 w-4 text-primary" />
                <span className="text-muted-foreground">Connected:</span>
                <span className="font-mono text-xs truncate flex-1">{walletAddress}</span>
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
              </div>
            </div>
          )}

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="fullName" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Your Name
            </Label>
            <Input
              id="fullName"
              placeholder="Enter your full name"
              value={formData.fullName}
              onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
              className="h-11"
              autoFocus
            />
          </div>

          {/* Profession */}
          <div className="space-y-2">
            <Label htmlFor="profession" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Profession / Skill
            </Label>
            <Select
              value={formData.profession}
              onValueChange={(value) => setFormData(prev => ({ ...prev, profession: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select your profession" />
              </SelectTrigger>
              <SelectContent>
                {PROFESSIONS.map((prof) => (
                  <SelectItem key={prof} value={prof}>{prof}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label htmlFor="country" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Country
            </Label>
            <Select
              value={formData.country}
              onValueChange={(value) => setFormData(prev => ({ ...prev, country: value }))}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country} value={country}>{country}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* State - Only for Nigeria */}
          {isNigeria && (
            <div className="space-y-2">
              <Label htmlFor="state" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                State
              </Label>
              <Select
                value={formData.state}
                onValueChange={(value) => setFormData(prev => ({ ...prev, state: value }))}
                disabled={loadingStates}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={loadingStates ? "Loading..." : "Select your state"} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((state) => (
                    <SelectItem key={state.id} value={state.name}>{state.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Email (Optional for MiniPay users) */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              For notifications and receipts. You can add this later.
            </p>
          </div>

          {/* Submit Button */}
          <BrandButton 
            type="submit" 
            className="w-full h-12 text-base font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Complete & Continue'
            )}
          </BrandButton>

          <p className="text-xs text-center text-muted-foreground">
            By continuing, you agree to our Terms of Service
          </p>
        </form>
      </DialogContent>
    </Dialog>
  )
}
