import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { BrandButton } from '@/components/ui/brand-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Globe, Info, Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { buildMtPelerinUrl, isMtPelerinAllowedHost } from '@/lib/mtpelerin'

interface MtPelerinCardProps {
  /** 'buy' for deposits, 'sell' for withdrawals */
  mode: 'buy' | 'sell'
  /** Defaults to USDT on Celo. CUSD is retained as a legacy prop value and maps to USDT. */
  defaultCrypto?: 'USDT' | 'USDC' | 'CUSD' | 'CELO'
}

export const MtPelerinCard = ({ mode, defaultCrypto = 'USDT' }: MtPelerinCardProps) => {
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState('')
  const [addressLoading, setAddressLoading] = useState(false)
  const allowedHost = isMtPelerinAllowedHost()
  const crypto = defaultCrypto === 'CUSD' ? 'USDT' : defaultCrypto

  useEffect(() => {
    let active = true
    if (!user) {
      setWalletAddress('')
      return
    }
    setAddressLoading(true)
    supabase
      .from('profiles')
      .select('celo_wallet_address')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) console.warn('[MT-PELERIN] Could not load Celo wallet address:', error.message)
        setWalletAddress(data?.celo_wallet_address || '')
      })
      .finally(() => {
        if (active) setAddressLoading(false)
      })
    return () => { active = false }
  }, [user])

  // Mt Pelerin requires a signed one-time code/hash along with addr to pre-validate
  // a user's address. Do not pass addr alone: that would fail their validation.
  // Users can enter/connect their own address in the official widget instead.
  const widgetUrl = buildMtPelerinUrl({
    tab: mode,
    tabs: [mode],
    crys: 'USDT,USDC,CELO',
    ...(mode === 'buy'
      ? { bdc: crypto, dnet: 'celo_mainnet' }
      : { ssc: crypto, snet: 'celo_mainnet' }),
  })

  const copyAddress = async () => {
    if (!walletAddress) return
    try {
      await navigator.clipboard.writeText(walletAddress)
      toast.success('Celo wallet address copied')
    } catch {
      toast.error('Could not copy automatically. Please select and copy the address.')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-5 w-5 text-primary" />
          Mt Pelerin {mode === 'buy' ? 'Buy crypto' : 'Cash out'}
        </CardTitle>
        <CardDescription>
          {mode === 'buy'
            ? 'Buy USDT, USDC or CELO on Celo and send it to your NaijaLancers wallet.'
            : 'Sell supported Celo assets and receive fiat through Mt Pelerin’s available payout methods.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {!allowedHost ? (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              This integration key is registered for www.naijalancers.name.ng. Open NaijaLancers on that exact domain to use the partner widget.
              <div className="mt-2">
                <a className="underline font-medium" href="https://www.naijalancers.name.ng">Open the registered NaijaLancers domain</a>
              </div>
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {mode === 'buy' && (
              <div className="space-y-1">
                <Label className="text-xs">Your NaijaLancers Celo wallet</Label>
                {addressLoading ? (
                  <p className="text-xs text-muted-foreground">Loading wallet address…</p>
                ) : walletAddress ? (
                  <div className="flex gap-2">
                    <Input value={walletAddress} readOnly className="font-mono text-xs" />
                    <BrandButton size="icon" variant="outline" onClick={copyAddress} aria-label="Copy Celo wallet address">
                      <Copy className="h-4 w-4" />
                    </BrandButton>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Your Celo wallet address is not available yet. Please finish wallet setup before buying.</p>
                )}
                <p className="text-xs text-muted-foreground">
                  The widget may ask you to confirm or enter the receiving address. Check that it matches the address above before paying.
                </p>
              </div>
            )}

            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-xs">
                {mode === 'buy'
                  ? 'Mt Pelerin sends crypto directly to the wallet address you confirm in its widget. NaijaLancers credits deposits only after the matching Celo transfer is detected.'
                  : 'You will connect or enter the wallet holding your crypto inside Mt Pelerin. Review the destination bank details and quote before confirming.'}
              </AlertDescription>
            </Alert>

            <iframe
              title={`Mt Pelerin ${mode} crypto widget`}
              src={widgetUrl}
              loading="eager"
              allow="payment; camera; microphone; usb"
              className="w-full rounded-lg border bg-background"
              style={{ height: '720px' }}
            />
            <p className="text-xs text-muted-foreground">
              If the embedded widget stays blank, open the secure Mt Pelerin page directly below. Your deposit is credited only after the matching Celo transfer is verified.
            </p>
            <BrandButton
              className="w-full"
              variant="outline"
              onClick={() => window.open(buildMtPelerinUrl({
                tab: mode,
                tabs: [mode],
                crys: 'USDT,USDC,CELO',
                ...(mode === 'buy'
                  ? { bdc: crypto, dnet: 'celo_mainnet' }
                  : { ssc: crypto, snet: 'celo_mainnet' }),
                directLink: true,
              }), '_blank', 'noopener,noreferrer')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Mt Pelerin in a new tab
            </BrandButton>
          </>
        )}
      </CardContent>
    </Card>
  )
}
