import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useWallet } from '@/hooks/useWallet'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Logo } from '@/components/ui/logo'
import { Loader2, Send, ShieldAlert, CheckCircle2, User } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface RecipientInfo {
  user_id: string
  full_name: string | null
  profile_picture_url?: string | null
}

interface RequestInfo {
  id: string
  short_code: string
  amount: number | null
  note: string | null
  status: string
  expires_at: string | null
  creator_user_id: string
}

/**
 * Public pay page. Two entry shapes:
 *   /pay/u/:userId        → free-amount transfer to that user
 *   /pay/req/:shortCode   → preset-amount transfer from a payment_request row
 */
export default function PayLink() {
  const { userId, shortCode } = useParams<{ userId?: string; shortCode?: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { balance, refreshWallet } = useWallet()

  const [loading, setLoading] = useState(true)
  const [recipient, setRecipient] = useState<RecipientInfo | null>(null)
  const [request, setRequest] = useState<RequestInfo | null>(null)
  const [amount, setAmount] = useState('')
  const [pin, setPin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true); setError(null)
      try {
        let targetUserId = userId || ''
        if (shortCode) {
          const { data: reqData, error: reqErr } = await supabase
            .from('payment_requests')
            .select('id, short_code, amount, note, status, expires_at, creator_user_id')
            .eq('short_code', shortCode)
            .limit(1)
            .maybeSingle()
          if (reqErr || !reqData) throw new Error('Payment request not found')
          if (reqData.status !== 'pending') throw new Error(`This request is ${reqData.status}`)
          if (reqData.expires_at && new Date(reqData.expires_at) < new Date()) {
            throw new Error('This payment request has expired')
          }
          setRequest(reqData as RequestInfo)
          targetUserId = reqData.creator_user_id
          if (reqData.amount) setAmount(String(reqData.amount))
        }
        if (!targetUserId) throw new Error('No recipient specified')
        const { data: prof, error: profErr } = await supabase
          .from('profiles')
          .select('user_id, full_name, avatar_url')
          .eq('user_id', targetUserId)
          .limit(1)
          .maybeSingle()
        if (profErr || !prof) throw new Error('Recipient profile not found')
        if (cancelled) return
        setRecipient(prof as RecipientInfo)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load payment link')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [userId, shortCode])

  const handlePay = async () => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
      return
    }
    if (!recipient) return
    if (recipient.user_id === user.id) return toast.error('You cannot pay yourself')
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')
    if (amt > (balance?.withdrawable || 0)) return toast.error('Insufficient withdrawable balance')
    if (pin.length !== 4) return toast.error('Enter your 4-digit PIN')

    setSubmitting(true)
    try {
      // Look up recipient email for the existing transfer_funds RPC
      const { data: emailLookup } = await supabase.rpc('lookup_user_by_email', { lookup_email: '' as any }).single()
      void emailLookup
      // The RPC uses recipient_email; fetch it from profiles
      const { data: emailRow } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', recipient.user_id)
        .limit(1)
        .maybeSingle()
      const recipientEmail = (emailRow as any)?.email
      if (!recipientEmail) throw new Error('Recipient email is unavailable; cannot transfer.')

      const { data, error: rpcErr } = await supabase.rpc('transfer_funds', {
        sender_id: user.id,
        recipient_email: recipientEmail,
        amount: amt,
        pin_hash: pin,
      })
      if (rpcErr) throw rpcErr
      const result = data as any
      if (!result?.success) throw new Error(result?.error || 'Transfer failed')

      // Mark request as paid if applicable
      if (request) {
        await supabase
          .from('payment_requests')
          .update({
            status: 'paid',
            paid_by_user_id: user.id,
            paid_at: new Date().toISOString(),
            paid_amount: amt,
          })
          .eq('id', request.id)
      }

      await refreshWallet()
      setDone(true)
      toast.success(`Sent NC ${amt.toLocaleString()} to ${recipient.full_name || 'recipient'}`)
    } catch (e: any) {
      toast.error(e?.message || 'Payment failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 space-y-4">
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button variant="outline" className="w-full" onClick={() => navigate('/')}>Go home</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-6 space-y-3">
            <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
            <h1 className="text-xl font-bold">Payment sent!</h1>
            <p className="text-sm text-muted-foreground">
              NC {parseFloat(amount).toLocaleString()} delivered to {recipient?.full_name || 'recipient'}.
            </p>
            <Button onClick={() => navigate('/wallet')} className="w-full">View wallet</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="max-w-md mx-auto space-y-4">
        <div className="flex justify-center">
          <Link to="/"><Logo /></Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pay {recipient?.full_name || 'NaijaLancers user'}</CardTitle>
            <CardDescription>
              {request ? 'Confirm and complete this payment request.' : 'Send Naijacoin from your withdrawable balance.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted">
              <Avatar className="h-10 w-10">
                <AvatarImage src={recipient?.avatar_url || undefined} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{recipient?.full_name || 'NaijaLancers user'}</p>
                <p className="text-xs text-muted-foreground">Verified recipient</p>
              </div>
            </div>

            {request?.note && (
              <Alert>
                <AlertDescription className="text-sm italic">"{request.note}"</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label>Amount (NC)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={!!request?.amount}
                placeholder="0"
                min="1"
              />
              {user && balance && (
                <p className="text-xs text-muted-foreground">
                  Available: NC {balance.withdrawable.toLocaleString()}
                </p>
              )}
            </div>

            {user ? (
              <>
                <div className="space-y-2">
                  <Label>Transaction PIN</Label>
                  <Input
                    type="password"
                    inputMode="numeric"
                    placeholder="4-digit PIN"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Set your PIN in <Link to="/settings/pin" className="text-primary underline">Settings</Link> if you haven't.
                  </p>
                </div>
                <Button onClick={handlePay} disabled={submitting || !amount || pin.length !== 4} className="w-full">
                  {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending…</> : <><Send className="mr-2 h-4 w-4" /> Pay NC {amount || '0'}</>}
                </Button>
              </>
            ) : (
              <Button
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)}
                className="w-full"
              >
                Log in to pay
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Payments are instant, internal NC transfers. PIN-protected.
        </p>
      </div>
    </div>
  )
}
