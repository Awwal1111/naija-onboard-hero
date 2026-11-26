import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Info } from 'lucide-react'

export const TwoFactorSetup = () => (
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Shield className="h-5 w-5" />
        Two-Factor Authentication
      </CardTitle>
      <CardDescription>Additional sign-in protection</CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Email-based two-factor authentication is not currently active. The previous switch only saved a preference and did not enforce a second verification step during sign-in. It has been removed to avoid showing a false security status.
        </AlertDescription>
      </Alert>
      <p className="text-sm text-muted-foreground">
        Keep your account password and transaction PIN private. A real second factor will be shown here only after the sign-in flow, recovery process, and backup codes are implemented and tested end to end.
      </p>
    </CardContent>
  </Card>
)

export default TwoFactorSetup
