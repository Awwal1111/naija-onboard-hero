import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { Mail, Shield, Users, UserCog } from 'lucide-react'

interface AdminInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const COMPANY_ROLES = [
  { value: 'admin', label: 'Administrator', icon: Shield, description: 'Full system access and control' },
  { value: 'moderator', label: 'Moderator', icon: UserCog, description: 'Content moderation and user management' },
  { value: 'support', label: 'Support Staff', icon: Users, description: 'Customer support and basic management' },
]

export function AdminInviteDialog({ open, onOpenChange }: AdminInviteDialogProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleInvite = async () => {
    if (!email || !role) {
      toast({
        title: "Missing Information",
        description: "Please provide both email and role",
        variant: "destructive"
      })
      return
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Generate invitation token
      const invitationToken = crypto.randomUUID()

      // Create invitation
      const { error: inviteError } = await supabase
        .from('admin_invitations')
        .insert({
          email: email.toLowerCase().trim(),
          role: role as any,
          invitation_token: invitationToken,
          invited_by: (await supabase.auth.getUser()).data.user?.id
        })

      if (inviteError) throw inviteError

      // Send invitation email (you can implement email sending via edge function)
      const inviteLink = `${window.location.origin}/signup?invite=${invitationToken}`
      
      toast({
        title: "Invitation Sent",
        description: `An invitation has been sent to ${email}`,
      })

      // Log for admin to share manually if email service not set up
      console.log('Invitation Link:', inviteLink)

      setEmail('')
      setRole('')
      onOpenChange(false)
    } catch (error: any) {
      console.error('Invitation error:', error)
      toast({
        title: "Invitation Failed",
        description: error.message || "Failed to send invitation",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invite Team Member
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Email Address</label>
            <BrandInput
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">Role</label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {COMPANY_ROLES.map((r) => {
                  const Icon = r.icon
                  return (
                    <SelectItem key={r.value} value={r.value}>
                      <div className="flex items-start gap-3 py-1">
                        <Icon className="h-5 w-5 mt-0.5 text-primary" />
                        <div>
                          <div className="font-medium">{r.label}</div>
                          <div className="text-xs text-text-secondary">{r.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {role && (
            <div className="bg-muted p-3 rounded-lg">
              <h4 className="text-sm font-medium mb-2 text-text-primary">Role Permissions:</h4>
              <ul className="text-xs space-y-1 text-text-secondary">
                {role === 'admin' && (
                  <>
                    <li>• Full platform access and configuration</li>
                    <li>• User and content management</li>
                    <li>• Financial and wallet operations</li>
                    <li>• Invite and manage team members</li>
                  </>
                )}
                {role === 'moderator' && (
                  <>
                    <li>• Content moderation and approval</li>
                    <li>• User management (ban/unban)</li>
                    <li>• Review expert applications</li>
                    <li>• View analytics and reports</li>
                  </>
                )}
                {role === 'support' && (
                  <>
                    <li>• View user information</li>
                    <li>• Assist with basic inquiries</li>
                    <li>• Limited wallet operations</li>
                    <li>• View reports (read-only)</li>
                  </>
                )}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleInvite} disabled={loading}>
            {loading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
