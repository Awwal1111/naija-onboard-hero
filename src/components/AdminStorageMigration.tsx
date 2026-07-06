import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { HardDrive, Loader2 } from 'lucide-react'

const BUCKETS = ['profiles', 'Feed', 'gig-images', 'portfolio', 'stories']

interface Result {
  path: string
  status: string
  rewrites?: number
  bytes?: number
  error?: string
}

export function AdminStorageMigration() {
  const { toast } = useToast()
  const [bucket, setBucket] = useState<string>('Feed')
  const [running, setRunning] = useState(false)
  const [processed, setProcessed] = useState(0)
  const [migrated, setMigrated] = useState(0)
  const [failed, setFailed] = useState(0)
  const [bytesFreed, setBytesFreed] = useState(0)
  const [log, setLog] = useState<Result[]>([])

  const runAll = async () => {
    setRunning(true)
    setProcessed(0); setMigrated(0); setFailed(0); setBytesFreed(0); setLog([])
    let offset = 0
    try {
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase.functions.invoke('migrate-storage-to-catbox', {
          body: null,
          method: 'POST',
          // pass params via query string using the fetch URL builder
        } as any)
        // supabase.functions.invoke doesn't easily support query params; use direct fetch
        const projectUrl = (import.meta as any).env.VITE_SUPABASE_URL
        const sess = await supabase.auth.getSession()
        const token = sess.data.session?.access_token
        const res = await fetch(
          `${projectUrl}/functions/v1/migrate-storage-to-catbox?bucket=${encodeURIComponent(bucket)}&offset=${offset}&limit=10`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` } },
        )
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'failed')
        const results: Result[] = json.results || []
        setLog((l) => [...results, ...l].slice(0, 200))
        setProcessed((p) => p + results.length)
        setMigrated((m) => m + results.filter((r) => r.status === 'migrated').length)
        setFailed((f) => f + results.filter((r) => r.status === 'error').length)
        setBytesFreed((b) => b + results.reduce((s, r) => s + (r.bytes || 0), 0))
        if (json.next_offset === null) break
        offset = json.next_offset
      }
      toast({ title: 'Migration complete', description: `Bucket ${bucket} finished` })
    } catch (e: any) {
      toast({ title: 'Migration error', description: e.message, variant: 'destructive' })
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HardDrive className="w-5 h-5" /> Egress Reducer — Storage → Catbox
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Move legacy public Supabase Storage files to Catbox and rewrite database
          references. This stops each old image/video from billing egress every time
          it is loaded. Run per bucket, one at a time.
        </p>
        <div className="flex flex-wrap gap-2">
          {BUCKETS.map((b) => (
            <Button
              key={b}
              size="sm"
              variant={bucket === b ? 'default' : 'outline'}
              onClick={() => setBucket(b)}
              disabled={running}
            >
              {b}
            </Button>
          ))}
        </div>
        <Button onClick={runAll} disabled={running}>
          {running ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Migrating {bucket}…</>) : `Migrate ${bucket}`}
        </Button>
        {(processed > 0 || running) && (
          <div className="grid grid-cols-4 gap-2 text-sm">
            <Badge variant="secondary">Processed: {processed}</Badge>
            <Badge variant="default">Migrated: {migrated}</Badge>
            <Badge variant="destructive">Failed: {failed}</Badge>
            <Badge variant="outline">Freed: {(bytesFreed / 1024 / 1024).toFixed(1)} MB</Badge>
          </div>
        )}
        {log.length > 0 && (
          <div className="max-h-64 overflow-auto text-xs font-mono border rounded p-2 bg-muted/30">
            {log.map((r, i) => (
              <div key={i} className={r.status === 'error' ? 'text-destructive' : ''}>
                [{r.status}] {r.path} {r.rewrites != null ? `→ ${r.rewrites} refs` : ''} {r.error || ''}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
