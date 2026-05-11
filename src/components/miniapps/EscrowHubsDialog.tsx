import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const ESCROWHUBS_ORIGIN = 'https://celo.escrowhubs.io'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EscrowHubsDialog = ({ open, onOpenChange }: Props) => {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [lastEscrowAddress, setLastEscrowAddress] = useState<string | null>(null)

  const postToFrame = (type: string, payload: Record<string, unknown>) => {
    frameRef.current?.contentWindow?.postMessage({ type, payload }, ESCROWHUBS_ORIGIN)
  }

  useEffect(() => {
    if (!open) return
    setIsReady(false)
    setLastEscrowAddress(null)
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== ESCROWHUBS_ORIGIN) return
      const { type, ...rest } = (event.data || {}) as { type?: string; [k: string]: any }
      switch (type) {
        case 'escrowhubs:ready':
          setIsReady(true)
          toast.success('EscrowHubs connected')
          break
        case 'chargeComplete':
          if (rest.escrowAddress) setLastEscrowAddress(rest.escrowAddress)
          toast.success('Escrow created', { description: `Address: ${rest.escrowAddress?.slice(0, 10)}...` })
          break
        case 'payoutComplete':
          toast.success('Payout released', { description: rest.txHash?.slice(0, 12) + '...' })
          break
        case 'escrowStatus': {
          const states = ['Awaiting Payment', 'Awaiting Delivery', 'Complete', 'Disputed', 'Refunded']
          toast.info(`Escrow status: ${states[rest.state] ?? rest.state}`)
          break
        }
        case 'error':
          toast.error(rest.message || 'EscrowHubs error')
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-4 py-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-primary" />
            EscrowHubs (On-chain)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Non-custodial cUSD escrow on Celo. Your escrows are credited to NaijaLancers automatically.
          </DialogDescription>
        </DialogHeader>
        <iframe
          ref={frameRef}
          src={ESCROWHUBS_ORIGIN}
          allow="web3; ethereum; clipboard-read; clipboard-write"
          className="flex-1 w-full border-0"
          title="EscrowHubs"
        />
        <div className="border-t border-border px-4 py-3 flex flex-wrap gap-2 items-center justify-between bg-background">
          <div className="text-xs text-muted-foreground">
            {isReady ? 'Bridge ready' : 'Waiting for EscrowHubs bridge…'}
            {lastEscrowAddress ? ` • Last escrow: ${lastEscrowAddress.slice(0, 10)}...` : ''}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!isReady || !lastEscrowAddress}
              onClick={() => lastEscrowAddress && postToFrame('getEscrowStatus', {
                escrowAddress: lastEscrowAddress,
                requestId: `status_${Date.now()}`,
              })}
            >
              Check status
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!isReady || !lastEscrowAddress}
              onClick={() => lastEscrowAddress && postToFrame('payoutUser', {
                escrowAddress: lastEscrowAddress,
                requestId: `payout_${Date.now()}`,
              })}
            >
              Release payout
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
