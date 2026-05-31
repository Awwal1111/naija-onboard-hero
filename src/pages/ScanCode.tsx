import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, ClipboardPaste, Link as LinkIcon, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BrowserQRCodeReader } from '@zxing/browser'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from 'sonner'

/**
 * QR / barcode scanner.
 * Primary: native BarcodeDetector when available.
 * Fallback: @zxing/browser (covers iOS Safari, older Android WebView, Firefox).
 * Final fallback: manual paste of the link/code.
 */
const ScanCode = () => {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const zxingControlsRef = useRef<{ stop: () => void } | null>(null)
  const [scanning, setScanning] = useState(false)
  const [manual, setManual] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = null
    try { zxingControlsRef.current?.stop() } catch { /* noop */ }
    zxingControlsRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
  }

  const handleResult = (raw: string) => {
    if (!raw) return
    stopCamera()
    toast.success('Code detected')
    try {
      const u = new URL(raw)
      if (u.host === window.location.host) {
        navigate(u.pathname + u.search)
      } else {
        window.open(raw, '_blank', 'noopener,noreferrer')
      }
    } catch {
      navigator.clipboard?.writeText(raw).catch(() => {})
      toast.success('Copied scanned text to clipboard')
      setManual(raw)
    }
  }

  const startCamera = async () => {
    setError(null)
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window

    try {
      if (hasBarcodeDetector) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
        })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setScanning(true)
        // @ts-ignore - BarcodeDetector is non-standard TS-wise
        const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
        const tick = async () => {
          if (!videoRef.current || !streamRef.current) return
          try {
            const codes = await detector.detect(videoRef.current)
            if (codes && codes.length > 0) {
              handleResult(codes[0].rawValue)
              return
            }
          } catch { /* keep scanning */ }
          rafRef.current = requestAnimationFrame(tick)
        }
        tick()
        return
      }

      // Fallback: @zxing/browser
      setScanning(true)
      const reader = new BrowserQRCodeReader()
      const devices = await BrowserQRCodeReader.listVideoInputDevices()
      if (!devices.length) throw new Error('No camera found on this device')
      const rear = devices.find(d => /back|rear|environment/i.test(d.label)) || devices[devices.length - 1]
      const controls = await reader.decodeFromVideoDevice(rear.deviceId, videoRef.current!, (result) => {
        if (!result) return
        handleResult(result.getText())
      })
      zxingControlsRef.current = controls as any
    } catch (e: any) {
      setScanning(false)
      setError(e?.message || 'Could not access camera. Check permissions and try again.')
    }
  }

  const pasteFromClipboard = async () => {
    try {
      const txt = await navigator.clipboard.readText()
      setManual(txt)
    } catch {
      toast.error('Clipboard read blocked — paste manually')
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="font-semibold">Scan Code</h1>
        <div className="w-5" />
      </header>

      <div className="px-4 sm:px-6 py-6 max-w-xl mx-auto space-y-4">
        <div className="aspect-square w-full overflow-hidden rounded-xl border border-border bg-muted flex items-center justify-center relative">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${scanning ? '' : 'hidden'}`}
            muted
            playsInline
          />
          {!scanning && (
            <div className="text-center p-6">
              <Camera className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Point your camera at any QR code (pay link, gig, job, profile, or external link).
              </p>
            </div>
          )}
        </div>

        {!scanning ? (
          <Button onClick={startCamera} className="w-full" size="lg">
            <Camera className="h-4 w-4 mr-2" />
            Start Camera
          </Button>
        ) : (
          <Button onClick={stopCamera} variant="outline" className="w-full" size="lg">
            Stop
          </Button>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <LinkIcon className="h-4 w-4" /> Or paste a code / link
          </label>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="https://naijalancers.name.ng/pay/..."
            />
            <Button variant="outline" size="icon" onClick={pasteFromClipboard}>
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
          <Button
            onClick={() => handleResult(manual.trim())}
            className="w-full"
            disabled={!manual.trim()}
          >
            Open
          </Button>
        </div>
      </div>
    </div>
  )
}

export default ScanCode
