import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Trash2, Briefcase, RefreshCw } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { looksLikeGigOffer } from '@/lib/jobFilters'
import { format } from 'date-fns'

type Status = 'pending' | 'approved' | 'rejected'

interface JobRow {
  id: string
  title: string
  description: string
  company_name: string | null
  location: string | null
  budget_min: number | null
  budget_max: number | null
  user_id: string
  status: string
  moderation_status: string
  moderation_note: string | null
  created_at: string
}

export const AdminJobModeration: React.FC = () => {
  const { toast } = useToast()
  const { user } = useAuth()
  const [tab, setTab] = useState<Status>('pending')
  const [jobs, setJobs] = useState<JobRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('job_posts')
      .select('id, title, description, company_name, location, budget_min, budget_max, user_id, status, moderation_status, moderation_note, created_at')
      .eq('moderation_status', tab)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      toast({ title: 'Failed to load jobs', description: error.message, variant: 'destructive' })
    } else {
      setJobs((data || []) as JobRow[])
    }
    setLoading(false)
  }, [tab, toast])

  useEffect(() => { load() }, [load])

  const moderate = async (job: JobRow, next: Status) => {
    setBusy(job.id)
    const { error } = await supabase
      .from('job_posts')
      .update({
        moderation_status: next,
        moderation_note: notes[job.id] || (next === 'rejected' ? 'Not a genuine job post.' : null),
        moderated_by: user?.id ?? null,
        moderated_at: new Date().toISOString(),
        status: next === 'approved' ? 'open' : 'closed',
      })
      .eq('id', job.id)
    setBusy(null)

    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' })
      return
    }

    // Notify the poster
    await supabase.from('notifications').insert({
      user_id: job.user_id,
      type: 'job_moderation',
      title: next === 'approved' ? 'Your job is live' : 'Your job was rejected',
      message: next === 'approved'
        ? `"${job.title}" has been approved and is now visible to freelancers.`
        : `"${job.title}" was rejected. ${notes[job.id] || 'Jobs are for hiring — post a Gig to advertise your services.'}`,
      data: { job_post_id: job.id },
    } as any)

    toast({ title: next === 'approved' ? 'Job approved' : 'Job rejected' })
    setJobs(prev => prev.filter(j => j.id !== job.id))
  }

  const remove = async (job: JobRow) => {
    setBusy(job.id)
    const { error } = await supabase.from('job_posts').delete().eq('id', job.id)
    setBusy(null)
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Job deleted' })
    setJobs(prev => prev.filter(j => j.id !== job.id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Briefcase className="h-4 w-4" />
          Job Moderation
          {tab === 'pending' && jobs.length > 0 && (
            <Badge variant="destructive">{jobs.length}</Badge>
          )}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
        ) : jobs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Nothing here.</p>
        ) : (
          <div className="space-y-3">
            {jobs.map(job => {
              const suspicious = looksLikeGigOffer({ title: job.title, description: job.description })
              return (
                <div key={job.id} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-medium text-sm truncate">{job.title}</h4>
                        {suspicious && (
                          <Badge variant="destructive" className="text-[10px]">Looks like a gig advert</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {job.company_name || 'No company'} · {job.location || 'No location'} ·{' '}
                        {format(new Date(job.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {(job.budget_min || job.budget_max) && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {job.budget_min ?? '—'} - {job.budget_max ?? '—'} NC
                      </Badge>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap">
                    {job.description}
                  </p>

                  {job.moderation_note && tab !== 'pending' && (
                    <p className="text-xs italic text-muted-foreground">Note: {job.moderation_note}</p>
                  )}

                  {tab === 'pending' && (
                    <Textarea
                      value={notes[job.id] || ''}
                      onChange={(e) => setNotes(prev => ({ ...prev, [job.id]: e.target.value }))}
                      placeholder="Optional note sent to the poster (reason for rejection)…"
                      rows={2}
                      className="text-xs"
                    />
                  )}

                  <div className="flex flex-wrap gap-2">
                    {tab !== 'approved' && (
                      <Button size="sm" disabled={busy === job.id} onClick={() => moderate(job, 'approved')}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    )}
                    {tab !== 'rejected' && (
                      <Button size="sm" variant="outline" disabled={busy === job.id} onClick={() => moderate(job, 'rejected')}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    )}
                    <Button size="sm" variant="destructive" disabled={busy === job.id} onClick={() => remove(job)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AdminJobModeration
