import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Globe, Info, Loader2, Send } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface Props { onPending?: () => void }

const COUNTRIES = [
  { code: 'KES', label: '🇰🇪 Kenya (KES)', networks: ['Safaricom', 'Airtel'] },
  { code: 'GHS', label: '🇬🇭 Ghana (GHS)', networks: ['MTN', 'Vodafone', 'AirtelTigo'] },
  { code: 'UGX', label: '🇺🇬 Uganda (UGX)', networks: ['MTN', 'Airtel'] },
  { code: 'MWK', label: '🇲🇼 Malawi (MWK)', networks: ['Airtel', 'TNM'] },
  { code: 'CDF', label: '🇨🇩 DR Congo (CDF)', networks: ['M-Pesa', 'Orange', 'Airtel'] },
]

export const PretiumDepositCard = ({ onPending }: Props) => {
  const [currency, setCurrency] = useState('KES')
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [network, setNetwork] = useState('Safaricom')
  const [isLoading, setIsLoading] = useState(false)

  const country = COUNTRIES.find(c => c.code === currency)!

  const submit = async () => {
    const a = parseFloat(amount)
    if (!phone || a <= 0) return toast.error('Enter phone and amount')
    setIsLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('pretium-ramp', {
        body: { action: 'onramp', currency, shortcode: phone, amount: a, mobile_network: network, asset: 'USDT' },
      })
      if (error || !(data as any)?.success) throw new Error((data as any)?.error || error?.message || 'Failed')
      toast.success((data as any).message || 'Approve the prompt on your phone to complete the deposit')
      setAmount(''); setPhone('')
      onPending?.()
    } catch (e: any) {
      toast.error(e?.message || 'Onramp failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Pretium Mobile Money Deposit
        </CardTitle>
        <CardDescription>Pay from M-Pesa / MTN / Airtel — instant credit once confirmed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Your local fiat is converted to USDT and credited as NC to your wallet automatically once Pretium releases the asset.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label>Country / Currency</Label>
          <Select value={currency} onValueChange={(v) => { setCurrency(v); setNetwork(COUNTRIES.find(c => c.code === v)!.networks[0]) }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Mobile Network</Label>
          <Select value={network} onValueChange={setNetwork}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {country.networks.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Phone Number</Label>
          <BrandInput value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g. 0712345678" />
        </div>

        <div className="space-y-2">
          <Label>Amount ({currency})</Label>
          <BrandInput type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder={`Amount in ${currency}`} />
        </div>

        <BrandButton className="w-full" onClick={submit} disabled={isLoading || !phone || !amount}>
          {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending prompt…</> : <><Send className="mr-2 h-4 w-4" /> Pay with Mobile Money</>}
        </BrandButton>
      </CardContent>
    </Card>
  )
}
