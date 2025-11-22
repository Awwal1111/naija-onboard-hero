import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Fingerprint, Mail, Shield, Smartphone } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useBiometric } from '@/hooks/useBiometric'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const TwoFactorSetup = () => {
  const { user } = useAuth()
  const { profile, refetch } = useProfile()
  const { isAvailable: biometricAvailable, isEnabled: biometricEnabled, enableBiometric, disableBiometric, loading: biometricLoading } = useBiometric()
  
  const [email2FA, setEmail2FA] = useState((profile as any)?.email_2fa_enabled || false)
  const [loading, setLoading] = useState(false)

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      await disableBiometric()
    } else {
      await enableBiometric()
    }
    await refetch()
  }

  const handleEmail2FAToggle = async () => {
    if (!user) return

    setLoading(true)
    try {
      const newValue = !email2FA

      const { error } = await supabase
        .from('profiles')
        .update({ email_2fa_enabled: newValue })
        .eq('user_id', user.id)

      if (error) throw error

      setEmail2FA(newValue)
      toast.success(`Email 2FA ${newValue ? 'enabled' : 'disabled'}`)
      await refetch()
    } catch (error) {
      console.error('Error toggling email 2FA:', error)
      toast.error('Failed to update 2FA settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </CardTitle>
          <CardDescription>
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Biometric Authentication */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Fingerprint className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Fingerprint / Face ID</p>
                <p className="text-sm text-muted-foreground">
                  Use device biometrics to authorize transactions
                </p>
                {!biometricAvailable && (
                  <Badge variant="secondary" className="mt-2">Not Available</Badge>
                )}
                {biometricEnabled && (
                  <Badge className="mt-2 bg-green-500">Enabled</Badge>
                )}
              </div>
            </div>
            <Switch
              checked={biometricEnabled}
              onCheckedChange={handleBiometricToggle}
              disabled={!biometricAvailable || biometricLoading}
            />
          </div>

          {/* Email 2FA */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Email 2FA</p>
                <p className="text-sm text-muted-foreground">
                  Receive verification codes via email
                </p>
                {email2FA && (
                  <Badge className="mt-2 bg-green-500">Enabled</Badge>
                )}
              </div>
            </div>
            <Switch
              checked={email2FA}
              onCheckedChange={handleEmail2FAToggle}
              disabled={loading}
            />
          </div>

          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Security Tips:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li>Always enable at least one 2FA method for maximum security</li>
                <li>Biometric authentication provides the fastest verification</li>
                <li>Keep your transaction PIN confidential</li>
                <li>Never share verification codes with anyone</li>
              </ul>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
