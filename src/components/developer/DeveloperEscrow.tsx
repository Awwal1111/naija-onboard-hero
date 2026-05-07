import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ExternalLink, Loader2, Rocket, Send, RotateCcw, Copy, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/developer-api`;

interface Props { apiKey: string | null }

interface DeployedEscrow {
  address: string;
  token: string;
  payer: string;
  payee: string;
  dev_fee_bps: number;
  platform_fee_bps: number;
  tx_hash: string;
  created_at: string;
}

const STORAGE_KEY = 'nl_dev_escrows';

function loadLocalEscrows(): DeployedEscrow[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
function saveLocalEscrows(list: DeployedEscrow[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
}

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

export default function DeveloperEscrow({ apiKey }: Props) {
  const [escrows, setEscrows] = useState<DeployedEscrow[]>(loadLocalEscrows());
  const [deploying, setDeploying] = useState(false);
  const [busyAddr, setBusyAddr] = useState<string | null>(null);
  const [stateMap, setStateMap] = useState<Record<string, { state: string; balance: string }>>({});

  // form
  const [token, setToken] = useState<'cUSD' | 'USDT'>('cUSD');
  const [payer, setPayer] = useState('');
  const [payee, setPayee] = useState('');
  const [devFeePct, setDevFeePct] = useState('5');
  const [devRecipient, setDevRecipient] = useState('');
  const [gasPayer, setGasPayer] = useState<'wallet' | 'platform'>('platform');

  const STATE_LABELS = ['Created', 'Funded', 'Released', 'Refunded'];

  async function handleDeploy() {
    if (!apiKey) return toast.error('Generate an API key first');
    if (!payer || !payee) return toast.error('Payer & payee addresses required');
    setDeploying(true);
    try {
      const bps = Math.round(parseFloat(devFeePct || '0') * 100);
      const r = await callApi(apiKey, 'escrow/onchain/deploy', 'POST', {
        token, payer, payee,
        dev_fee_bps: bps,
        dev_fee_recipient: devRecipient || undefined,
        gas_payer: gasPayer,
      });
      const entry: DeployedEscrow = {
        address: r.address,
        token: r.escrow_token || token,
        payer, payee,
        dev_fee_bps: r.fees?.dev_bps ?? bps,
        platform_fee_bps: r.fees?.platform_bps ?? 50,
        tx_hash: r.transaction_hash,
        created_at: new Date().toISOString(),
      };
      const next = [entry, ...escrows];
      setEscrows(next); saveLocalEscrows(next);
      toast.success('Escrow deployed on Celo');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setDeploying(false);
    }
  }

  async function refreshState(e: DeployedEscrow) {
    if (!apiKey) return;
    setBusyAddr(e.address);
    try {
      const stateAbi = [{ inputs: [], name: 'state', outputs: [{ type: 'uint8' }], stateMutability: 'view', type: 'function' }];
      const balAbi = [{ inputs: [], name: 'balance', outputs: [{ type: 'uint256' }], stateMutability: 'view', type: 'function' }];
      const [s, b] = await Promise.all([
        callApi(apiKey, 'contracts/read', 'POST', { address: e.address, abi: stateAbi, method: 'state' }),
        callApi(apiKey, 'contracts/read', 'POST', { address: e.address, abi: balAbi, method: 'balance' }),
      ]);
      setStateMap((m) => ({
        ...m,
        [e.address]: {
          state: STATE_LABELS[Number(s.result)] || 'Unknown',
          balance: (Number(b.result) / 1e18).toFixed(4),
        },
      }));
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyAddr(null);
    }
  }

  async function handleAction(e: DeployedEscrow, action: 'release' | 'refund') {
    if (!apiKey) return;
    if (!confirm(`Confirm ${action}() on escrow ${e.address.slice(0, 10)}…?`)) return;
    setBusyAddr(e.address);
    try {
      const abi = [{ inputs: [], name: action, outputs: [], stateMutability: 'nonpayable', type: 'function' }];
      const r = await callApi(apiKey, 'contracts/call', 'POST', {
        address: e.address, abi, method: action, gas_payer: gasPayer,
      });
      toast.success(`${action} broadcast — tx ${r.transaction_hash.slice(0, 10)}…`);
      refreshState(e);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusyAddr(null);
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  }

  return (
    <div className="space-y-6">
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-transparent">
        <h3 className="font-semibold mb-1">On-chain escrow (Celo, ERC20)</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Funds are held by the deployed Solidity contract — not by NaijaLancers, not by you.
          On <code>release()</code>: payee gets <b>amount − your dev fee − 0.5% platform fee</b>.
          On <code>refund()</code>: full amount returns to payer.
        </p>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Token</Label>
            <Select value={token} onValueChange={(v) => setToken(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cUSD">cUSD</SelectItem>
                <SelectItem value="USDT">USDT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Gas paid by</Label>
            <Select value={gasPayer} onValueChange={(v) => setGasPayer(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="platform">NaijaLancers (billed in NC)</SelectItem>
                <SelectItem value="wallet">My CELO wallet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Payer (buyer) Celo address</Label>
            <Input value={payer} onChange={(e) => setPayer(e.target.value)} placeholder="0x…" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Payee (seller) Celo address</Label>
            <Input value={payee} onChange={(e) => setPayee(e.target.value)} placeholder="0x…" />
          </div>
          <div>
            <Label className="text-xs">Your fee % (0–20)</Label>
            <Input type="number" step="0.1" min={0} max={20} value={devFeePct} onChange={(e) => setDevFeePct(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Fee recipient (optional)</Label>
            <Input value={devRecipient} onChange={(e) => setDevRecipient(e.target.value)} placeholder="defaults to platform" />
          </div>
        </div>
        <Button className="mt-4 w-full" onClick={handleDeploy} disabled={deploying || !apiKey}>
          {deploying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
          Deploy escrow contract
        </Button>
      </Card>

      <div>
        <h3 className="font-semibold mb-2">Your escrows</h3>
        {escrows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            No escrows yet. Deploy your first one above.
          </Card>
        ) : (
          <div className="space-y-3">
            {escrows.map((e) => {
              const st = stateMap[e.address];
              const busy = busyAddr === e.address;
              return (
                <Card key={e.address} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary">{e.token}</Badge>
                        {st && <Badge variant={st.state === 'Funded' ? 'default' : 'outline'}>{st.state}</Badge>}
                        <Badge variant="outline">dev {e.dev_fee_bps / 100}% · plat {e.platform_fee_bps / 100}%</Badge>
                      </div>
                      <button onClick={() => copy(e.address)} className="font-mono text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 truncate w-full text-left">
                        {e.address} <Copy className="h-3 w-3 shrink-0" />
                      </button>
                      {st && <p className="text-xs mt-1">Balance: <span className="font-mono">{st.balance} {e.token}</span></p>}
                    </div>
                    <a href={`https://celoscan.io/address/${e.address}`} target="_blank" rel="noreferrer">
                      <Button size="icon" variant="ghost"><ExternalLink className="h-4 w-4" /></Button>
                    </a>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <Button size="sm" variant="outline" onClick={() => refreshState(e)} disabled={busy}>
                      {busy ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Eye className="h-3 w-3 mr-1" />} State
                    </Button>
                    <Button size="sm" onClick={() => handleAction(e, 'release')} disabled={busy}>
                      <Send className="h-3 w-3 mr-1" /> Release
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleAction(e, 'refund')} disabled={busy}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Refund
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Payer: <span className="font-mono">{e.payer.slice(0, 10)}…</span> →
                    Payee: <span className="font-mono">{e.payee.slice(0, 10)}…</span>
                  </p>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card className="p-4">
        <h4 className="font-semibold text-sm mb-2">How the payer funds the escrow</h4>
        <p className="text-xs text-muted-foreground mb-2">
          After deploying, the payer must (1) approve the escrow address on the cUSD/USDT contract, then (2) call <code>fund(amount)</code>.
          You can do both via <code>POST /contracts/call</code> from the payer's wallet, or have the payer use any Celo wallet (MetaMask, Valora, MiniPay).
        </p>
        <pre className="text-[10px] bg-muted p-2 rounded overflow-x-auto">{`// 1. Payer approves escrow address on token contract (one-time)
POST /contracts/call
{ "address": "<TOKEN_ADDR>", "abi":[approveAbi], "method":"approve",
  "args":["<ESCROW_ADDR>", "<AMOUNT_WEI>"], "external_user_id":"<payer>" }

// 2. Payer funds the escrow
POST /contracts/call
{ "address": "<ESCROW_ADDR>", "abi":[fundAbi], "method":"fund",
  "args":["<AMOUNT_WEI>"], "external_user_id":"<payer>" }`}</pre>
      </Card>
    </div>
  );
}
