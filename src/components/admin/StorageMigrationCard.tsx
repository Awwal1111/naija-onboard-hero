import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { CloudUpload, Loader2 } from 'lucide-react'

const TABLES = [
  { value: 'profiles', label: 'Profiles (profile_picture_url)' },
  { value: 'stories', label: 'Stories (media_url)' },
  { value: 'portfolio_items', label: 'Portfolio Items (media_url)' },
]

export function StorageMigrationCard() {
  const [table, setTable] = useState('profiles')
  const [limit, setLimit] = useState(25)
  const [dryRun, setDryRun] = useState(true)
  const [running, setRunning] = useState(false)
  const [last, setLast] = useState<any>(null)

  const run = async () => {
    setRunning(true)
    try {
      const { data, error } = await supabase.functions.invoke('migrate-storage-to-catbox', {
        body: { table, limit, dryRun },
      })
      if (error) throw error
      setLast(data)
      toast.success(`Batch done: ${data.success} ok, ${data.failed} failed${dryRun ? ' (dry run)' : ''}`)
    } catch (e: any) {
      toast.error(e?.message || 'Migration failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CloudUpload className="w-5 h-5" /> Migrate Supabase Storage → Catbox
        </CardTitle>
        <CardDescription>
          Rewrites public media URLs from Supabase Storage to Catbox (with Cloudinary fallback).
          Run in small batches. Use Dry Run first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Table</Label>
            <Select value={table} onValueChange={setTable}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TABLES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Batch size (max 100)</Label>
            <Input type="number" min={1} max={100} value={limit}
              onChange={e => setLimit(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch checked={dryRun} onCheckedChange={setDryRun} id="dry-run" />
          <Label htmlFor="dry-run">Dry run (don't write)</Label>
        </div>

        <Button onClick={run} disabled={running} className="w-full">
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {running ? 'Running…' : `Run batch on ${table}`}
        </Button>

        {last && (
          <div className="rounded-md bg-muted p-3 text-xs space-y-1">
            <div>Processed: <b>{last.processed}</b> · Success: <b>{last.success}</b> · Failed: <b>{last.failed}</b> {last.dryRun && '(dry run)'}</div>
            {last.results?.filter((r: any) => !r.ok).slice(0, 5).map((r: any) => (
              <div key={r.id} className="text-destructive">✗ {r.id}: {r.error}</div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
