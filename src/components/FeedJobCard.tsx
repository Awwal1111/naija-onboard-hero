import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Briefcase } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'

type Job = { id: string; title: string; budget_max: number | null; required_skills: string[] | null }

export function useFeedJobs() {
  return useQuery({
    queryKey: ['feed-jobs'],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase.from('job_posts')
        .select('id, title, budget_max, required_skills')
        .eq('status', 'open').eq('moderation_status', 'approved')
        .order('created_at', { ascending: false }).limit(5)
      return (data ?? []) as Job[]
    },
  })
}

export function FeedJobCard({ job }: { job: Job }) {
  const navigate = useNavigate()
  return (
    <div className="m-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase text-primary">
        <Briefcase className="h-3.5 w-3.5" /> Paid job · Escrow protected
      </div>
      <h3 className="font-semibold text-foreground">{job.title}</h3>
      <p className="text-sm text-muted-foreground">
        {job.budget_max ? `${job.budget_max} NC` : 'Budget negotiable'}
        {job.required_skills?.length ? ` · ${job.required_skills.slice(0, 3).join(', ')}` : ''}
      </p>
      <Button size="sm" className="mt-3" onClick={() => navigate(`/job/${job.id}`)}>View & apply</Button>
    </div>
  )
}
