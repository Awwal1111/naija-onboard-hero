import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Copy, Camera, ScanLine, Wallet, ShieldAlert, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface WalletQRSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  receiveAddress?: string | null
  /** When user scans an address, called with the parsed Celo address (0x…) */
  onScanned?: (address: string) => void
}

const CELO_ADDRESS_RE = /(0x[a-fA-F0-9]{40})/

/**
 * Unified QR sheet:
 *  - "Receive" tab: shows current user's Celo wallet QR + address.
 *    External wallets (MetaMask / Valora / Trust / any Celo-aware wallet) can scan and send
 *    USDT / cUSD / USDC on Celo — funds auto-credit via the existing `check-celo-deposits` flow.
 *  - "Scan" tab: opens device camera, parses an EVM/Celo address from a QR, calls onScanned().
 */
export const WalletQRSheet = ({ open, onOpenChange, receiveAddress, onScanned }: WalletQRSheetProps) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [tab, setTab] = useState<'receive' | 'scan'>('receive')
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const readerRef = useRef<BrowserQRCodeReader | null>(null)
  const controlsRef = useRef<{ stop: () => void } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [scanError, setScanError] = useState<string | null>(null)

  // Generate QR for receive address
  useEffect(() => {
    if (!receiveAddress) { setQrDataUrl(''); return }
    QRCode.toDataURL(receiveAddress, { width: 280, margin: 1, errorCorrectionLevel: 'M' })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(''))
  }, [receiveAddress])

  const stopScan = () => {
    try { controlsRef.current?.stop() } catch { /* noop */ }
    controlsRef.current = null
    setScanning(false)
  }

  // Start / stop camera when tab changes or sheet closes
  useEffect(() => {
    if (!open || tab !== 'scan') { stopScan(); return }
    setScanError(null)
    setScanning(true)
    const reader = new BrowserQRCodeReader()
    readerRef.current = reader

    let cancelled = false
    ;(async () => {
      try {
        const devices = await BrowserQRCodeReader.listVideoInputDevices()
        if (!devices.length) throw new Error('No camera found')
        // Prefer rear camera if available
        const rear = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[0]
        const controls = await reader.decodeFromVideoDevice(rear.deviceId, videoRef.current!, (result) => {
          if (cancelled || !result) return
          const text = result.getText()
          const match = text.match(CELO_ADDRESS_RE)
          if (!match) {
            setScanError('No wallet address found in QR. Try again.')
            return
          }
          const addr = match[1]
          stopScan()
          onScanned?.(addr)
          toast.success(`Address scanned: ${addr.slice(0, 6)}…${addr.slice(-4)}`)
          onOpenChange(false)
        })
        controlsRef.current = controls as any
      } catch (e: any) {
        if (cancelled) return
        setScanError(e?.message || 'Could not access camera')
        setScanning(false)
      }
    })()

    return () => { cancelled = true; stopScan() }
  }, [open, tab, onScanned, onOpenChange])

  const copy = () => {
    if (!receiveAddress) return
    navigator.clipboard.writeText(receiveAddress)
    toast.success('Address copied')
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) stopScan(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" /> Wallet QR
          </DialogTitle>
          <DialogDescription>
            Receive crypto into your NaijaLancers wallet or scan another wallet to send out.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as 'receive' | 'scan')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="receive"><ScanLine className="h-4 w-4 mr-2" /> Receive</TabsTrigger>
            <TabsTrigger value="scan"><Camera className="h-4 w-4 mr-2" /> Scan</TabsTrigger>
          </TabsList>

          <TabsContent value="receive" className="space-y-4 pt-2">
            {!receiveAddress ? (
              <Alert>
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Your NaijaLancers Celo wallet is not ready yet. Open the wallet page to provision it.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="flex flex-col items-center gap-3">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Wallet QR" className="w-64 h-64 rounded-lg border border-border bg-white p-2" />
                ) : (
                  <div className="w-64 h-64 flex items-center justify-center rounded-lg border border-border">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="w-full space-y-1">
                  <p className="text-xs text-muted-foreground text-center">Send USDT, cUSD or USDC on Celo</p>
                  <div className="flex gap-2 items-center bg-muted rounded-md px-2 py-1.5">
                    <span className="font-mono text-[11px] break-all flex-1">{receiveAddress}</span>
                    <Button size="icon" variant="ghost" onClick={copy} className="h-7 w-7">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground text-center">
                    NC credits automatically once the transfer is confirmed on-chain.
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="scan" className="space-y-3 pt-2">
            <div className="relative rounded-lg overflow-hidden bg-black aspect-square">
              <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
              {scanning && (
                <div className="absolute inset-0 pointer-events-none border-4 border-primary/40 rounded-lg" />
              )}
            </div>
            {scanError && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertDescription className="text-xs">{scanError}</AlertDescription>
              </Alert>
            )}
            <p className="text-xs text-muted-foreground text-center">
              Point your camera at any Celo / EVM wallet QR code.
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
