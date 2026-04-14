import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { X, ArrowLeft, Shield, Fingerprint } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useUserSecrets } from '@/hooks/useUserSecrets'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface MiniApp {
  id: string
  app_name: string
  app_description: string
  app_icon_url: string | null
  app_url: string
  sdk_app_id: string
}

interface MiniAppViewerProps {
  app: MiniApp
  onClose: () => void
}

export const MiniAppViewer = ({ app, onClose }: MiniAppViewerProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { hasPin, transactionPin } = useUserSecrets()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showChargeDialog, setShowChargeDialog] = useState(false)
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [showPinDialog, setShowPinDialog] = useState(false)
  const [pinInput, setPinInput] = useState('')
  const [pendingPinRequest, setPendingPinRequest] = useState<{ reason: string; requestId: string } | null>(null)
  const [pendingCharge, setPendingCharge] = useState<{
    amount: number; description: string; requestId: string; chargeType: string
  } | null>(null)
  const [pendingPayout, setPendingPayout] = useState<{
    amount: number; description: string; requestId: string
  } | null>(null)

  // Track whether we already sent a result for the current pending request
  const resultSentRef = useRef<Record<string, boolean>>({})

  const allowedOrigin = useMemo(() => {
    try { return new URL(app.app_url).origin } catch { return '*' }
  }, [app.app_url])

  // Post message to iframe with origin restriction
  const postToIframe = useCallback((data: Record<string, unknown>) => {
    const win = iframeRef.current?.contentWindow
    if (!win) {
      console.warn('[SDK] No iframe contentWindow available')
      return
    }
    console.log('[SDK] Sending:', data.type, data)
    win.postMessage(data, allowedOrigin)
  }, [allowedOrigin])

  // Always include both requestId and request_id
  const withIds = useCallback((rid: string, payload: Record<string, unknown>) => ({
    ...payload, requestId: rid, request_id: rid,
  }), [])

  // Build identify payload - works even with partial profile
  const buildIdentify = useCallback(() => {
    if (!user) return null
    return {
      type: 'njl_identify',
      user: {
        user_id: user.id,
        full_name: profile?.full_name || '',
        email: user.email || '',
        profile_picture_url: profile?.profile_picture_url || '',
      },
      app_id: app.sdk_app_id,
      host_origin: window.location.origin,
      host_domain: 'naijalancers.name.ng',
      allowed_parent_origins: [window.location.origin, 'https://naijalancers.name.ng'],
      sdk_version: '2.0',
      timestamp: Date.now(),
    }
  }, [user, profile?.full_name, profile?.profile_picture_url, app.sdk_app_id])

  const sendIdentify = useCallback(() => {
    const payload = buildIdentify()
    if (payload) postToIframe(payload)
  }, [buildIdentify, postToIframe])

  // Extract requestId from either format
  const getRid = (d: any): string => d?.requestId || d?.request_id || `auto_${Date.now()}`

  // Parse incoming message data - handles both object and stringified JSON
  const parseMessageData = (raw: any): any => {
    if (!raw) return null
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) } catch { return null }
    }
    return raw
  }

  // Handle balance query
  const handleBalance = useCallback(async (rid: string) => {
    if (!user) {
      postToIframe(withIds(rid, { type: 'njl_balance_result', balance: 0, error: 'Auth required' }))
      return
    }
    try {
      const { data } = await supabase.from('profiles').select('wallet_balance').eq('user_id', user.id).single()
      postToIframe(withIds(rid, { type: 'njl_balance_result', balance: (data as any)?.wallet_balance || 0 }))
    } catch {
      postToIframe(withIds(rid, { type: 'njl_balance_result', balance: 0, error: 'Fetch failed' }))
    }
  }, [user, postToIframe, withIds])

  // Main message handler - attached BEFORE iframe loads to catch early njl_ready
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // Accept messages from any source initially (iframe ref may not be set yet)
      const isFromIframe = event.source === iframeRef.current?.contentWindow
      if (!isFromIframe) return
      if (allowedOrigin !== '*' && event.origin !== allowedOrigin) return

      const data = parseMessageData(event.data)
      if (!data || typeof data.type !== 'string') return
      if (!data.type.startsWith('njl_')) return

      const rid = getRid(data)
      console.log('[SDK] ← Received:', data.type, 'rid:', rid, data)

      switch (data.type) {
        case 'njl_ready':
        case 'njl_handshake':
        case 'njl_ping':
          console.log('[SDK] Handshake received, sending identify')
          sendIdentify()
          break

        case 'njl_balance':
          handleBalance(rid)
          break

        case 'njl_charge': {
          if (!user) {
            postToIframe(withIds(rid, { type: 'njl_charge_result', success: false, error: 'Auth required' }))
            return
          }
          if (!data.amount || data.amount <= 0) {
            postToIframe(withIds(rid, { type: 'njl_charge_result', success: false, error: 'Invalid amount' }))
            return
          }
          resultSentRef.current[rid] = false
          setPendingCharge({
            amount: data.amount,
            description: data.description || 'Mini App Purchase',
            requestId: rid,
            chargeType: data.charge_type || 'one_time',
          })
          setShowChargeDialog(true)
          break
        }

        case 'njl_payout': {
          if (!user) {
            postToIframe(withIds(rid, { type: 'njl_payout_result', success: false, error: 'Auth required' }))
            return
          }
          if (!data.amount || data.amount <= 0) {
            postToIframe(withIds(rid, { type: 'njl_payout_result', success: false, error: 'Invalid amount' }))
            return
          }
          resultSentRef.current[rid] = false
          setPendingPayout({
            amount: data.amount,
            description: data.description || 'Payout',
            requestId: rid,
          })
          setShowPayoutDialog(true)
          break
        }

        case 'njl_push': {
          if (!user || !data.title || !data.body) {
            postToIframe(withIds(rid, { type: 'njl_push_result', success: false, error: 'Missing fields' }))
            return
          }
          supabase.functions.invoke('send-push-notification', {
            body: {
              userId: user.id, title: data.title, body: data.body.substring(0, 200),
              icon: app.app_icon_url || '/icon-512.png', badge: '/icon-512.png',
              url: data.url || '/apps', data: { type: 'mini_app', appId: app.id },
            }
          }).then(() => {
            postToIframe(withIds(rid, { type: 'njl_push_result', success: true }))
          }).catch(() => {
            postToIframe(withIds(rid, { type: 'njl_push_result', success: false, error: 'Failed' }))
          })
          break
        }

        case 'njl_verify_pin': {
          if (!user) {
            postToIframe(withIds(rid, { type: 'njl_verify_pin_result', success: false, error: 'Auth required' }))
            return
          }
          if (!hasPin) {
            postToIframe(withIds(rid, { type: 'njl_verify_pin_result', success: false, error: 'No PIN set' }))
            toast.error('Set up your transaction PIN in Settings first')
            return
          }
          resultSentRef.current[rid] = false
          setPendingPinRequest({ reason: data.reason || 'verify your identity', requestId: rid })
          setPinInput('')
          setShowPinDialog(true)
          break
        }
      }
    }

    window.addEventListener('message', handler)
    return () => window.removeEventListener('message', handler)
  }, [allowedOrigin, handleBalance, postToIframe, hasPin, withIds, user, app.app_icon_url, app.id, sendIdentify])

  // Re-send identify when profile loads (covers late-loading profile)
  useEffect(() => {
    if (profile && user) sendIdentify()
  }, [profile, user, sendIdentify])

  // --- Action handlers ---

  const sendResult = (rid: string, payload: Record<string, unknown>) => {
    if (resultSentRef.current[rid]) return
    resultSentRef.current[rid] = true
    postToIframe(withIds(rid, payload))
  }

  const handleConfirmCharge = async () => {
    if (!pendingCharge || !user) return
    const rid = pendingCharge.requestId

    try {
      const txRef = 'njl_tx_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      const { data, error } = await supabase.rpc('process_mini_app_payment', {
        p_user_id: user.id, p_mini_app_id: app.id,
        p_amount: pendingCharge.amount, p_description: pendingCharge.description, p_tx_ref: txRef,
      })
      const result = data as any
      if (error || !result?.success) {
        const errMsg = result?.error || error?.message || 'Payment failed'
        toast.error(errMsg)
        sendResult(rid, { type: 'njl_charge_result', success: false, error: errMsg })
      } else {
        sendResult(rid, { type: 'njl_charge_result', success: true, txRef: result.tx_ref, tx_ref: result.tx_ref })
        toast.success(`₦${pendingCharge.amount}NC paid to ${app.app_name}`)
      }
    } catch {
      sendResult(rid, { type: 'njl_charge_result', success: false, error: 'Payment failed' })
      toast.error('Payment failed')
    }
    setPendingCharge(null)
    setShowChargeDialog(false)
  }

  const handleConfirmPayout = async () => {
    if (!pendingPayout || !user) return
    const rid = pendingPayout.requestId

    try {
      const txRef = 'njl_po_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      const { data, error } = await supabase.rpc('process_mini_app_payout', {
        p_mini_app_id: app.id, p_user_id: user.id,
        p_amount: pendingPayout.amount, p_description: pendingPayout.description, p_tx_ref: txRef,
      })
      const result = data as any
      if (error || !result?.success) {
        const errMsg = result?.error || error?.message || 'Payout failed'
        toast.error(errMsg)
        sendResult(rid, { type: 'njl_payout_result', success: false, error: errMsg })
      } else {
        sendResult(rid, { type: 'njl_payout_result', success: true, txRef: result.tx_ref, tx_ref: result.tx_ref })
        toast.success(`₦${pendingPayout.amount}NC received from ${app.app_name}`)
      }
    } catch {
      sendResult(rid, { type: 'njl_payout_result', success: false, error: 'Payout failed' })
      toast.error('Payout failed')
    }
    setPendingPayout(null)
    setShowPayoutDialog(false)
  }

  // Track install
  useEffect(() => {
    supabase.from('mini_apps')
      .update({ install_count: (app as any).install_count + 1 })
      .eq('id', app.id).then(() => {})
  }, [app.id])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: '100%' }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed inset-0 z-[100] bg-background flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {app.app_icon_url ? (
              <img src={app.app_icon_url} alt="" className="w-7 h-7 rounded-lg" />
            ) : (
              <div className="w-7 h-7 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{app.app_name.charAt(0)}</span>
              </div>
            )}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground truncate">{app.app_name}</h3>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-green-500" />
                <span className="text-[10px] text-green-600">Verified by NaijaLancers</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="absolute inset-0 top-14 flex items-center justify-center bg-background z-10">
            <div className="text-center">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Loading {app.app_name}...</p>
            </div>
          </div>
        )}

        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={app.app_url}
          className="flex-1 w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          onLoad={() => {
            setIsLoading(false)
            // Staggered identify sends to handle different app loading speeds
            sendIdentify()
            setTimeout(sendIdentify, 300)
            setTimeout(sendIdentify, 1000)
            setTimeout(sendIdentify, 3000)
          }}
        />

        {/* Charge Dialog */}
        <Dialog open={showChargeDialog} onOpenChange={(open) => {
          if (!open && pendingCharge) {
            sendResult(pendingCharge.requestId, { type: 'njl_charge_result', success: false, error: 'User cancelled' })
            setPendingCharge(null)
          }
          setShowChargeDialog(open)
        }}>
          <DialogContent className="max-w-sm">
            <DialogDescription className="sr-only">Approve or cancel this charge.</DialogDescription>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                {app.app_icon_url ? (
                  <img src={app.app_icon_url} alt="" className="w-10 h-10 rounded-xl" />
                ) : (
                  <span className="text-xl font-bold text-primary">{app.app_name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{app.app_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">wants to charge your wallet</p>
                <p className="text-sm text-muted-foreground mt-1">{pendingCharge?.description}</p>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <p className="text-2xl font-bold text-primary">₦{pendingCharge?.amount}NC</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => {
                  if (pendingCharge) sendResult(pendingCharge.requestId, { type: 'njl_charge_result', success: false, error: 'User cancelled' })
                  setPendingCharge(null)
                  setShowChargeDialog(false)
                }}>Cancel</Button>
                <Button className="flex-1" onClick={handleConfirmCharge}>
                  Pay ₦{pendingCharge?.amount}NC
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payout Dialog */}
        <Dialog open={showPayoutDialog} onOpenChange={(open) => {
          if (!open && pendingPayout) {
            sendResult(pendingPayout.requestId, { type: 'njl_payout_result', success: false, error: 'User declined' })
            setPendingPayout(null)
          }
          setShowPayoutDialog(open)
        }}>
          <DialogContent className="max-w-sm">
            <DialogDescription className="sr-only">Approve or decline this payout.</DialogDescription>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                {app.app_icon_url ? (
                  <img src={app.app_icon_url} alt="" className="w-10 h-10 rounded-xl" />
                ) : (
                  <span className="text-xl font-bold text-primary">{app.app_name.charAt(0)}</span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{app.app_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">wants to send you money</p>
              </div>
              <div className="bg-muted rounded-xl p-4">
                <p className="text-2xl font-bold text-emerald-600">+₦{pendingPayout?.amount}NC</p>
                <p className="text-sm text-muted-foreground mt-1">{pendingPayout?.description}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => {
                  if (pendingPayout) sendResult(pendingPayout.requestId, { type: 'njl_payout_result', success: false, error: 'User declined' })
                  setPendingPayout(null)
                  setShowPayoutDialog(false)
                }}>Decline</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmPayout}>
                  Accept ₦{pendingPayout?.amount}NC
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* PIN Dialog */}
        <Dialog open={showPinDialog} onOpenChange={(open) => {
          if (!open && pendingPinRequest) {
            sendResult(pendingPinRequest.requestId, { type: 'njl_verify_pin_result', success: false, error: 'User cancelled' })
            setPendingPinRequest(null)
            setPinInput('')
          }
          setShowPinDialog(open)
        }}>
          <DialogContent className="max-w-sm">
            <DialogDescription className="sr-only">Enter your PIN to verify.</DialogDescription>
            <div className="text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                <Fingerprint className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{app.app_name}</h3>
                <p className="text-sm text-muted-foreground mt-1">wants to {pendingPinRequest?.reason}</p>
                <p className="text-xs text-muted-foreground mt-2">Enter your transaction PIN</p>
              </div>
              <Input
                type="password" inputMode="numeric" maxLength={6}
                placeholder="••••••" className="text-center text-2xl tracking-[0.5em]"
                value={pinInput} onChange={e => setPinInput(e.target.value.replace(/\D/g, ''))}
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => {
                  if (pendingPinRequest) sendResult(pendingPinRequest.requestId, { type: 'njl_verify_pin_result', success: false, error: 'User cancelled' })
                  setShowPinDialog(false)
                  setPendingPinRequest(null)
                }}>Cancel</Button>
                <Button className="flex-1" onClick={() => {
                  if (!pendingPinRequest) return
                  const rid = pendingPinRequest.requestId
                  if (pinInput === transactionPin) {
                    sendResult(rid, { type: 'njl_verify_pin_result', success: true })
                    toast.success('Identity verified')
                  } else {
                    sendResult(rid, { type: 'njl_verify_pin_result', success: false, error: 'Incorrect PIN' })
                    toast.error('Incorrect PIN')
                  }
                  setShowPinDialog(false)
                  setPendingPinRequest(null)
                  setPinInput('')
                }}>Verify</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  )
}