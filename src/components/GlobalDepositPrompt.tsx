import { lazy, Suspense, useEffect, useState } from 'react'
import { Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DEPOSIT_PROMPT_EVENT, DepositPromptDetail } from '@/lib/depositPrompt'
import { useCurrency } from '@/hooks/useCurrency'

const DepositDialog = lazy(() =>
  import('@/components/DepositDialog').then((m) => ({ default: m.DepositDialog }))
)

// Shown when the user tries something they can't afford: explains the gap and opens the
// deposit screen in one tap, instead of a toast that leaves them to find the wallet.
export const GlobalDepositPrompt = () => {
  const [promptOpen, setPromptOpen] = useState(false)
  const [depositOpen, setDepositOpen] = useState(false)
  const [detail, setDetail] = useState<DepositPromptDetail>({})
  const { formatPreferred } = useCurrency()
  const nc = (n: number) => formatPreferred(Math.round(n), true)

  useEffect(() => {
    const handler = (e: Event) => {
      setDetail((e as CustomEvent<DepositPromptDetail>).detail || {})
      setPromptOpen(true)
    }
    window.addEventListener(DEPOSIT_PROMPT_EVENT, handler)
    return () => window.removeEventListener(DEPOSIT_PROMPT_EVENT, handler)
  }, [])

  const { needed, available, message } = detail
  const shortfall = needed != null && available != null ? Math.max(needed - available, 0) : null

  return (
    <>
      <Dialog open={promptOpen} onOpenChange={setPromptOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-center">Not enough balance</DialogTitle>
            <DialogDescription className="text-center">
              {message ||
                (needed != null && available != null
                  ? `You need ${nc(needed)} but have ${nc(available)}${shortfall ? ` — add at least ${nc(shortfall)} to continue.` : '.'}`
                  : 'Add money to your wallet to continue.')}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button onClick={() => { setPromptOpen(false); setDepositOpen(true) }}>Add money</Button>
            <Button variant="ghost" onClick={() => setPromptOpen(false)}>Not now</Button>
          </div>
        </DialogContent>
      </Dialog>

      {depositOpen && (
        <Suspense fallback={null}>
          <DepositDialog open={depositOpen} onOpenChange={setDepositOpen} />
        </Suspense>
      )}
    </>
  )
}

export default GlobalDepositPrompt
