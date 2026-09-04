import React, { useEffect, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CheckCircle, XCircle, Trash2, GraduationCap, RefreshCw, AlertTriangle } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format } from 'date-fns'

type Status = 'pending' | 'approved' | 'rejected'

interface CourseRow {
  id: string
  title: string
  description: string | null
  price: number | null
  user_id: string
  status: string
  moderation_status: string
  moderation_note: string | null
  course_urls: any
  enrollment_count: number | null
  created_at: string
}

const looksSpammy = (c: CourseRow) => {
  const urls = Array.isArray(c.course_urls) ? c.course_urls.length : 0
  return (
    /^(https?:\/\/|www\.)/i.test(c.title || '') ||
    (c.price || 0) > 500000 ||
    urls < 1 ||
    (c.description || '').trim().length < 40
  )
}

export const AdminCourseModeration: React.FC = () => {
  const { toast } = useToast()
  const [tab, setTab] = useState<Status>('pending')
  const [courses, setCourses] = useState<CourseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select('id, title, description, price, user_id, status, moderation_status, moderation_note, course_urls, enrollment_count, created_at')
      .eq('moderation_status', tab)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      toast({ title: 'Failed to load courses', description: error.message, variant: 'destructive' })
    } else {
      setCourses((data || []) as CourseRow[])
    }
    setLoading(false)
  }, [tab, toast])

  useEffect(() => { load() }, [load])

  const moderate = async (course: CourseRow, next: Status) => {
    setBusy(course.id)
    const { error } = await supabase.rpc('moderate_course', {
      p_course_id: course.id,
      p_status: next,
      p_note: notes[course.id]?.trim() || null,
    })
    setBusy(null)
    if (error) {
      toast({ title: 'Action failed', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: next === 'approved' ? 'Course approved' : 'Course rejected' })
    setCourses(prev => prev.filter(c => c.id !== course.id))
  }

  const remove = async (course: CourseRow) => {
    setBusy(course.id)
    const { error } = await supabase.from('courses').delete().eq('id', course.id)
    setBusy(null)
    if (error) {
      toast({ title: 'Delete failed', description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: 'Course deleted' })
    setCourses(prev => prev.filter(c => c.id !== course.id))
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <GraduationCap className="h-4 w-4" />
          Course Moderation
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>
        </Tabs>

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">Loading...</p>
        ) : courses.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No {tab} courses.</p>
        ) : (
          <div className="space-y-3">
            {courses.map(course => (
              <Card key={course.id} className="p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm break-words">{course.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-3">{course.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="secondary" className="text-xs">{(course.price || 0).toLocaleString()} NC</Badge>
                    <Badge variant="outline" className="text-xs">
                      {Array.isArray(course.course_urls) ? course.course_urls.length : 0} lessons
                    </Badge>
                  </div>
                </div>

                {looksSpammy(course) && (
                  <div className="flex items-center gap-2 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    Likely spam: link-only title, unrealistic price, or missing content
                  </div>
                )}

                <p className="text-[11px] text-muted-foreground">
                  {format(new Date(course.created_at), 'dd MMM yyyy')} · {course.enrollment_count || 0} students
                </p>

                {course.moderation_note && (
                  <p className="text-xs text-muted-foreground italic">Note: {course.moderation_note}</p>
                )}

                <Textarea
                  placeholder="Note to the instructor (optional)"
                  value={notes[course.id] || ''}
                  onChange={(e) => setNotes(prev => ({ ...prev, [course.id]: e.target.value }))}
                  className="text-xs min-h-[60px]"
                />

                <div className="flex flex-wrap gap-2">
                  {tab !== 'approved' && (
                    <Button size="sm" disabled={busy === course.id} onClick={() => moderate(course, 'approved')}>
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                  )}
                  {tab !== 'rejected' && (
                    <Button size="sm" variant="outline" disabled={busy === course.id} onClick={() => moderate(course, 'rejected')}>
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  )}
                  <Button size="sm" variant="destructive" disabled={busy === course.id} onClick={() => remove(course)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AdminCourseModeration
