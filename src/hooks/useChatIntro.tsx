import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

export interface ChatIntroRequest {
  id: string
  sender_id: string
  recipient_id: string
  message: string
  status: 'pending' | 'accepted' | 'declined' | 'cancelled'
  created_at: string
  responded_at: string | null
  sender_profile?: {
    full_name: string
    profile_picture_url?: string | null
    profession?: string | null
  }
}

/**
 * Manages chat introduction requests.
 * Pass otherUserId to scope to a single conversation (sender/recipient gate).
 * Omit it to fetch the inbox of incoming pending intros.
 */
export const useChatIntro = (otherUserId?: string) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [outgoing, setOutgoing] = useState<ChatIntroRequest | null>(null)
  const [incoming, setIncoming] = useState<ChatIntroRequest | null>(null)
  const [inbox, setInbox] = useState<ChatIntroRequest[]>([])
  const [loading, setLoading] = useState(false)

  const fetchPair = useCallback(async () => {
    if (!user || !otherUserId) return
    const { data, error } = await supabase
      .from('chat_intro_requests')
      .select('id, sender_id, recipient_id, message, status, created_at, responded_at')
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),` +
        `and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order('created_at', { ascending: false })
      .limit(5)
    if (error) {
      console.error('intro fetch', error)
      return
    }
    setOutgoing((data || []).find(r => r.sender_id === user.id && r.status === 'pending') as any || null)
    setIncoming((data || []).find(r => r.recipient_id === user.id && r.status === 'pending') as any || null)
  }, [user, otherUserId])

  const fetchInbox = useCallback(async () => {
    if (!user || otherUserId) return
    const { data, error } = await supabase
      .from('chat_intro_requests')
      .select('id, sender_id, recipient_id, message, status, created_at, responded_at')
      .eq('recipient_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) {
      console.error('intro inbox', error)
      return
    }
    const rows = (data || []) as ChatIntroRequest[]
    const senderIds = [...new Set(rows.map(r => r.sender_id))]
    if (senderIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url, profession')
        .in('user_id', senderIds)
      const map = new Map((profs || []).map(p => [p.user_id, p]))
      rows.forEach(r => { r.sender_profile = map.get(r.sender_id) as any })
    }
    setInbox(rows)
  }, [user, otherUserId])

  useEffect(() => {
    fetchPair()
    fetchInbox()
  }, [fetchPair, fetchInbox])

  const sendIntro = async (message: string) => {
    if (!user || !otherUserId) return false
    const trimmed = message.trim()
    if (!trimmed) {
      toast({ title: 'Write a short introduction', variant: 'destructive' })
      return false
    }
    if (trimmed.length > 500) {
      toast({ title: 'Introduction is too long (max 500 chars)', variant: 'destructive' })
      return false
    }
    setLoading(true)
    const { error } = await supabase.from('chat_intro_requests').insert({
      sender_id: user.id,
      recipient_id: otherUserId,
      message: trimmed,
    })
    setLoading(false)
    if (error) {
      toast({ title: 'Could not send', description: error.message, variant: 'destructive' })
      return false
    }
    toast({ title: 'Introduction sent', description: 'Waiting for them to accept.' })
    await fetchPair()
    return true
  }

  const acceptIntro = async (introId: string) => {
    setLoading(true)
    const { error } = await supabase.rpc('accept_chat_intro', { p_intro_id: introId })
    setLoading(false)
    if (error) {
      toast({ title: 'Failed to accept', description: error.message, variant: 'destructive' })
      return false
    }
    toast({ title: 'Introduction accepted' })
    await Promise.all([fetchPair(), fetchInbox()])
    return true
  }

  const declineIntro = async (introId: string) => {
    setLoading(true)
    const { error } = await supabase.rpc('decline_chat_intro', { p_intro_id: introId })
    setLoading(false)
    if (error) {
      toast({ title: 'Failed to decline', description: error.message, variant: 'destructive' })
      return false
    }
    toast({ title: 'Introduction declined' })
    await Promise.all([fetchPair(), fetchInbox()])
    return true
  }

  const cancelIntro = async (introId: string) => {
    if (!user) return false
    setLoading(true)
    const { error } = await supabase
      .from('chat_intro_requests')
      .update({ status: 'cancelled', responded_at: new Date().toISOString() })
      .eq('id', introId)
      .eq('sender_id', user.id)
      .eq('status', 'pending')
    setLoading(false)
    if (error) {
      toast({ title: 'Failed to cancel', description: error.message, variant: 'destructive' })
      return false
    }
    await fetchPair()
    return true
  }

  return {
    outgoing,
    incoming,
    inbox,
    loading,
    sendIntro,
    acceptIntro,
    declineIntro,
    cancelIntro,
    refresh: () => { fetchPair(); fetchInbox() },
  }
}
