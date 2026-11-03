import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { Zap } from 'lucide-react'

export function AdminQuickJobPoster() {
  const { user } = useAuth()
  const { toast } = useToast()
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const [budget, setBudget] = useState('')
  const [skills, setSkills] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)

  const publish = async () => {
    if (!user || title.trim().length < 5 || description.trim().length < 20) {
      toast({ title: 'Add a title (5+ chars) and description (20+ chars)', variant: 'destructive' })
      return
    }
    setBusy(true)
    const b = budget ? parseFloat(budget) : null
    const { error } = await supabase.from('job_posts').insert({
      user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      job_type: 'contract',
      experience_level: 'intermediate',
      budget_min: b, budget_max: b,
      required_skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : null,
      is_remote: true,
      status: 'open',
      moderation_status: 'approved',
      moderated_by: user.id,
      moderated_at: new Date().toISOString(),
    } as any)
    setBusy(false)
    if (error) { toast({ title: 'Could not publish', description: error.message, variant: 'destructive' }); return }
    toast({ title: 'Job is live ✅' })
    setTitle(''); setBudget(''); setSkills(''); setDescription('')
    qc.invalidateQueries({ queryKey: ['feed-jobs'] })
  }

  return (
    <Card className="mb-4">
      <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Zap className="h-4 w-4 text-primary" />Quick Job Poster (instantly live)</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        <Input placeholder="Job title" value={title} onChange={e => setTitle(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <Input type="number" placeholder="Budget (NC)" value={budget} onChange={e => setBudget(e.target.value)} />
          <Input placeholder="Skills, comma separated" value={skills} onChange={e => setSkills(e.target.value)} />
        </div>
        <Textarea rows={3} placeholder="Short description" value={description} onChange={e => setDescription(e.target.value)} />
        <Button onClick={publish} disabled={busy} className="w-full">{busy ? 'Publishing…' : 'Publish now'}</Button>
      </CardContent>
    </Card>
  )
}
