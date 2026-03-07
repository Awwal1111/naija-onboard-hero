import { useState, useEffect, useRef, useCallback } from 'react'
import { X, ArrowLeft, Shield, Fingerprint } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useUserSecrets } from '@/hooks/useUserSecrets'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { Dialog, DialogContent } from '@/components/ui/dialog'
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

/**
 * MiniAppViewer - Opens mini apps in a full-screen iframe with SDK communication
 * 
 * SDK Protocol (postMessage):
 * Parent → Child: { type: "njl_identify", user }
 * Child → Parent: { type: "njl_ready" } → triggers njl_identify
 * Child → Parent: { type: "njl_charge", amount, description, charge_type, requestId }
 * Parent → Child: { type: "njl_charge_result", success, txRef, requestId }
 * Child → Parent: { type: "njl_balance", requestId }
 * Parent → Child: { type: "njl_balance_result", balance, requestId }
 * Child → Parent: { type: "njl_payout", amount, description, requestId }
 * Parent → Child: { type: "njl_payout_result", success, txRef, requestId }
 * 
 * charge_type: 'one_time' | 'subscription' | 'tip' | 'purchase'
 * Payment split: 90% developer, 10% platform commission
 * Payout: developer sends money back to user (refunds, rewards, savings returns)
 */
export const MiniAppViewer = ({ app, onClose }: MiniAppViewerProps) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showChargeDialog, setShowChargeDialog] = useState(false)
  const [showPayoutDialog, setShowPayoutDialog] = useState(false)
  const [pendingCharge, setPendingCharge] = useState<{
    amount: number
    description: string
    requestId: string
    chargeType: string
  } | null>(null)
  const [pendingPayout, setPendingPayout] = useState<{
    amount: number
    description: string
    requestId: string
  } | null>(null)

  const postToIframe = useCallback((data: Record<string, unknown>) => {
    iframeRef.current?.contentWindow?.postMessage(data, '*')
  }, [])

  const generateIdentityPayload = useCallback(() => {
    if (!user || !profile) return null
    return {
      type: 'njl_identify',
      user: {
        user_id: user.id,
        full_name: profile.full_name || '',
        email: user.email || '',
        profile_picture_url: profile.profile_picture_url || '',
      },
      app_id: app.sdk_app_id,
      timestamp: Date.now()
    }
  }, [user, profile, app.sdk_app_id])

  // Handle balance query from mini app
  const handleBalanceQuery = useCallback(async (requestId: string) => {
    if (!user) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()

      postToIframe({
        type: 'njl_balance_result',
        balance: (data as any)?.wallet_balance || 0,
        requestId
      })
    } catch {
      postToIframe({
        type: 'njl_balance_result',
        balance: 0,
        error: 'Failed to fetch balance',
        requestId
      })
    }
  }, [user, postToIframe])

  // Handle messages from mini app iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data?.type?.startsWith('njl_')) return

      console.log('[MiniApp SDK] Received:', data.type)

      if (data.type === 'njl_ready') {
        const identity = generateIdentityPayload()
        if (identity) postToIframe(identity)
      }

      if (data.type === 'njl_balance') {
        handleBalanceQuery(data.requestId)
      }

      if (data.type === 'njl_charge') {
        const { amount, description, requestId, charge_type } = data
        if (!amount || amount <= 0) {
          postToIframe({
            type: 'njl_charge_result',
            success: false,
            error: 'Invalid amount',
            requestId
          })
          return
        }
        setPendingCharge({ amount, description: description || 'Mini App Purchase', requestId, chargeType: charge_type || 'one_time' })
        setShowChargeDialog(true)
      }

      if (data.type === 'njl_payout') {
        const { amount, description, requestId } = data
        if (!amount || amount <= 0) {
          postToIframe({
            type: 'njl_payout_result',
            success: false,
            error: 'Invalid amount',
            requestId
          })
          return
        }
        setPendingPayout({ amount, description: description || 'Payout', requestId })
        setShowPayoutDialog(true)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [generateIdentityPayload, handleBalanceQuery, postToIframe])

  const handleConfirmCharge = async () => {
    if (!pendingCharge || !user) return

    try {
      const txRef = 'njl_tx_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

      // Use the server-side function for atomic payment with commission split
      const { data, error } = await supabase.rpc('process_mini_app_payment', {
        p_user_id: user.id,
        p_mini_app_id: app.id,
        p_amount: pendingCharge.amount,
        p_description: pendingCharge.description,
        p_tx_ref: txRef
      })

      const result = data as any

      if (error || !result?.success) {
        const errMsg = result?.error || error?.message || 'Payment failed'
        toast.error(errMsg)
        postToIframe({
          type: 'njl_charge_result',
          success: false,
          error: errMsg,
          requestId: pendingCharge.requestId
        })
      } else {
        postToIframe({
          type: 'njl_charge_result',
          success: true,
          txRef: result.tx_ref,
          requestId: pendingCharge.requestId
        })
        toast.success(`₦${pendingCharge.amount}NC paid to ${app.app_name}`)
      }
    } catch (err) {
      console.error('[MiniApp] Charge failed:', err)
      postToIframe({
        type: 'njl_charge_result',
        success: false,
        error: 'Payment failed',
        requestId: pendingCharge.requestId
      })
      toast.error('Payment failed')
    }

    setShowChargeDialog(false)
    setPendingCharge(null)
  }

  const handleConfirmPayout = async () => {
    if (!pendingPayout || !user) return

    try {
      const txRef = 'njl_po_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16)

      const { data, error } = await supabase.rpc('process_mini_app_payout', {
        p_mini_app_id: app.id,
        p_user_id: user.id,
        p_amount: pendingPayout.amount,
        p_description: pendingPayout.description,
        p_tx_ref: txRef
      })

      const result = data as any

      if (error || !result?.success) {
        const errMsg = result?.error || error?.message || 'Payout failed'
        toast.error(errMsg)
        postToIframe({
          type: 'njl_payout_result',
          success: false,
          error: errMsg,
          requestId: pendingPayout.requestId
        })
      } else {
        postToIframe({
          type: 'njl_payout_result',
          success: true,
          txRef: result.tx_ref,
          requestId: pendingPayout.requestId
        })
        toast.success(`₦${pendingPayout.amount}NC received from ${app.app_name}`)
      }
    } catch (err) {
      console.error('[MiniApp] Payout failed:', err)
      postToIframe({
        type: 'njl_payout_result',
        success: false,
        error: 'Payout failed',
        requestId: pendingPayout.requestId
      })
      toast.error('Payout failed')
    }

    setShowPayoutDialog(false)
    setPendingPayout(null)
  }

  // Track install/open
  useEffect(() => {
    supabase
      .from('mini_apps')
      .update({ install_count: (app as any).install_count + 1 })
      .eq('id', app.id)
      .then(() => {})
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
            const identity = generateIdentityPayload()
            if (identity) {
              setTimeout(() => postToIframe(identity), 500)
            }
          }}
        />

        {/* Charge Confirmation Dialog */}
        <Dialog open={showChargeDialog} onOpenChange={setShowChargeDialog}>
          <DialogContent className="max-w-sm">
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
                {pendingCharge?.chargeType && pendingCharge.chargeType !== 'one_time' && (
                  <span className="inline-block mt-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full capitalize">
                    {pendingCharge.chargeType.replace('_', ' ')}
                  </span>
                )}
                <p className="text-sm text-muted-foreground mt-1">{pendingCharge?.description}</p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setShowChargeDialog(false)
                  postToIframe({
                    type: 'njl_charge_result',
                    success: false,
                    error: 'User cancelled',
                    requestId: pendingCharge?.requestId
                  })
                  setPendingCharge(null)
                }}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleConfirmCharge}>
                  Pay ₦{pendingCharge?.amount}NC
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payout Confirmation Dialog */}
        <Dialog open={showPayoutDialog} onOpenChange={setShowPayoutDialog}>
          <DialogContent className="max-w-sm">
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
                  setShowPayoutDialog(false)
                  postToIframe({
                    type: 'njl_payout_result',
                    success: false,
                    error: 'User declined',
                    requestId: pendingPayout?.requestId
                  })
                  setPendingPayout(null)
                }}>
                  Decline
                </Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleConfirmPayout}>
                  Accept ₦{pendingPayout?.amount}NC
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </AnimatePresence>
  )
}
