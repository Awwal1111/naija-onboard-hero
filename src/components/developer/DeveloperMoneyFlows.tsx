import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownToLine, ArrowUpFromLine, Loader2, Wallet, QrCode, Copy, ExternalLink, Banknote, Coins } from 'lucide-react';
import { toast } from 'sonner';

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/developer-api`;

interface Props { apiKey: string | null }

async function callApi(apiKey: string, path: string, method: string, body?: any) {
  const res = await fetch(`${FN_URL}/${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'Request failed');
  return data;
}

export default function DeveloperMoneyFlows({ apiKey }: Props) {
  // shared
  const [extId, setExtId] = useState('');

  // wallet
  const [walletAddr, setWalletAddr] = useState('');
  const [balances, setBalances] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // ramp (fiat → NC)
  const [buyAmount, setBuyAmount] = useState('5000');
  const [buyUrl, setBuyUrl] = useState('');

  // off-ramp (NC → bank)
  const [sellAmount, setSellAmount] = useState('5000');
  const [bankCode, setBankCode] = useState('058');
  const [acctNo, setAcctNo] = useState('');
  const [acctName, setAcctName] = useState('');
  const [sellUrl, setSellUrl] = useState('');

  // payout (NC credit/debit by dev)
  const [payoutAmount, setPayoutAmount] = useState('100');
  const [payoutNote, setPayoutNote] = useState('');

  async function ensureWallet() {
    if (!apiKey || !extId) return toast.error('API key + user id required');
    setBusy('wallet');
    try {
      const r = await callApi(apiKey, 'wallet/create', 'POST', { external_user_id: extId });
      setWalletAddr(r.address);
      const b = await callApi(apiKey, `wallet/balance?external_user_id=${encodeURIComponent(extId)}`, 'GET');
      setBalances(b.balances || null);
      toast.success('Wallet ready');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function createBuySession() {
    if (!apiKey || !extId) return toast.error('API key + user id required');
    setBusy('buy');
    try {
      const r = await callApi(apiKey, 'ramp/session/buy', 'POST', {
        external_user_id: extId,
        amount_ngn: Number(buyAmount),
      });
      setBuyUrl(r.checkout_url || r.session_url || r.url || '');
      toast.success('Deposit session created — open the URL on user device');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function createSellSession() {
    if (!apiKey || !extId) return toast.error('API key + user id required');
    setBusy('sell');
    try {
      const r = await callApi(apiKey, 'ramp/session/sell', 'POST', {
        external_user_id: extId,
        amount_ngn: Number(sellAmount),
        bank_code: bankCode,
        account_number: acctNo,
        account_name: acctName,
      });
      setSellUrl(r.checkout_url || r.session_url || r.url || '');
      toast.success('Withdrawal session created');
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  async function doPayout(direction: 'credit' | 'payout') {
    if (!apiKey || !extId) return toast.error('API key + user id required');
    setBusy(direction);
    try {
      const r = await callApi(apiKey, `payments/${direction}`, 'POST', {
        external_user_id: extId,
        amount: Number(payoutAmount),
        note: payoutNote || undefined,
      });
      toast.success(`${direction === 'credit' ? 'Credited' : 'Paid out'} ${payoutAmount} NC — new balance ${r.new_balance ?? '?'}`);
    } catch (e: any) { toast.error(e.message); } finally { setBusy(null); }
  }

  function copy(t: string) { navigator.clipboard.writeText(t); toast.success('Copied'); }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
        <h3 className="font-semibold mb-1 flex items-center gap-2"><Wallet className="h-4 w-4" /> Money flows for your end-users</h3>
        <p className="text-xs text-muted-foreground">
          Pick any user in your app, then deposit or withdraw on their behalf — no 0x addresses, no bank dashboards.
          Everything settles into their managed NaijaLancers wallet.
        </p>
        <div className="mt-3">
          <Label className="text-xs">Your user ID (external_user_id)</Label>
          <div className="flex gap-2 mt-1">
            <Input value={extId} onChange={(e) => setExtId(e.target.value)} placeholder="e.g. user-123" />
            <Button onClick={ensureWallet} disabled={busy === 'wallet' || !apiKey}>
              {busy === 'wallet' ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load'}
            </Button>
          </div>
        </div>
        {walletAddr && (
          <div className="mt-3 p-3 rounded bg-muted/50 space-y-1">
            <button onClick={() => copy(walletAddr)} className="font-mono text-xs hover:underline flex items-center gap-1">
              {walletAddr} <Copy className="h-3 w-3" />
            </button>
            {balances && (
              <div className="flex gap-3 text-xs flex-wrap">
                {Object.entries(balances).map(([k, v]) => (
                  <Badge key={k} variant="outline">{k}: {v}</Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      <Tabs defaultValue="deposit">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="deposit"><ArrowDownToLine className="h-3.5 w-3.5 mr-1" /> Deposit</TabsTrigger>
          <TabsTrigger value="withdraw"><ArrowUpFromLine className="h-3.5 w-3.5 mr-1" /> Withdraw</TabsTrigger>
          <TabsTrigger value="crypto"><Coins className="h-3.5 w-3.5 mr-1" /> Crypto</TabsTrigger>
          <TabsTrigger value="payout"><Banknote className="h-3.5 w-3.5 mr-1" /> Payout</TabsTrigger>
        </TabsList>

        {/* DEPOSIT — Naira → NC via Quidax ramp */}
        <TabsContent value="deposit" className="space-y-3">
          <Card className="p-4">
            <h4 className="font-medium text-sm mb-1">Card / bank deposit (NGN → NC)</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Creates a hosted Quidax checkout. Redirect your user to the URL. NC is credited on payment confirmation.
            </p>
            <Label className="text-xs">Amount (₦)</Label>
            <Input type="number" value={buyAmount} onChange={(e) => setBuyAmount(e.target.value)} className="mb-3" />
            <Button onClick={createBuySession} disabled={busy === 'buy' || !apiKey} className="w-full">
              {busy === 'buy' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownToLine className="h-4 w-4 mr-2" />}
              Create deposit session
            </Button>
            {buyUrl && (
              <a href={buyUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between p-2 rounded bg-muted text-xs hover:bg-muted/70">
                <span className="truncate">{buyUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0 ml-2" />
              </a>
            )}
            <pre className="text-[10px] mt-3 bg-muted p-2 rounded overflow-x-auto">{`POST /ramp/session/buy
{ "external_user_id": "${extId || 'user-id'}", "amount_ngn": ${buyAmount} }
→ { "checkout_url": "https://..." }`}</pre>
          </Card>
        </TabsContent>

        {/* WITHDRAW — NC → Nigerian bank */}
        <TabsContent value="withdraw" className="space-y-3">
          <Card className="p-4">
            <h4 className="font-medium text-sm mb-1">Bank withdrawal (NC → NGN)</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Debits the user's NC and pays out to a Nigerian bank account via Quidax.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <Label className="text-xs">Amount (NC)</Label>
                <Input type="number" value={sellAmount} onChange={(e) => setSellAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Bank code</Label>
                <Input value={bankCode} onChange={(e) => setBankCode(e.target.value)} placeholder="058" />
              </div>
              <div>
                <Label className="text-xs">Account number</Label>
                <Input value={acctNo} onChange={(e) => setAcctNo(e.target.value)} placeholder="0123456789" />
              </div>
              <div>
                <Label className="text-xs">Account name</Label>
                <Input value={acctName} onChange={(e) => setAcctName(e.target.value)} />
              </div>
            </div>
            <Button onClick={createSellSession} disabled={busy === 'sell' || !apiKey} className="w-full">
              {busy === 'sell' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpFromLine className="h-4 w-4 mr-2" />}
              Create withdrawal
            </Button>
            {sellUrl && (
              <a href={sellUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-between p-2 rounded bg-muted text-xs hover:bg-muted/70">
                <span className="truncate">{sellUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0 ml-2" />
              </a>
            )}
            <pre className="text-[10px] mt-3 bg-muted p-2 rounded overflow-x-auto">{`POST /ramp/session/sell
{ "external_user_id": "${extId || 'user-id'}", "amount_ngn": ${sellAmount},
  "bank_code": "${bankCode}", "account_number": "${acctNo || '...'}",
  "account_name": "${acctName || '...'}" }`}</pre>
          </Card>
        </TabsContent>

        {/* CRYPTO deposit/withdraw */}
        <TabsContent value="crypto" className="space-y-3">
          <Card className="p-4">
            <h4 className="font-medium text-sm mb-1 flex items-center gap-2"><QrCode className="h-4 w-4" /> Crypto deposit address</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Show this address to your user. Any cUSD / USDT / CELO sent here is auto-credited to their NC balance at live FX.
            </p>
            {walletAddr ? (
              <div className="space-y-2">
                <button onClick={() => copy(walletAddr)} className="block w-full font-mono text-xs p-3 bg-muted rounded text-left hover:bg-muted/70 break-all">
                  {walletAddr}
                </button>
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${walletAddr}`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                >Open QR <ExternalLink className="h-3 w-3" /></a>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Enter a user ID above and click Load.</p>
            )}
            <pre className="text-[10px] mt-3 bg-muted p-2 rounded overflow-x-auto">{`GET /wallet/balance?external_user_id=${extId || 'user-id'}
→ { "address": "0x...", "balances": { "CELO": "...", "cUSD": "...", "USDT": "..." } }`}</pre>
          </Card>

          <Card className="p-4">
            <h4 className="font-medium text-sm mb-1">Withdraw crypto from managed wallet</h4>
            <p className="text-xs text-muted-foreground mb-2">
              Use the Web3 Wallet → <code>POST /wallet/transfer</code> endpoint to send cUSD/USDT/CELO from the user's managed wallet to any 0x address.
              Try it from the Playground tab.
            </p>
          </Card>
        </TabsContent>

        {/* PAYOUT — instant NC credit/debit by developer */}
        <TabsContent value="payout" className="space-y-3">
          <Card className="p-4">
            <h4 className="font-medium text-sm mb-1">Instant NC payout / credit</h4>
            <p className="text-xs text-muted-foreground mb-3">
              Move NC between your developer balance and any end-user (rewards, refunds, top-ups). No card, no bank.
            </p>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <Label className="text-xs">Amount (NC)</Label>
                <Input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Note (optional)</Label>
                <Input value={payoutNote} onChange={(e) => setPayoutNote(e.target.value)} placeholder="Reward / refund" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => doPayout('credit')} disabled={busy === 'credit' || !apiKey}>
                {busy === 'credit' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowDownToLine className="h-4 w-4 mr-2" />}
                Credit user
              </Button>
              <Button onClick={() => doPayout('payout')} disabled={busy === 'payout' || !apiKey}>
                {busy === 'payout' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowUpFromLine className="h-4 w-4 mr-2" />}
                Debit user
              </Button>
            </div>
            <pre className="text-[10px] mt-3 bg-muted p-2 rounded overflow-x-auto">{`POST /payments/credit | /payments/payout
{ "external_user_id": "${extId || 'user-id'}", "amount": ${payoutAmount} }
→ { "ok": true, "new_balance": ... }`}</pre>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
