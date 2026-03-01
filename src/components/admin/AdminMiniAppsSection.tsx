import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Check, X, ExternalLink, Eye } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface MiniApp {
  id: string
  app_name: string
  app_description: string
  app_icon_url: string | null
  app_url: string
  category: string
  status: string
  created_at: string
  developer_id: string
  sdk_app_id: string
  install_count: number
}

export const AdminMiniAppsSection = () => {
  const { user } = useAuth()
  const [apps, setApps] = useState<MiniApp[]>([])
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const fetchApps = async () => {
    let query = supabase.from('mini_apps').select('*').order('created_at', { ascending: false })
    if (filter !== 'all') query = query.eq('status', filter)
    const { data } = await query
    if (data) setApps(data as MiniApp[])
  }

  useEffect(() => { fetchApps() }, [filter])

  const handleAction = async (appId: string, action: 'approved' | 'rejected') => {
    setLoading(appId)
    try {
      const updateData: any = {
        status: action,
        admin_notes: notes[appId] || null
      }
      if (action === 'approved') {
        updateData.approved_at = new Date().toISOString()
        updateData.approved_by = user?.id
      }

      const { error } = await supabase.from('mini_apps').update(updateData).eq('id', appId)
      if (error) throw error
      toast.success(`App ${action}!`)
      fetchApps()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(null)
    }
  }

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-100 text-green-700'
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700'
    if (s === 'rejected') return 'bg-red-100 text-red-700'
    return 'bg-muted text-muted-foreground'
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {(['pending', 'approved', 'rejected', 'all'] as const).map(f => (
          <Button
            key={f}
            variant={filter === f ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {apps.length === 0 && (
        <p className="text-center text-muted-foreground py-8">No {filter} apps</p>
      )}

      <div className="space-y-3">
        {apps.map(app => (
          <div key={app.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {app.app_icon_url ? (
                  <img src={app.app_icon_url} alt="" className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-lg font-bold text-primary">{app.app_name.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{app.app_name}</h3>
                  <Badge className={statusColor(app.status)}>{app.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{app.app_description}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>Category: {app.category}</span>
                  <span>Opens: {app.install_count}</span>
                  <a href={app.app_url} target="_blank" rel="noopener" className="text-primary flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Preview
                  </a>
                </div>
                <p className="text-xs text-muted-foreground mt-1">SDK ID: {app.sdk_app_id}</p>
              </div>
            </div>

            {app.status === 'pending' && (
              <div className="mt-3 space-y-2">
                <Textarea
                  placeholder="Admin notes (optional)"
                  value={notes[app.id] || ''}
                  onChange={e => setNotes(n => ({ ...n, [app.id]: e.target.value }))}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1"
                    disabled={loading === app.id}
                    onClick={() => handleAction(app.id, 'approved')}
                  >
                    <Check className="h-4 w-4" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="gap-1"
                    disabled={loading === app.id}
                    onClick={() => handleAction(app.id, 'rejected')}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
