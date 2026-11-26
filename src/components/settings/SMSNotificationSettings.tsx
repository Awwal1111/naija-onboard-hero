import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Smartphone, Info } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'

const NIGERIA_SMS_PRICE_NC = 10

const normalizeNigerianPhone = (value?: string | null) => {
  if (!value) return null
  const phone = value.replace(/[\s()-]/g, '')
  if (/^\+234[789][01]\d{8}$/.test(phone)) return phone
  if (/^234[789][01]\d{8}$/.test(phone)) return `+${phone}`
  if (/^0[789][01]\d{8}$/.test(phone)) return `+234${phone.slice(1)}`
  return null
}

export const SMSNotificationSettings = () => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const [jobAlertsSMS, setJobAlertsSMS] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const normalizedPhone = normalizeNigerianPhone(profile?.phone_number)
  const hasPhone = Boolean(profile?.phone_number)
  const hasSupportedPhone = Boolean(normalizedPhone)

  useEffect(() => {
    let active = true
    const loadSettings = async () => {
      if (!user?.id) {
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from('notification_preferences')
          .select('sms_enabled')
          .eq('user_id', user.id)
          .maybeSingle()
        if (error) throw error
        if (active) setJobAlertsSMS(data?.sms_enabled === true)
      } catch (error) {
        console.error('Error loading SMS settings:', error)
        if (active) toast.error('Could not load SMS notification settings')
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void loadSettings()
    return () => { active = false }
  }, [user?.id])

  const handleToggleJobAlerts = async (enabled: boolean) => {
    if (!user?.id || saving) return
    if (!hasPhone) {
      toast.error('Add a phone number to your profile first')
      return
    }
    if (!hasSupportedPhone) {
      toast.error('SMS alerts are currently available only for valid Nigerian mobile numbers (+234)')
      return
    }

    const currentBalance = profile?.balance_withdrawable || 0
    if (enabled && currentBalance < NIGERIA_SMS_PRICE_NC) {
      toast.error(`Insufficient balance. You need at least ${NIGERIA_SMS_PRICE_NC} NC for SMS alerts.`)
      return
    }

    const previous = jobAlertsSMS
    setSaving(true)
    setJobAlertsSMS(enabled)
    try {
      const { error: preferenceError } = await supabase
        .from('notification_preferences')
        .upsert({
          user_id: user.id,
          sms_enabled: enabled,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
      if (preferenceError) throw preferenceError

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ sms_job_alerts: enabled } as any)
        .eq('user_id', user.id)
      if (profileError) {
        await supabase.from('notification_preferences')
          .upsert({ user_id: user.id, sms_enabled: previous, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
        throw profileError
      }

      toast.success(enabled
        ? `Nigerian job SMS alerts enabled (${NIGERIA_SMS_PRICE_NC} NC per SMS)`
        : 'Job SMS alerts disabled')
    } catch (error) {
      console.error('Error updating SMS settings:', error)
      setJobAlertsSMS(previous)
      toast.error('Failed to update SMS settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse h-20 bg-muted rounded" />
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
          Receive selected job alerts by SMS on Nigerian mobile numbers only.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            SMS delivery is currently Nigeria-only. The charge is {NIGERIA_SMS_PRICE_NC} NC per SMS.
            International numbers are not supported and will not be charged.
          </AlertDescription>
        </Alert>

        {!hasPhone && (
          <Alert variant="destructive">
            <AlertDescription>Add a Nigerian mobile number to your profile to enable SMS notifications.</AlertDescription>
          </Alert>
        )}
        {hasPhone && !hasSupportedPhone && (
          <Alert variant="destructive">
            <AlertDescription>
              This phone number is not a supported Nigerian mobile number. Update your profile with a valid +234 number to use SMS alerts.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between gap-3 p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="job-sms" className="font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Job Alerts via SMS
            </Label>
            <p className="text-sm text-muted-foreground">
              Get notified when new jobs match your skills
            </p>
            <Badge variant="secondary" className="text-xs">🇳🇬 {NIGERIA_SMS_PRICE_NC} NC per SMS</Badge>
          </div>
          <Switch
            id="job-sms"
            checked={jobAlertsSMS}
            onCheckedChange={handleToggleJobAlerts}
            disabled={!hasSupportedPhone || saving}
          />
        </div>

        {hasSupportedPhone && (
          <p className="text-sm text-muted-foreground text-center">
            Your withdrawable balance: <strong>NC {(profile?.balance_withdrawable || 0).toLocaleString()}</strong>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
