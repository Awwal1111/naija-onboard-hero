import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { AdminInviteDialog } from './AdminInviteDialog'
import { UserPlus, Mail, CheckCircle, XCircle, Clock, Trash2, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Invitation {
  id: string
  email: string
  role: string
  status: string
  invited_by: string
  created_at: string
  expires_at: string
  accepted_at: string | null
  inviter_name?: string
}

interface TeamMember {
  user_id: string
  role: string
  full_name: string
  email: string
  created_at: string
}

export function AdminSettingsTab() {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch invitations
      const { data: invitesData, error: invitesError } = await supabase
        .from('admin_invitations')
        .select('*')
        .order('created_at', { ascending: false })

      if (invitesError) throw invitesError

      // Fetch inviter names
      const invitesWithNames = await Promise.all(
        (invitesData || []).map(async (inv) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', inv.invited_by)
            .single()
          
          return {
            ...inv,
            inviter_name: profile?.full_name || 'Unknown'
          }
        })
      )

      setInvitations(invitesWithNames)

      // Fetch team members (users with roles)
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['admin', 'moderator'])

      if (rolesError) throw rolesError

      // Fetch profile data for each role
      const membersWithProfiles = await Promise.all(
        (rolesData || []).map(async (r) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, created_at')
            .eq('user_id', r.user_id)
            .single()

          const { data: authUser } = await supabase.auth.admin.getUserById(r.user_id)

          return {
            user_id: r.user_id,
            role: r.role,
            full_name: profile?.full_name || 'Unknown User',
            email: authUser?.user?.email || '',
            created_at: profile?.created_at || ''
          }
        })
      )

      setTeamMembers(membersWithProfiles)
    } catch (error: any) {
      console.error('Error fetching data:', error)
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('admin_invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId)

      if (error) throw error

      toast({
        title: "Invitation Revoked",
        description: "The invitation has been cancelled"
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to revoke invitation",
        variant: "destructive"
      })
    }
  }

  const handleRemoveRole = async (userId: string, role: string) => {
    try {
      // @ts-ignore - RPC function exists but not in generated types yet
      const { data, error } = await supabase.rpc('revoke_admin_role', {
        target_user_id: userId,
        target_role: role as any
      })

      if (error) throw error
      if (data && !(data as any).success) {
        toast({
          title: "Cannot Remove Role",
          description: (data as any).error || "Permission denied",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Role Removed",
        description: "The user's role has been removed"
      })

      fetchData()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove role",
        variant: "destructive"
      })
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-red-500/10 text-red-500 border-red-500/20'
      case 'admin':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20'
      case 'moderator':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
      default:
        return 'bg-gray-500/10 text-gray-500 border-gray-500/20'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin': return 'Super Admin'
      case 'admin': return 'Admin'
      case 'moderator': return 'Moderator'
      default: return role.charAt(0).toUpperCase() + role.slice(1)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'revoked':
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Members</CardTitle>
          <Button onClick={() => setShowInviteDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Invite Member
          </Button>
        </CardHeader>
        <CardContent>
          {teamMembers.length === 0 ? (
            <p className="text-center text-text-secondary py-8">No team members found</p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={`${member.user_id}-${member.role}`}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-text-primary">{member.full_name}</h4>
                    <p className="text-sm text-text-secondary">{member.email}</p>
                    <p className="text-xs text-text-secondary mt-1">
                      Joined {formatDistanceToNow(new Date(member.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className={getRoleBadgeColor(member.role)}>
                      {getRoleLabel(member.role)}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveRole(member.user_id, member.role)}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invitations */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Pending Invitations</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {invitations.filter(inv => inv.status === 'pending').length === 0 ? (
            <p className="text-center text-text-secondary py-8">No pending invitations</p>
          ) : (
            <div className="space-y-3">
              {invitations
                .filter(inv => inv.status === 'pending')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <Mail className="h-5 w-5 text-primary" />
                      <div>
                        <h4 className="font-medium text-text-primary">{invitation.email}</h4>
                        <p className="text-xs text-text-secondary">
                          Invited by {invitation.inviter_name} •{' '}
                          {formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-text-secondary">
                          Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={getRoleBadgeColor(invitation.role)}>
                        {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvitation(invitation.id)}
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      >
                        Revoke
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitation History */}
      <Card>
        <CardHeader>
          <CardTitle>Invitation History</CardTitle>
        </CardHeader>
        <CardContent>
          {invitations.filter(inv => inv.status !== 'pending').length === 0 ? (
            <p className="text-center text-text-secondary py-8">No invitation history</p>
          ) : (
            <div className="space-y-2">
              {invitations
                .filter(inv => inv.status !== 'pending')
                .map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(invitation.status)}
                      <div>
                        <span className="text-sm text-text-primary">{invitation.email}</span>
                        <p className="text-xs text-text-secondary">
                          {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)} •{' '}
                          {formatDistanceToNow(new Date(invitation.accepted_at || invitation.created_at), {
                            addSuffix: true
                          })}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {invitation.role}
                    </Badge>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AdminInviteDialog open={showInviteDialog} onOpenChange={setShowInviteDialog} />
    </div>
  )
}
