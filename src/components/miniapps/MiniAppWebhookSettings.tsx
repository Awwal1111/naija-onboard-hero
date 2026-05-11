import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Copy, Eye, EyeOff, RefreshCw } from 'lucide-react'

interface Props {
  appId: string
  appName: string
  open: boolean
  onOpenChange: (v: boolean) => void
}

export function MiniAppWebhookSettings({ appId, appName, open, onOpenChange }: Props) {
  const [webhookUrl, setWebhookUrl] = useState('')
  const [secret, setSecret] = useState('')
  const [showSecret, setShowSecret] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    supabase.from('mini_apps')
      .select('webhook_url, webhook_secret')
      .eq('id', appId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message)
          setLoading(false)
          return
        }
        setWebhookUrl((data as any)?.webhook_url || '')
        setSecret((data as any)?.webhook_secret || '')
        setLoading(false)
      })
  }, [open, appId])

  const save = async () => {
    setSaving(true)
    if (webhookUrl && !/^https:\/\//i.test(webhookUrl)) {
      toast.error('Webhook URL must start with https://')
      setSaving(false)
      return
    }
    const { error } = await supabase.from('mini_apps')
      .update({ webhook_url: webhookUrl.trim() || null })
      .eq('id', appId)
      .select('id')
      .single()
    setSaving(false)
    if (error) toast.error(error.message)
    else toast.success('Webhook URL saved')
  }

  const rotate = async () => {
    if (!confirm('Rotate signing secret? Your current backend will stop verifying until you update it.')) return
    const newSecret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map(b => b.toString(16).padStart(2, '0')).join('')
    const { error } = await supabase.from('mini_apps')
      .update({ webhook_secret: newSecret })
      .eq('id', appId)
      .select('id')
      .single()
    if (error) return toast.error(error.message)
    setSecret(newSecret)
    setShowSecret(true)
    toast.success('New secret generated')
  }

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v)
    toast.success(`${label} copied`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Webhook — {appName}</DialogTitle>
          <DialogDescription>
            Receive a signed POST when a user pays. Verify the <code>X-Naijalancers-Signature</code> header
            (HMAC-SHA256 of the raw body using your secret).
          </DialogDescription>
        </DialogHeader>

        {loading ? <p className="text-sm text-muted-foreground">Loading…</p> : (
          <div className="space-y-4">
            <div>
              <Label>Webhook URL</Label>
              <Input
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://yourapp.com/api/naijalancers-webhook"
              />
            </div>

            <div>
              <Label>Signing Secret</Label>
              <div className="flex gap-2">
                <Input value={showSecret ? secret : '•'.repeat(20)} readOnly className="font-mono text-xs" />
                <Button size="icon" variant="outline" onClick={() => setShowSecret(s => !s)}>
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
                <Button size="icon" variant="outline" onClick={() => copy(secret, 'Secret')}>
                  <Copy className="w-4 h-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={rotate} title="Rotate">
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Keep this secret — never ship it to client code.</p>
            </div>

            <div className="rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto">
              <p className="text-muted-foreground mb-1">Verify in Node.js:</p>
              <pre>{`const sig = req.headers['x-naijalancers-signature'];
const expected = 'sha256=' + crypto
  .createHmac('sha256', SECRET)
  .update(rawBody).digest('hex');
if (sig !== expected) return res.status(401).end();`}</pre>
            </div>

            <Button className="w-full" onClick={save} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
