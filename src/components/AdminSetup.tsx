import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

export const AdminSetup = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [adminStatus, setAdminStatus] = useState<any>(null)

  useEffect(() => {
    checkCurrentUser()
  }, [])

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setCurrentUser(user)
      // @ts-ignore - RPC function exists but not in generated types yet
      const { data: status } = await supabase.rpc('check_is_admin')
      setAdminStatus(status?.[0])
    }
  }

  const grantAdminToSelf = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Please log in first')
        return
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'super_admin' as any
        })

      if (error) {
        if (error.code === '23505') {
          toast.info('You already have admin role')
        } else {
          throw error
        }
      } else {
        toast.success('Admin role granted! Refreshing...')
        setTimeout(() => window.location.reload(), 1500)
      }
    } catch (error: any) {
      console.error('Error granting admin:', error)
      toast.error(`Failed to grant admin: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const grantAdminByEmail = async () => {
    if (!email) {
      toast.error('Please enter an email')
      return
    }

    setLoading(true)
    try {
      // @ts-ignore
      const { data: targetUser } = await supabase.rpc('lookup_user_by_email', {
        lookup_email: email
      })

      if (!targetUser || !(targetUser as any).found) {
        toast.error('User not found')
        return
      }

      // @ts-ignore
      const { error } = await supabase.rpc('grant_admin_role', {
        target_user_id: (targetUser as any).user_id
      })

      if (error) throw error

      toast.success(`Admin role granted to ${(targetUser as any).full_name || email}`)
      setEmail('')
    } catch (error: any) {
      console.error('Error granting admin:', error)
      toast.error(`Failed: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">Admin Setup Required</p>
          <p className="text-xs">No admin users exist yet. Grant yourself <strong>Super Admin</strong> access to manage the platform and assign roles to others.</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Grant Admin Access
          </CardTitle>
          <CardDescription>Set up the first admin user for your platform</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium">Your Account</p>
            {currentUser ? (
              <>
                <p className="text-xs text-muted-foreground">{currentUser.email}</p>
                {adminStatus?.is_admin ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-xs font-medium">Admin Access Active</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">No Admin Access</span>
                  </div>
                )}
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={checkCurrentUser}>
                Check Status
              </Button>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-1">Grant Super Admin to Yourself</p>
              <p className="text-xs text-muted-foreground mb-3">
                Click below to become the platform's Super Admin (highest access level)
              </p>
              <Button 
                onClick={grantAdminToSelf} 
                disabled={loading || adminStatus?.is_admin}
                className="w-full"
              >
                <Shield className="h-4 w-4 mr-2" />
                {loading ? 'Granting...' : adminStatus?.is_admin ? 'Already Admin' : 'Make Me Super Admin'}
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-3">Grant Admin to Another User</p>
            <div className="space-y-3">
              <div>
                <Label htmlFor="admin-email">User Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button 
                onClick={grantAdminByEmail}
                disabled={loading || !email}
                variant="secondary"
                className="w-full"
              >
                {loading ? 'Granting...' : 'Grant Admin Access'}
              </Button>
            </div>
          </div>

          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-xs">
              <p className="font-medium">Important:</p>
              <p>• Admin users have full access to all platform features</p>
              <p>• Only grant admin access to trusted users</p>
              <p>• After granting, the page will refresh automatically</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  )
}
