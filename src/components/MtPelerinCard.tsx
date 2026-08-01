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
import { buildMtPelerinUrl } from '@/lib/mtpelerin'

interface MtPelerinCardProps {
  /** 'buy' for deposits, 'sell' for withdrawals */
  mode: 'buy' | 'sell'
  /** Defaults to USDT on Celo */
  defaultCrypto?: 'USDT' | 'CUSD' | 'CELO'
}

/**
 * Mt Pelerin on/off-ramp widget embedded as an iframe.
 * Supports 60+ countries via card, bank transfer, and SEPA.
 */
export const MtPelerinCard = ({ mode, defaultCrypto = 'USDT' }: MtPelerinCardProps) => {
  const { user } = useAuth()
  const [walletAddress, setWalletAddress] = useState('')

  useEffect(() => {
    if (!user) return
    supabase
      .from('profiles')
      .select('celo_wallet_address')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.celo_wallet_address) setWalletAddress(data.celo_wallet_address)
      })
  }, [user])

  const externalUrl = buildMtPelerinUrl({
    tab: mode,
    tabs: ['buy', 'sell', 'swap'],
    addr: mode === 'buy' ? walletAddress || undefined : undefined,
    ...(mode === 'buy'
      ? { bdc: defaultCrypto, dnet: 'celo_mainnet', bsc: 'EUR', pm: 'card' }
      : { ssc: defaultCrypto, snet: 'celo_mainnet', sdc: 'EUR' }),
    crys: 'USDT,CUSD,CELO',
    directLink: true,
  })


  const copyAddress = () => {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    toast.success('Wallet address copied')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-5 w-5 text-primary" />
          Mt Pelerin {mode === 'buy' ? 'Deposit' : 'Withdrawal'}
        </CardTitle>
        <CardDescription>
          {mode === 'buy'
            ? 'Buy crypto with card, bank transfer or SEPA — funds arrive in your NaijaLancers wallet, then auto-credit to NC.'
            : 'Sell USDT/cUSD from your wallet to your bank account. Supports EUR, CHF, GBP, USD and more.'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {mode === 'buy' && walletAddress && (
          <div className="space-y-1">
            <Label className="text-xs">Your NaijaLancers wallet (Celo)</Label>
            <div className="flex gap-2">
              <Input value={walletAddress} readOnly className="font-mono text-xs" />
              <BrandButton size="icon" variant="outline" onClick={copyAddress}>
                <Copy className="h-4 w-4" />
              </BrandButton>
            </div>
          </div>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {mode === 'buy'
              ? 'Send USDT/cUSD on Celo to the address above. It will be auto-converted to NC and credited within minutes.'
              : 'Withdraw USDT to the bank account you set up in the widget. Mt Pelerin handles KYC and fiat settlement.'}
          </AlertDescription>
        </Alert>

        <BrandButton
          className="w-full"
          onClick={() => window.open(externalUrl, '_blank', 'noopener,noreferrer')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Continue securely on Mt Pelerin
        </BrandButton>
      </CardContent>
    </Card>
  )
}
