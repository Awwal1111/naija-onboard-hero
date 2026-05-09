import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Upload, Rocket } from 'lucide-react'

const CATEGORIES = ['utility', 'finance', 'education', 'social', 'gaming', 'health', 'business', 'other']

export const SubmitMiniAppForm = ({ onSuccess }: { onSuccess?: () => void }) => {
  const { user } = useAuth()
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    app_name: '',
    app_description: '',
    app_url: '',
    app_icon_url: '',
    category: 'utility',
    webhook_url: '',
  })
  const [generatedSecret, setGeneratedSecret] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      toast.error('Please log in first')
      return
    }

    if (!form.app_name || !form.app_url || !form.app_description) {
      toast.error('Please fill all required fields')
      return
    }

    // Validate URL
    try { new URL(form.app_url) } catch {
      toast.error('Please enter a valid app URL')
      return
    }

    setSubmitting(true)
    try {
      // Validate webhook URL if provided
      let webhook_secret: string | null = null
      if (form.webhook_url) {
        if (!/^https:\/\//i.test(form.webhook_url)) {
          toast.error('Webhook URL must start with https://')
          setSubmitting(false)
          return
        }
        webhook_secret = Array.from(crypto.getRandomValues(new Uint8Array(32)))
          .map(b => b.toString(16).padStart(2, '0')).join('')
      }

      const { error } = await supabase.from('mini_apps').insert({
        developer_id: user.id,
        app_name: form.app_name,
        app_description: form.app_description,
        app_url: form.app_url,
        app_icon_url: form.app_icon_url || null,
        category: form.category,
        webhook_url: form.webhook_url || null,
        webhook_secret,
      } as any)

      if (error) throw error

      if (webhook_secret) {
        setGeneratedSecret(webhook_secret)
        toast.success('App submitted! Save your webhook secret below — it will not be shown again.')
      } else {
        toast.success('Mini App submitted for review! Admin will approve it shortly.')
      }
      setForm({ app_name: '', app_description: '', app_url: '', app_icon_url: '', category: 'utility', webhook_url: '' })
      onSuccess?.()
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label>App Name *</Label>
        <Input
          value={form.app_name}
          onChange={e => setForm(f => ({ ...f, app_name: e.target.value }))}
          placeholder="e.g. Gig Shield"
          maxLength={50}
        />
      </div>

      <div>
        <Label>Description *</Label>
        <Textarea
          value={form.app_description}
          onChange={e => setForm(f => ({ ...f, app_description: e.target.value }))}
          placeholder="What does your app do? (max 200 chars)"
          maxLength={200}
          rows={3}
        />
      </div>

      <div>
        <Label>App URL *</Label>
        <Input
          value={form.app_url}
          onChange={e => setForm(f => ({ ...f, app_url: e.target.value }))}
          placeholder="https://your-app.com"
          type="url"
        />
        <p className="text-xs text-muted-foreground mt-1">Your app will load inside NaijaLancers via iframe</p>
      </div>

      <div>
        <Label>App Icon URL</Label>
        <Input
          value={form.app_icon_url}
          onChange={e => setForm(f => ({ ...f, app_icon_url: e.target.value }))}
          placeholder="https://your-app.com/icon.png"
        />
        <p className="text-xs text-muted-foreground mt-1">Square image, at least 128x128px recommended</p>
      </div>

      <div>
        <Label>Category</Label>
        <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>Webhook URL (optional)</Label>
        <Input
          value={form.webhook_url}
          onChange={e => setForm(f => ({ ...f, webhook_url: e.target.value }))}
          placeholder="https://your-backend.com/api/naijalancers-webhook"
          type="url"
        />
        <p className="text-xs text-muted-foreground mt-1">
          We POST signed events (e.g. <code>charge.completed</code>) here. Verify the
          <code className="ml-1">X-Naijalancers-Signature</code> header (HMAC-SHA256 of the raw body).
        </p>
      </div>

      {generatedSecret && (
        <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs">
          <p className="font-semibold mb-1">Your webhook signing secret (copy now — shown only once):</p>
          <code className="block break-all bg-background p-2 rounded font-mono">{generatedSecret}</code>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => { navigator.clipboard.writeText(generatedSecret); toast.success('Secret copied') }}
          >
            Copy secret
          </Button>
        </div>
      )}

      <Button type="submit" disabled={submitting} className="w-full gap-2">
        <Rocket className="h-4 w-4" />
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </Button>
    </form>
  )
}
