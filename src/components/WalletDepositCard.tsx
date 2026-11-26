import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Wallet, Loader2, ExternalLink, CheckCircle2, AlertCircle, Copy } from 'lucide-react'
import { useExternalWallet, type WalletKind } from '@/hooks/useExternalWallet'
import { CUSD_ADDRESS, USDT_ADDRESS } from '@/lib/minipay'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { parseUnits } from 'viem'

interface WalletDepositCardProps {
  walletKind: WalletKind
  recipientAddress: string
  onSuccess?: () => void
}

const TOKENS = {
  cUSD: { address: CUSD_ADDRESS, decimals: 18, label: 'cUSD' },
  USDT: { address: USDT_ADDRESS, decimals: 6, label: 'USDT' },
} as const
type TokenKey = keyof typeof TOKENS

const isMobileBrowser = () =>
  typeof navigator !== 'undefined' && /android|iphone|ipad|ipod/i.test(navigator.userAgent)

export const WalletDepositCard = ({ walletKind, recipientAddress, onSuccess }: WalletDepositCardProps) => {
  const { account, busy, connect, sendErc20, waitForConfirmation, getProvider } = useExternalWallet()
  const [token, setToken] = useState<TokenKey>('cUSD')
  const [amount, setAmount] = useState('')
  const [txHash, setTxHash] = useState<string>('')
  const [stage, setStage] = useState<'idle' | 'sending' | 'confirming' | 'crediting' | 'done'>('idle')

  const walletName = walletKind === 'metamask' ? 'MetaMask' : walletKind === 'valora' ? 'Valora' : 'Wallet'

  const copyRecipientAddress = async () => {
    if (!recipientAddress) return
    try {
      await navigator.clipboard.writeText(recipientAddress)
      toast.success('NaijaLancers wallet address copied')
    } catch {
      toast.error('Please select and copy your wallet address manually')
    }
  }

  const buildManualSendLink = (): string => {
    if (!recipientAddress) return ''
    const t = TOKENS[token]
    const amt = Number(amount)
    let smallestUnits = ''
    try {
      if (Number.isFinite(amt) && amt > 0) smallestUnits = parseUnits(amount, t.decimals).toString()
    } catch { /* amount validation is handled before sending */ }

    if (walletKind === 'metamask') {
      const base = `https://link.metamask.io/send/${t.address}@42220/transfer?address=${recipientAddress}`
      return smallestUnits ? `${base}&uint256=${smallestUnits}` : base
    }

    // Valora's documented payment deep link supports cUSD, cEUR and CELO only.
    if (token === 'cUSD') {
      const params = new URLSearchParams({
        address: recipientAddress,
        token: 'cUSD',
        currencyCode: 'USD',
        displayName: 'NaijaLancers',
        comment: 'NaijaLancers deposit',
        ...(Number.isFinite(amt) && amt > 0 ? { amount: String(amt) } : {}),
      })
      return `celo://wallet/pay?${params.toString()}`
    }
    return ''
  }

  const handleManualSend = async () => {
    if (!recipientAddress) {
      toast.error('Your NaijaLancers wallet is not ready yet')
      return
    }

    const url = buildManualSendLink()
    if (walletKind === 'valora' && token !== 'cUSD') {
      await copyRecipientAddress()
      toast.info(`In Valora, choose Send, select ${TOKENS[token].label} on Celo, and paste the copied address. Confirm the Celo network before sending.`)
      return
    }
    if (!url) {
      toast.error('Could not prepare the wallet payment link')
      return
    }

    if (walletKind === 'valora') {
      // Copy first so users still have the destination if their browser blocks the app link.
      await copyRecipientAddress()
      window.location.href = url
      toast.info('Opening Valora. If it does not open, your NaijaLancers address has been copied for a manual cUSD transfer.')
      return
    }

    // Universal link routes mobile users into MetaMask's token-send screen.
    window.location.href = url
    toast.info('Opening MetaMask. Review the Celo network, token, recipient and amount before confirming.')
  }

  const handleConnect = async () => {
    if (walletKind === 'valora') {
      await handleManualSend()
      return
    }

    // Open the dapp in MetaMask's own browser on mobile. A normal Chrome tab
    // cannot reliably receive the mobile app's injected provider.
    if (walletKind === 'metamask' && isMobileBrowser() && !getProvider('metamask')) {
      const dappUrl = `${window.location.host}${window.location.pathname}${window.location.search}`
      window.location.href = `https://link.metamask.io/dapp/${dappUrl}`
      toast.info('Opening NaijaLancers in MetaMask. Tap Connect again after the page loads inside MetaMask.')
      return
    }

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
      if (walletKind === 'metamask' && isMobileBrowser() && !getProvider('metamask')) {
        await handleConnect()
        return
      }
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
      try {
        const { error: checkError } = await supabase.functions.invoke('check-celo-deposits', {
          body: { wallet_address: recipientAddress },
        })
        if (checkError) throw checkError
      } catch (e) {
        // The chain transfer is confirmed, but server-side verification did
        // not complete. Do not claim that NC has been credited.
        console.warn('check-celo-deposits invoke failed; NC credit remains pending verification:', e)
      }

      setStage('done')
      toast.success(`${amount} ${t.label} confirmed on Celo. NC will appear after deposit verification.`)
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
          Send cUSD or USDT on Celo to your NaijaLancers wallet. Only approve the transaction after checking the token, network and recipient in your wallet.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Recipient (your NaijaLancers wallet)</Label>
          <div className="flex gap-2">
            <Input value={recipientAddress} readOnly className="font-mono text-xs" />
            <BrandButton variant="outline" size="icon" onClick={copyRecipientAddress} disabled={!recipientAddress}>
              <Copy className="h-4 w-4" />
            </BrandButton>
          </div>
        </div>

        {!account ? (
          <div className="space-y-2">
            <BrandButton onClick={handleConnect} disabled={busy || (walletKind === 'valora' && !amount)} className="w-full">
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wallet className="mr-2 h-4 w-4" />}
              {walletKind === 'valora'
                ? token === 'cUSD' ? 'Open Valora cUSD payment' : `Copy address for Valora ${token}`
                : `Connect ${walletName}`}
            </BrandButton>
            <BrandButton onClick={handleManualSend} variant="outline" className="w-full" disabled={!recipientAddress}>
              <ExternalLink className="mr-2 h-4 w-4" />
              {walletKind === 'valora' ? 'Open / prepare Valora transfer' : 'Open MetaMask transfer'}
            </BrandButton>
            <p className="text-xs text-muted-foreground text-center">
              {walletKind === 'valora'
                ? 'Valora quick-pay supports cUSD. For USDT, copy the address and send manually on Celo.'
                : 'On mobile, connect from MetaMask’s in-app browser or use the pre-filled transfer link.'}
            </p>
          </div>
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
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} min="0" step="0.01" />
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          ≈ {amount && !isNaN(parseFloat(amount)) ? `NC ${Math.floor(parseFloat(amount) * 1600).toLocaleString()}` : 'NC 0'} • 1 {TOKENS[token].label} ≈ NC 1,600
        </p>

        <BrandButton
          onClick={handleDeposit}
          disabled={busy || !amount || stage === 'sending' || stage === 'confirming' || stage === 'crediting' || walletKind === 'valora'}
          className="w-full"
        >
          {stage === 'sending' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Confirm in wallet…</>}
          {stage === 'confirming' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Waiting for on-chain confirmation…</>}
          {stage === 'crediting' && <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking deposit…</>}
          {stage === 'done' && <><CheckCircle2 className="mr-2 h-4 w-4" /> Deposit submitted</>}
          {stage === 'idle' && <>{walletKind === 'valora' ? 'Use Valora transfer above' : `Send ${amount || '0'} ${TOKENS[token].label}`}</>}
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
