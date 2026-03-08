import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './useAuth'

export type AdminRole = 'super_admin' | 'admin' | 'moderator' | 'none'

// Permission hierarchy: super_admin > admin > moderator
const ROLE_LEVEL: Record<AdminRole, number> = {
  none: 0,
  moderator: 1,
  admin: 2,
  super_admin: 3,
}

// Tab permissions - minimum role required for each tab
const TAB_PERMISSIONS: Record<string, AdminRole> = {
  overview: 'moderator',
  users: 'admin',
  content: 'moderator',
  applications: 'moderator',
  marketplace: 'admin',
  ads: 'admin',
  wallet: 'super_admin',
  'api-sales': 'super_admin',
  'api-usage': 'admin',
  support: 'moderator',
  'mini-apps': 'admin',
  analytics: 'admin',
  settings: 'super_admin',
}

// Action permissions
const ACTION_PERMISSIONS: Record<string, AdminRole> = {
  ban_user: 'admin',
  delete_content: 'moderator',
  approve_expert: 'moderator',
  approve_withdrawal: 'admin',
  manage_wallet: 'super_admin',
  invite_member: 'admin',
  grant_admin: 'super_admin',
  grant_moderator: 'admin',
  revoke_role: 'admin',
  manage_ads: 'admin',
  manage_api: 'super_admin',
  broadcast: 'admin',
  view_analytics: 'moderator',
  manage_settings: 'super_admin',
}

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  moderator: 'Moderator',
  none: 'No Access',
}

export const ROLE_COLORS: Record<AdminRole, string> = {
  super_admin: 'bg-red-500/10 text-red-500 border-red-500/20',
  admin: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  moderator: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  none: 'bg-muted text-muted-foreground border-border',
}

export const useAdminRole = () => {
  const { user } = useAuth()
  const [role, setRole] = useState<AdminRole>('none')
  const [loading, setLoading] = useState(true)

  const fetchRole = useCallback(async () => {
    if (!user) {
      setRole('none')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase.rpc('get_user_admin_role')
      if (!error && data) {
        setRole(data as AdminRole)
      } else {
        setRole('none')
      }
    } catch {
      setRole('none')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchRole()
  }, [fetchRole])

  const hasAccess = useCallback((requiredRole: AdminRole): boolean => {
    return ROLE_LEVEL[role] >= ROLE_LEVEL[requiredRole]
  }, [role])

  const canAccessTab = useCallback((tab: string): boolean => {
    const required = TAB_PERMISSIONS[tab] || 'admin'
    return hasAccess(required)
  }, [hasAccess])

  const canPerformAction = useCallback((action: string): boolean => {
    const required = ACTION_PERMISSIONS[action] || 'admin'
    return hasAccess(required)
  }, [hasAccess])

  const isAnyAdmin = useMemo(() => ROLE_LEVEL[role] >= 1, [role])

  const availableTabs = useMemo(() => {
    return Object.entries(TAB_PERMISSIONS)
      .filter(([_, requiredRole]) => hasAccess(requiredRole))
      .map(([tab]) => tab)
  }, [hasAccess])

  return {
    role,
    loading,
    hasAccess,
    canAccessTab,
    canPerformAction,
    isAnyAdmin,
    availableTabs,
    refetch: fetchRole,
  }
}
