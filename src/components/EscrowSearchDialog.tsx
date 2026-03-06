import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Shield, Search, Loader2 } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

interface EscrowSearchDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface SearchResult {
  user_id: string
  full_name: string
  profile_picture_url: string | null
  profession: string | null
}

export const EscrowSearchDialog: React.FC<EscrowSearchDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    if (!query.trim() || query.trim().length < 2) return

    setLoading(true)
    try {
      // Search by name
      const { data: nameResults, error: nameErr } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url, profession')
        .neq('user_id', user?.id || '')
        .ilike('full_name', `%${query.trim()}%`)
        .limit(10)

      if (nameErr) throw nameErr

      // Also search by email via RPC
      const { data: emailResult } = await supabase.rpc('lookup_user_by_email', {
        lookup_email: query.trim()
      })

      let combined: SearchResult[] = (nameResults || []) as SearchResult[]

      // If email lookup found someone, add to results if not already there
      if (emailResult && (emailResult as any).found) {
        const emailUser = emailResult as any
        if (emailUser.user_id !== user?.id && !combined.find(r => r.user_id === emailUser.user_id)) {
          combined.push({
            user_id: emailUser.user_id,
            full_name: emailUser.full_name || 'User',
            profile_picture_url: null,
            profession: null,
          })
        }
      }

      setResults(combined)
    } catch (err: any) {
      console.error('Search error:', err)
      toast.error('Search failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = async (selectedUserId: string) => {
    // Ensure chat exists, then navigate to it
    try {
      // Check if chat already exists
      const { data: existingChat } = await supabase
        .from('chats')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${selectedUserId}),and(user1_id.eq.${selectedUserId},user2_id.eq.${user?.id})`)
        .maybeSingle()

      if (!existingChat) {
        // Create a new chat
        await supabase.from('chats').insert({
          user1_id: user?.id!,
          user2_id: selectedUserId,
        })
      }

      onOpenChange(false)
      setQuery('')
      setResults([])
      // Navigate to chat - the SafePay button is already in chat
      navigate(`/chat/${selectedUserId}`)
    } catch (err: any) {
      toast.error('Could not open chat')
      console.error(err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Start Escrow
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Search for the person you want to start an escrow with by name or email.
        </p>

        <div className="flex gap-2">
          <BrandInput
            placeholder="Search by name or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <BrandButton onClick={handleSearch} disabled={loading || query.trim().length < 2} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </BrandButton>
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {results.length === 0 && !loading && query.length > 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No results found</p>
          )}
          {results.map((person) => (
            <button
              key={person.user_id}
              onClick={() => handleSelectUser(person.user_id)}
              className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={person.profile_picture_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-sm">
                  {(person.full_name || 'U').charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{person.full_name}</p>
                {person.profession && (
                  <p className="text-xs text-muted-foreground truncate">{person.profession}</p>
                )}
              </div>
              <Shield className="h-4 w-4 text-primary shrink-0" />
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
