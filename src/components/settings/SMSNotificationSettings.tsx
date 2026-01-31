import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Globe, Smartphone, Info } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

// SMS pricing in NC
const SMS_PRICING = {
  nigeria: 10,
  international: 25
}

export const SMSNotificationSettings = () => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [jobAlertsSMS, setJobAlertsSMS] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Check if user has phone number
  const hasPhone = !!profile?.phone_number

  // Detect if Nigerian number
  const isNigerianNumber = () => {
    if (!profile?.phone_number) return true // Default to Nigerian pricing
    const phone = profile.phone_number.replace(/\s+/g, '').replace(/-/g, '')
    return phone.startsWith('+234') || phone.startsWith('234') || (phone.startsWith('0') && phone.length === 11)
  }

  const smsCost = isNigerianNumber() ? SMS_PRICING.nigeria : SMS_PRICING.international

  // Load current settings
  useEffect(() => {
    if (user?.id) {
      loadSettings()
    }
  }, [user?.id])

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('sms_job_alerts')
        .eq('user_id', user!.id)
        .single()

      if (data) {
        setJobAlertsSMS((data as any).sms_job_alerts || false)
      }
    } catch (error) {
      console.error('Error loading SMS settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleJobAlerts = async (enabled: boolean) => {
    if (!hasPhone) {
      toast.error('Please add a phone number in your profile first')
      return
    }

    // Check balance
    const currentBalance = profile?.balance_withdrawable || 0
    if (enabled && currentBalance < smsCost) {
      toast.error(`Insufficient balance. You need at least ${smsCost} NC for SMS alerts.`)
      return
    }

    setJobAlertsSMS(enabled)

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ sms_job_alerts: enabled } as any)
        .eq('user_id', user!.id)

      if (error) throw error

      toast.success(enabled 
        ? `Job SMS alerts enabled! (${smsCost} NC per SMS)` 
        : 'Job SMS alerts disabled'
      )
    } catch (error) {
      console.error('Error updating SMS settings:', error)
      setJobAlertsSMS(!enabled) // Revert
      toast.error('Failed to update SMS settings')
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse h-20 bg-muted rounded"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          SMS Notifications
        </CardTitle>
        <CardDescription>
          Get important alerts via SMS. Charges apply per message.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pricing Info */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">🇳🇬</span>
                <span>Nigeria: <strong>{SMS_PRICING.nigeria} NC</strong>/SMS</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                <span>International: <strong>{SMS_PRICING.international} NC</strong>/SMS</span>
              </div>
            </div>
          </AlertDescription>
        </Alert>

        {/* No Phone Warning */}
        {!hasPhone && (
          <Alert variant="destructive">
            <AlertDescription>
              Add a phone number to your profile to enable SMS notifications.
            </AlertDescription>
          </Alert>
        )}

        {/* Job Alerts Toggle */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="job-sms" className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Job Alerts via SMS
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when new jobs match your skills
            </p>
            <Badge variant="secondary" className="text-xs">
              {isNigerianNumber() ? (
                <>🇳🇬 {SMS_PRICING.nigeria} NC per alert</>
              ) : (
                <>🌍 {SMS_PRICING.international} NC per alert</>
              )}
            </Badge>
          </div>
          <Switch
            id="job-sms"
            checked={jobAlertsSMS}
            onCheckedChange={handleToggleJobAlerts}
            disabled={!hasPhone}
          />
        </div>

        {/* Current Balance */}
        {hasPhone && (
          <p className="text-sm text-muted-foreground text-center">
            Your withdrawable balance: <strong>NC {(profile?.balance_withdrawable || 0).toLocaleString()}</strong>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
