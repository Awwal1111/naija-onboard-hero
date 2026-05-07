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
  })

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
      const { error } = await supabase.from('mini_apps').insert({
        developer_id: user.id,
        app_name: form.app_name,
        app_description: form.app_description,
        app_url: form.app_url,
        app_icon_url: form.app_icon_url || null,
        category: form.category,
      } as any)

      if (error) throw error

      toast.success('Mini App submitted for review! Admin will approve it shortly.')
      setForm({ app_name: '', app_description: '', app_url: '', app_icon_url: '', category: 'utility' })
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


          placeholder="0x... (Celo wallet)"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Required only if your app charges users in USDT (on Celo). Leave blank for NC-only apps.
        </p>
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-2">
        <Rocket className="h-4 w-4" />
        {submitting ? 'Submitting...' : 'Submit for Review'}
      </Button>
    </form>
  )
}
