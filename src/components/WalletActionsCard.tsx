import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowDownUp, Loader2, RefreshCw, Plus, Send, Wallet, ArrowRight } from 'lucide-react';
import { useWallet } from '@/hooks/useWallet';
import { useCeloWallet } from '@/hooks/useCeloWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const TOKEN_INFO: Record<string, { name: string; symbol: string; color: string; icon: string }> = {
  NC: { name: 'NairaCoins', symbol: 'NC', color: 'text-green-500', icon: '₦' },
  cUSD: { name: 'Celo Dollar', symbol: 'cUSD', color: 'text-blue-500', icon: '$' },
  USDT: { name: 'Tether USD', symbol: 'USDT', color: 'text-emerald-500', icon: '$' },
  CELO: { name: 'Celo', symbol: 'CELO', color: 'text-yellow-500', icon: '◉' },
};

const SWAP_FEE_PERCENT = 1.5;

interface ExchangeRates {
  USD_NGN: number;
  CELO_USD: number;
  CELO_NGN: number;
}

export const WalletActionsCard = () => {
  const { balance } = useWallet();
  const { cUsdBalance, usdtBalance, celoBalance } = useCeloWallet();
  const navigate = useNavigate();

  // Swap state
  const [fromToken, setFromToken] = useState('NC');
  const [toToken, setToToken] = useState('cUSD');
  const [swapAmount, setSwapAmount] = useState('');
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [swapLoading, setSwapLoading] = useState(false);
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // Send state
  const [recipientEmail, setRecipientEmail] = useState('');
  const [sendAmount, setSendAmount] = useState('');
  const [sendLoading, setSendLoading] = useState(false);

  const supportedTokens = ['NC', 'cUSD', 'USDT', 'CELO'];

  // Fetch live rates
  const fetchRates = async () => {
    setRatesLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('crypto-swap', {
        body: { action: 'get_rates' }
      });
      if (error) throw error;
      if (data?.rates) {
        setRates(data.rates);
      }
    } catch (err) {
      console.error('Failed to fetch rates:', err);
    } finally {
      setRatesLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
  }, []);

  // Get balance for token
  const getBalance = (token: string): number => {
    switch (token) {
      case 'NC': return balance.withdrawable;
      case 'cUSD': return parseFloat(cUsdBalance) || 0;
      case 'USDT': return parseFloat(usdtBalance) || 0;
      case 'CELO': return parseFloat(celoBalance) || 0;
      default: return 0;
    }
  };

  // Calculate swap output
  const calculateOutput = (from: string, to: string, amount: number): { output: number; fee: number } => {
    if (!rates || amount <= 0) return { output: 0, fee: 0 };
    
    const fee = amount * (SWAP_FEE_PERCENT / 100);
    const net = amount - fee;
    let output = 0;

    if (from === 'NC') {
      if (to === 'cUSD' || to === 'USDT') output = net / rates.USD_NGN;
      else if (to === 'CELO') output = net / rates.CELO_NGN;
    } else if (to === 'NC') {
      if (from === 'cUSD' || from === 'USDT') output = net * rates.USD_NGN;
      else if (from === 'CELO') output = net * rates.CELO_NGN;
    } else {
      const fromUsd = from === 'CELO' ? net * rates.CELO_USD : net;
      output = to === 'CELO' ? fromUsd / rates.CELO_USD : fromUsd;
    }

    return { output, fee };
  };

  const inputAmount = parseFloat(swapAmount) || 0;
  const { output: outputAmount, fee: swapFee } = calculateOutput(fromToken, toToken, inputAmount);
  const fromBalance = getBalance(fromToken);

  // Execute swap
  const executeSwap = async () => {
    setSwapLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Please log in');

      const { data, error } = await supabase.functions.invoke('crypto-swap', {
        body: { action: 'execute_swap', fromToken, toToken, amount: swapAmount },
        headers: { Authorization: `Bearer ${session.data.session.access_token}` }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Swap failed');

      toast.success(`Swapped ${inputAmount} ${fromToken} → ${outputAmount.toFixed(4)} ${toToken}`);
      setShowSwapConfirm(false);
      setSwapAmount('');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Swap failed');
    } finally {
      setSwapLoading(false);
    }
  };

  // Send NC
  const handleSend = async () => {
    if (!recipientEmail || !sendAmount) {
      toast.error('Enter recipient and amount');
      return;
    }
    const amount = parseFloat(sendAmount);
    if (amount > balance.withdrawable) {
      toast.error('Insufficient balance');
      return;
    }

    setSendLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Please log in');

      const { data, error } = await supabase.rpc('transfer_funds', {
        sender_id: session.data.session.user.id,
        recipient_email: recipientEmail,
        amount,
        pin_hash: ''
      });

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Transfer failed');

      toast.success(`Sent ₦${amount} NC to ${result.recipient_name}`);
      setSendAmount('');
      setRecipientEmail('');
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Transfer failed');
    } finally {
      setSendLoading(false);
    }
  };

  // Get rate display
  const getRateDisplay = (): string => {
    if (!rates) return '-';
    if (fromToken === 'NC') {
      if (toToken === 'cUSD' || toToken === 'USDT') return `₦${rates.USD_NGN.toLocaleString()} = 1 ${toToken}`;
      if (toToken === 'CELO') return `₦${rates.CELO_NGN.toFixed(2)} = 1 CELO`;
    } else if (toToken === 'NC') {
      if (fromToken === 'cUSD' || fromToken === 'USDT') return `1 ${fromToken} = ₦${rates.USD_NGN.toLocaleString()}`;
      if (fromToken === 'CELO') return `1 CELO = ₦${rates.CELO_NGN.toFixed(2)}`;
    }
    return '-';
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-4">
        {/* BUY NC SECTION */}
        <Card className="border-border/50 bg-gradient-to-br from-green-500/10 to-emerald-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Plus className="h-4 w-4 text-green-500" />
              </div>
              Buy NC
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Deposit cUSD, USDT, or CELO to get NC instantly
            </p>
            <div className="flex flex-wrap gap-2 mb-3">
              {['cUSD', 'USDT', 'CELO'].map(token => (
                <Badge key={token} variant="secondary" className="text-xs">
                  {TOKEN_INFO[token]?.icon} {token}
                </Badge>
              ))}
            </div>
            <Button 
              className="w-full bg-green-600 hover:bg-green-700"
              onClick={() => navigate('/dashboard')}
            >
              <Wallet className="h-4 w-4 mr-2" />
              Deposit Crypto
            </Button>
          </CardContent>
        </Card>

        {/* SEND NC SECTION */}
        <Card className="border-border/50 bg-gradient-to-br from-blue-500/10 to-cyan-500/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Send className="h-4 w-4 text-blue-500" />
              </div>
              Send NC
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Recipient Email</label>
              <Input
                type="email"
                placeholder="user@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <div className="flex justify-between">
                <label className="text-xs text-muted-foreground">Amount (NC)</label>
                <span className="text-xs text-muted-foreground">
                  Bal: {balance.withdrawable.toLocaleString()}
                </span>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button 
              onClick={handleSend}
              disabled={sendLoading || !recipientEmail || !sendAmount}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {sendLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
              Send NC
            </Button>
          </CardContent>
        </Card>

        {/* SWAP SECTION */}
        <Card className="border-border/50 bg-gradient-to-br from-purple-500/10 to-indigo-500/10">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <ArrowDownUp className="h-4 w-4 text-purple-500" />
                </div>
                Swap
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={fetchRates} disabled={ratesLoading} className="h-7 w-7">
                <RefreshCw className={`h-3 w-3 ${ratesLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Rate */}
            <div className="flex items-center justify-between p-2 bg-background/50 rounded-lg text-xs">
              <span className="text-muted-foreground">Live Rate</span>
              <span className="font-medium">{ratesLoading ? '...' : getRateDisplay()}</span>
            </div>

            {/* From */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-muted-foreground">From</span>
                <span className="text-muted-foreground">Bal: {fromBalance.toFixed(4)}</span>
              </div>
              <div className="flex gap-2">
                <Select value={fromToken} onValueChange={setFromToken}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedTokens.map(t => (
                      <SelectItem key={t} value={t}>
                        <span className={TOKEN_INFO[t]?.color}>{TOKEN_INFO[t]?.icon}</span> {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  className="flex-1"
                />
              </div>
            </div>

            {/* Flip */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="icon"
                onClick={() => { setFromToken(toToken); setToToken(fromToken); setSwapAmount(''); }}
                className="rounded-full h-8 w-8"
              >
                <ArrowDownUp className="h-3 w-3" />
              </Button>
            </div>

            {/* To */}
            <div>
              <span className="text-xs text-muted-foreground">To</span>
              <div className="flex gap-2 mt-1">
                <Select value={toToken} onValueChange={setToToken}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {supportedTokens.filter(t => t !== fromToken).map(t => (
                      <SelectItem key={t} value={t}>
                        <span className={TOKEN_INFO[t]?.color}>{TOKEN_INFO[t]?.icon}</span> {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1 flex items-center px-3 bg-muted/50 rounded-md border">
                  <span className="font-semibold">
                    {outputAmount > 0 ? outputAmount.toFixed(toToken === 'NC' ? 2 : 6) : '0.00'}
                  </span>
                </div>
              </div>
            </div>

            {/* Fee */}
            {inputAmount > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                <span>Fee ({SWAP_FEE_PERCENT}%)</span>
                <span>{swapFee.toFixed(4)} {fromToken}</span>
              </div>
            )}

            {/* Swap Button */}
            <Button
              onClick={() => setShowSwapConfirm(true)}
              disabled={!swapAmount || inputAmount <= 0 || inputAmount > fromBalance || ratesLoading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              <ArrowRight className="h-4 w-4 mr-2" />
              Swap {fromToken} → {toToken}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Swap Confirmation Dialog */}
      <Dialog open={showSwapConfirm} onOpenChange={setShowSwapConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Swap</DialogTitle>
            <DialogDescription>Review your swap details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">You pay</p>
                <p className="text-xl font-bold">{inputAmount} {fromToken}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-right">
                <p className="text-sm text-muted-foreground">You receive</p>
                <p className="text-xl font-bold text-green-500">{outputAmount.toFixed(4)} {toToken}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span>{getRateDisplay()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee ({SWAP_FEE_PERCENT}%)</span>
                <span>{swapFee.toFixed(4)} {fromToken}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapConfirm(false)}>Cancel</Button>
            <Button onClick={executeSwap} disabled={swapLoading} className="bg-purple-600 hover:bg-purple-700">
              {swapLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
