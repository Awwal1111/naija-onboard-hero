import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wallet, Loader2, ExternalLink, CheckCircle2, AlertCircle, Copy } from 'lucide-react'
import { useExternalWallet, type WalletKind } from '@/hooks/useExternalWallet'
import { CUSD_ADDRESS, USDT_ADDRESS, USDC_ADDRESS } from '@/lib/minipay'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface WalletDepositCardProps {
  walletKind: WalletKind
  recipientAddress: string
  onSuccess?: () => void
}

const TOKENS = {
  cUSD: { address: CUSD_ADDRESS, decimals: 18, label: 'cUSD' },
  USDT: { address: USDT_ADDRESS, decimals: 6, label: 'USDT' },
  USDC: { address: USDC_ADDRESS, decimals: 6, label: 'USDC' },
} as const
type TokenKey = keyof typeof TOKENS

export const WalletDepositCard = ({ walletKind, recipientAddress, onSuccess }: WalletDepositCardProps) => {
  const { account, busy, connect, sendErc20, waitForConfirmation } = useExternalWallet()
  const [token, setToken] = useState<TokenKey>('cUSD')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState<string>('')
  const [stage, setStage] = useState<'idle' | 'sending' | 'confirming' | 'crediting' | 'done'>('idle')

  const walletName = walletKind === 'metamask' ? 'MetaMask' : walletKind === 'valora' ? 'Valora' : 'Wallet'

  const handleConnect = async () => {
    try {
      await connect(walletKind)
      toast.success(`${walletName} connected`)
    } catch (e: any) {
      toast.error(e.message || 'Connection failed')
    }
  }

  const handleDeposit = async () => {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) return toast.error('Enter a valid amount')
    if (!recipientAddress) return toast.error('Your NaijaLancers wallet is not ready')
    if (!account) {
      try {
        await connect(walletKind)
      } catch (e: any) {
        return toast.error(e.message || 'Connect your wallet first')
      }
    }

    const t = TOKENS[token]
    try {
      setStage('sending')
      const hash = await sendErc20({
        kind: walletKind,
        tokenAddress: t.address,
        recipient: recipientAddress,
        amount,
        decimals: t.decimals,
      })
      setTxHash(hash)
      toast.success('Transaction submitted — waiting for confirmation…')

      setStage('confirming')
      const ok = await waitForConfirmation(hash)
      if (!ok) {
        toast.error('Transaction not confirmed in time. It may still go through — refresh later.')
        setStage('idle')
        return
      }

      setStage('crediting')
      // Trigger backend deposit detection so NC is credited immediately
      try {
        await supabase.functions.invoke('check-celo-deposits')
      } catch (e) {
        console.warn('check-celo-deposits invoke failed (cron will catch it)', e)
      }

      setStage('done')
      toast.success(`${amount} ${t.label} received! NC will reflect shortly.`)
      onSuccess?.()
    } catch (e: any) {
      console.error('[WALLET-DEPOSIT]', e)
      toast.error(e.message || 'Deposit failed')
      setStage('idle')
    }
  }

  const explorer = txHash ? `https://celoscan.io/tx/${txHash}` : ''

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          {walletName} Deposit
        </CardTitle>
        <CardDescription>
          Connect your {walletName} and send cUSD / USDT / USDC on Celo. NC is credited automatically after on-chain confirmation.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Recipient (your NaijaLancers wallet)</Label>
          <div className="flex gap-2">
            <Input value={recipientAddress} readOnly className="font-mono text-xs" />
            <BrandButton
              variant="outline"
              size="icon"
              onClick={() => {
                navigator.clipboard.writeText(recipientAddress)
                toast.success('Address copied')
              }}
            >
              <Copy className="h-4 w-4" />
            </BrandButton>
          </div>
        </div>

        {!account ? (
          <BrandButton onClick={handleConnect} disabled={busy} className="w-full">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
            Connect {walletName}
          </BrandButton>
        ) : (
          <Alert>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-xs font-mono break-all">
              Connected: {account}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Token</Label>
            <Select value={token} onValueChange={(v) => setToken(v as TokenKey)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cUSD">cUSD</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          ≈ {amount && !isNaN(parseFloat(amount)) ? `NC ${Math.floor(parseFloat(amount) * 1600).toLocaleString()}` : 'NC 0'} • 1 {TOKENS[token].label} ≈ NC 1,600
        </p>

        <BrandButton
          onClick={handleDeposit}
          disabled={busy || !amount || stage === 'sending' || stage === 'confirming' || stage === 'crediting'}
          className="w-full"
        >
          {stage === 'sending' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirm in wallet…</>}
          {stage === 'confirming' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for on-chain confirmation…</>}
          {stage === 'crediting' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Crediting NC…</>}
          {stage === 'done' && <><CheckCircle2 className="mr-2 h-4 w-4" /> Deposit complete</>}
          {stage === 'idle' && <>Send {amount || '0'} {TOKENS[token].label}</>}
        </BrandButton>

        {txHash && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <a href={explorer} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline break-all">
                View transaction on CeloScan <ExternalLink className="h-3 w-3" />
              </a>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
