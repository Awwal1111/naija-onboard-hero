import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Search, Loader2, Trash2 } from 'lucide-react'

const BUCKETS = [
  'profiles', 'avatars', 'stories', 'portfolio', 'portfolio-items',
  'posts', 'gigs', 'jobs-services', 'articles', 'courses', 'training-files',
]

type Orphan = { path: string; size: number; createdAt: string }

const formatBytes = (b: number) => {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(1)} MB`
  return `${(b / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function StorageOrphanScannerCard() {
  const [bucket, setBucket] = useState('posts')
  const [olderThanDays, setOlderThanDays] = useState(7)
  const [limit, setLimit] = useState(500)
  const [scanning, setScanning] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [orphans, setOrphans] = useState<Orphan[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [totalBytes, setTotalBytes] = useState(0)
  const [scanned, setScanned] = useState(0)

  const scan = async () => {
    setScanning(true)
    setOrphans([])
    setSelected(new Set())
    try {
      const { data, error } = await supabase.functions.invoke('storage-orphan-scanner', {
        body: { action: 'scan', bucket, olderThanDays, limit },
      })
      if (error) throw error
      setOrphans(data.orphans || [])
      setTotalBytes(data.totalBytes || 0)
      setScanned(data.scanned || 0)
      toast.success(`Found ${data.orphanCount} orphans (${formatBytes(data.totalBytes)})`)
    } catch (e: any) {
      toast.error(e?.message || 'Scan failed')
    } finally {
      setScanning(false)
    }
  }

  const toggle = (path: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  const toggleAll = () => {
    if (selected.size === orphans.length) setSelected(new Set())
    else setSelected(new Set(orphans.map(o => o.path)))
  }

  const deleteSelected = async () => {
    if (selected.size === 0) return
    if (!confirm(`Permanently delete ${selected.size} files from ${bucket}? This cannot be undone.`)) return
    setDeleting(true)
    try {
      const paths = Array.from(selected)
      const { data, error } = await supabase.functions.invoke('storage-orphan-scanner', {
        body: { action: 'delete', bucket, paths },
      })
      if (error) throw error
      toast.success(`Deleted ${data.deleted} files`)
      setOrphans(prev => prev.filter(o => !selected.has(o.path)))
      setSelected(new Set())
    } catch (e: any) {
      toast.error(e?.message || 'Delete failed')
    } finally {
      setDeleting(false)
    }
  }

  const selectedBytes = orphans.filter(o => selected.has(o.path)).reduce((a, b) => a + b.size, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" /> Storage Orphan Scanner
        </CardTitle>
        <CardDescription>
          Finds files in Supabase Storage not referenced by any DB row. Review before deleting — deletion is permanent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label>Bucket</Label>
            <Select value={bucket} onValueChange={setBucket}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {BUCKETS.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Older than (days)</Label>
            <Input type="number" min={0} value={olderThanDays}
              onChange={e => setOlderThanDays(Math.max(0, Number(e.target.value) || 0))} />
          </div>
          <div>
            <Label>Max files to scan</Label>
            <Input type="number" min={1} max={2000} value={limit}
              onChange={e => setLimit(Math.min(2000, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={scan} disabled={scanning} className="flex-1">
            {scanning ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
            {scanning ? 'Scanning…' : 'Scan'}
          </Button>
          <Button
            onClick={deleteSelected}
            disabled={deleting || selected.size === 0}
            variant="destructive"
          >
            {deleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
            Delete {selected.size > 0 ? `${selected.size} (${formatBytes(selectedBytes)})` : ''}
          </Button>
        </div>

        {orphans.length > 0 && (
          <div className="rounded-md border">
            <div className="flex items-center gap-2 p-2 border-b bg-muted/50 text-xs">
              <Checkbox
                checked={selected.size === orphans.length}
                onCheckedChange={toggleAll}
              />
              <span className="flex-1">
                <b>{orphans.length}</b> orphans · {formatBytes(totalBytes)} · scanned {scanned}
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {orphans.map(o => (
                <div key={o.path} className="flex items-center gap-2 p-2 border-b text-xs hover:bg-muted/30">
                  <Checkbox
                    checked={selected.has(o.path)}
                    onCheckedChange={() => toggle(o.path)}
                  />
                  <span className="flex-1 truncate font-mono">{o.path}</span>
                  <span className="text-muted-foreground">{formatBytes(o.size)}</span>
                  <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {!scanning && orphans.length === 0 && scanned > 0 && (
          <div className="text-center text-sm text-muted-foreground py-4">
            No orphans found. All {scanned} files in this bucket are referenced.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
