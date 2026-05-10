import { useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Shield } from 'lucide-react'
import { toast } from 'sonner'

const ESCROWHUBS_ORIGIN = 'https://celo.escrowhubs.io'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const EscrowHubsDialog = ({ open, onOpenChange }: Props) => {
  const frameRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    if (!open) return
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== ESCROWHUBS_ORIGIN) return
      const { type, ...rest } = (event.data || {}) as { type?: string; [k: string]: any }
      switch (type) {
        case 'escrowhubs:ready':
          // Bridge active
          break
        case 'chargeComplete':
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
      </DialogContent>
    </Dialog>
  )
}
