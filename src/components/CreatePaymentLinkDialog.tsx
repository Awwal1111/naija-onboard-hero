import { useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Link as LinkIcon, Loader2, Share2 } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
}

function genCode(len = 8) {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789'
  let s = ''
  for (let i = 0; i < len; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)]
  return s
}

export const CreatePaymentLinkDialog = ({ open, onOpenChange }: Props) => {
  const { user } = useAuth()
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const profileLink = user ? `${origin}/pay/u/${user.id}` : ''

  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [generatedLink, setGeneratedLink] = useState<string | null>(null)

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Link copied')
  }

  const share = async (text: string) => {
    if (navigator.share) {
      try { await navigator.share({ title: 'Pay me on NaijaLancers', url: text }) } catch { /* user cancelled */ }
    } else {
      copy(text)
    }
  }

  const createRequest = async () => {
    if (!user) return toast.error('Sign in required')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')

    setSubmitting(true)
    try {
      // Retry on rare short_code collision
      let row: { short_code: string } | null = null
      for (let i = 0; i < 4; i++) {
        const code = genCode(8)
        const { data, error } = await supabase
          .from('payment_requests')
          .insert({
            creator_user_id: user.id,
            short_code: code,
            amount: amt,
            note: note || null,
            status: 'pending',
            expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
          })
          .select('short_code')
          .limit(1)
          .single()
        if (!error && data) { row = data; break }
        if (error && !/duplicate|unique/i.test(error.message)) {
          throw error
        }
      }
      if (!row) throw new Error('Could not generate a unique link, try again')
      setGeneratedLink(`${origin}/pay/req/${row.short_code}`)
      toast.success('Payment link ready')
    } catch (e: any) {
      toast.error(e?.message || 'Could not create link')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) { setAmount(''); setNote(''); setGeneratedLink(null) }
        onOpenChange(v)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5 text-primary" /> Request payment
          </DialogTitle>
          <DialogDescription>
            Share a link. Logged-in NaijaLancers users can pay you instantly from their NC balance.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="request">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="request">Request amount</TabsTrigger>
            <TabsTrigger value="profile">My profile link</TabsTrigger>
          </TabsList>

          <TabsContent value="request" className="space-y-3 pt-2">
            {generatedLink ? (
              <div className="space-y-3">
                <Alert>
                  <AlertDescription className="text-xs">
                    Share this link with whoever should pay you. It expires in 7 days.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2 items-center bg-muted rounded-md px-2 py-1.5">
                  <span className="text-xs flex-1 break-all">{generatedLink}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" onClick={() => copy(generatedLink)}>
                    <Copy className="h-4 w-4 mr-2" /> Copy
                  </Button>
                  <Button onClick={() => share(generatedLink)}>
                    <Share2 className="h-4 w-4 mr-2" /> Share
                  </Button>
                </div>
                <Button variant="ghost" className="w-full" onClick={() => { setGeneratedLink(null); setAmount(''); setNote('') }}>
                  Create another
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <Label>Amount (NC)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    min="1"
                  />
                </div>
                <div className="space-y-1">
                  <Label>What's it for? (optional)</Label>
                  <Textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value.slice(0, 200))}
                    placeholder="e.g. Logo design — final payment"
                    rows={2}
                  />
                </div>
                <Button onClick={createRequest} disabled={submitting || !amount} className="w-full">
                  {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating…</> : <><LinkIcon className="h-4 w-4 mr-2" /> Generate link</>}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="profile" className="space-y-3 pt-2">
            <Alert>
              <AlertDescription className="text-xs">
                Your permanent profile link. The payer chooses any amount.
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 items-center bg-muted rounded-md px-2 py-1.5">
              <span className="text-xs flex-1 break-all">{profileLink || 'Sign in to see your link'}</span>
            </div>
            {profileLink && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => copy(profileLink)}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
                <Button onClick={() => share(profileLink)}>
                  <Share2 className="h-4 w-4 mr-2" /> Share
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
