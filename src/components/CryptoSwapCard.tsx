import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownUp, Loader2, RefreshCw, Wallet, ArrowRight, Plus, Send, TrendingUp } from 'lucide-react';
import { useCryptoSwap } from '@/hooks/useCryptoSwap';
import { useWallet } from '@/hooks/useWallet';
import { useCeloWallet } from '@/hooks/useCeloWallet';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TOKEN_INFO: Record<string, { name: string; symbol: string; color: string; icon: string }> = {
  NC: { name: 'NairaCoins', symbol: 'NC', color: 'text-green-500', icon: '₦' },
  cUSD: { name: 'Celo Dollar', symbol: 'cUSD', color: 'text-blue-500', icon: '$' },
  USDT: { name: 'Tether USD', symbol: 'USDT', color: 'text-emerald-500', icon: '$' },
  USDC: { name: 'USD Coin', symbol: 'USDC', color: 'text-blue-400', icon: '$' },
  CELO: { name: 'Celo', symbol: 'CELO', color: 'text-yellow-500', icon: '◉' },
};

// Swap fees (platform revenue)
const SWAP_FEE_PERCENT = 1.5; // 1.5% swap fee

export const CryptoSwapCard = () => {
  const { rates, ratesLoading, fetchRates, supportedTokens } = useCryptoSwap();
  const { balance } = useWallet();
  const { address: celoAddress, cUsdBalance, usdtBalance, celoBalance } = useCeloWallet();
  
  const [activeTab, setActiveTab] = useState<'buy' | 'send' | 'swap'>('swap');
  const [fromToken, setFromToken] = useState('NC');
  const [toToken, setToToken] = useState('cUSD');
  const [amount, setAmount] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // NC = Naira = USDT (1 NC = 1 Naira, 1 USDT = rate * Naira)
  // Calculate output with fees
  const calculateSwapOutput = (from: string, to: string, inputAmount: number): { output: number; fee: number } => {
    if (!rates || inputAmount <= 0) return { output: 0, fee: 0 };
    
    // Fee calculation
    const feeAmount = inputAmount * (SWAP_FEE_PERCENT / 100);
    const netInput = inputAmount - feeAmount;
    
    let output = 0;
    
    if (from === 'NC') {
      // NC to crypto: NC is Naira, so divide by rate
      if (to === 'cUSD' || to === 'USDT' || to === 'USDC') {
        output = netInput / rates.USD_NGN;
      } else if (to === 'CELO') {
        output = netInput / rates.CELO_NGN;
      }
    } else if (to === 'NC') {
      // Crypto to NC: multiply by rate
      if (from === 'cUSD' || from === 'USDT' || from === 'USDC') {
        output = netInput * rates.USD_NGN;
      } else if (from === 'CELO') {
        output = netInput * rates.CELO_NGN;
      }
    } else {
      // Crypto to crypto through USD equivalent
      let usdValue = 0;
      if (from === 'CELO') {
        usdValue = netInput * rates.CELO_USD;
      } else {
        usdValue = netInput; // Stablecoins = 1 USD
      }
      
      if (to === 'CELO') {
        output = usdValue / rates.CELO_USD;
      } else {
        output = usdValue; // Stablecoins
      }
    }
    
    return { output, fee: from === 'NC' ? feeAmount : feeAmount * (from === 'CELO' ? rates.CELO_USD : 1) };
  };

  const inputAmount = parseFloat(amount) || 0;
  const { output: outputAmount, fee: swapFee } = calculateSwapOutput(fromToken, toToken, inputAmount);

  // Get available balance for token
  const getAvailableBalance = (token: string): number => {
    switch (token) {
      case 'NC': return balance.withdrawable;
      case 'cUSD': return parseFloat(cUsdBalance) || 0;
      case 'USDT': return parseFloat(usdtBalance) || 0;
      case 'USDC': return 0;
      case 'CELO': return parseFloat(celoBalance) || 0;
      default: return 0;
    }
  };

  const availableBalance = getAvailableBalance(fromToken);

  // Swap from/to tokens
  const handleFlip = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setAmount('');
  };

  // Get display rate
  const getDisplayRate = (): string => {
    if (!rates) return '-';
    
    if (fromToken === 'NC') {
      if (toToken === 'cUSD' || toToken === 'USDT' || toToken === 'USDC') {
        return `₦${rates.USD_NGN.toLocaleString()} = 1 ${toToken}`;
      } else if (toToken === 'CELO') {
        return `₦${rates.CELO_NGN.toFixed(2)} = 1 CELO`;
      }
    } else if (toToken === 'NC') {
      if (fromToken === 'cUSD' || fromToken === 'USDT' || fromToken === 'USDC') {
        return `1 ${fromToken} = ₦${rates.USD_NGN.toLocaleString()}`;
      } else if (fromToken === 'CELO') {
        return `1 CELO = ₦${rates.CELO_NGN.toFixed(2)}`;
      }
    } else {
      const fromRate = fromToken === 'CELO' ? rates.CELO_USD : 1;
      const toRate = toToken === 'CELO' ? rates.CELO_USD : 1;
      return `1 ${fromToken} = ${(fromRate / toRate).toFixed(4)} ${toToken}`;
    }
    return '-';
  };

  // Execute swap
  const handleSwap = async () => {
    if (!amount || inputAmount <= 0) {
      toast.error('Enter amount');
      return;
    }
    if (inputAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }
    setShowConfirmDialog(true);
  };

  // Confirm swap execution
  const confirmSwap = async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Please log in');

      const { data, error } = await supabase.functions.invoke('crypto-swap', {
        body: {
          action: 'execute_swap',
          fromToken,
          toToken,
          amount: inputAmount.toString()
        },
        headers: { Authorization: `Bearer ${session.data.session.access_token}` }
      });

      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Swap failed');

      toast.success(`Swapped ${inputAmount} ${fromToken} → ${(data as any).outputAmount?.toFixed(4) || outputAmount.toFixed(4)} ${toToken}`);
      setShowConfirmDialog(false);
      setAmount('');
    } catch (error: any) {
      console.error('[SWAP] Error:', error);
      toast.error(error.message || 'Swap failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle NC transfer (Send)
  const handleSend = async () => {
    if (!recipientEmail || !amount || inputAmount <= 0) {
      toast.error('Enter recipient email and amount');
      return;
    }
    if (inputAmount > balance.withdrawable) {
      toast.error('Insufficient balance');
      return;
    }
    
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error('Please log in');

      const { data, error } = await supabase.rpc('transfer_funds', {
        sender_id: session.data.session.user.id,
        recipient_email: recipientEmail,
        amount: inputAmount,
        pin_hash: ''
      });

      if (error) throw error;
      const result = data as any;
      if (!result?.success) throw new Error(result?.error || 'Transfer failed');

      toast.success(`Sent ₦${inputAmount} NC to ${result.recipient_name}`);
      setAmount('');
      setRecipientEmail('');
    } catch (error: any) {
      console.error('[SEND] Error:', error);
      toast.error(error.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Card className="border-border/50 bg-gradient-to-br from-purple-500/10 to-indigo-500/10 overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <ArrowDownUp className="h-5 w-5 text-purple-500" />
              </div>
              Crypto Trading
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchRates}
              disabled={ratesLoading}
              className="h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${ratesLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tab Navigation */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="buy" className="flex items-center gap-1">
                <Plus className="h-3 w-3" /> Buy NC
              </TabsTrigger>
              <TabsTrigger value="send" className="flex items-center gap-1">
                <Send className="h-3 w-3" /> Send
              </TabsTrigger>
              <TabsTrigger value="swap" className="flex items-center gap-1">
                <ArrowDownUp className="h-3 w-3" /> Swap
              </TabsTrigger>
            </TabsList>

            {/* Buy NC Tab */}
            <TabsContent value="buy" className="space-y-4 mt-4">
              <div className="p-4 bg-background/50 rounded-lg border border-border/50 text-center">
                <p className="text-sm text-muted-foreground mb-3">
                  Deposit crypto to buy NC. Use the Deposit button in your wallet.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {['cUSD', 'USDT', 'CELO'].map(token => (
                    <Badge key={token} variant="secondary" className="text-xs">
                      {TOKEN_INFO[token]?.icon} {token}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button 
                className="w-full" 
                onClick={() => window.location.href = '/dashboard'}
              >
                <Plus className="h-4 w-4 mr-2" />
                Go to Wallet to Deposit
              </Button>
            </TabsContent>

            {/* Send NC Tab */}
            <TabsContent value="send" className="space-y-4 mt-4">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Recipient Email</label>
                <Input
                  type="email"
                  placeholder="user@example.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm text-muted-foreground">Amount (NC)</label>
                  <span className="text-xs text-muted-foreground">
                    Balance: {balance.withdrawable.toLocaleString()} NC
                  </span>
                </div>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <Button 
                onClick={handleSend} 
                disabled={loading || !recipientEmail || !amount}
                className="w-full"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                Send NC
              </Button>
            </TabsContent>

            {/* Swap Tab */}
            <TabsContent value="swap" className="space-y-4 mt-4">
              {/* Rate Display */}
              <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
                <span className="text-sm text-muted-foreground">Rate</span>
                <span className="text-sm font-medium">
                  {ratesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : getDisplayRate()}
                </span>
              </div>

              {/* From Token */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">From</span>
                  <span className="text-xs text-muted-foreground">
                    Balance: {availableBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })} {fromToken}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Select value={fromToken} onValueChange={setFromToken}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedTokens.map(token => (
                        <SelectItem key={token} value={token}>
                          <span className={TOKEN_INFO[token]?.color}>{TOKEN_INFO[token]?.icon}</span> {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="flex-1"
                  />
                </div>
                {/* Quick amount buttons */}
                {fromToken === 'NC' && (
                  <div className="flex gap-1">
                    {[25, 50, 75, 100].map(pct => (
                      <Button
                        key={pct}
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs h-7"
                        onClick={() => setAmount(Math.floor(availableBalance * pct / 100).toString())}
                        disabled={availableBalance <= 0}
                      >
                        {pct}%
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleFlip}
                  className="rounded-full h-10 w-10 border-2"
                >
                  <ArrowDownUp className="h-4 w-4" />
                </Button>
              </div>

              {/* To Token */}
              <div className="space-y-2">
                <span className="text-sm text-muted-foreground">To</span>
                <div className="flex gap-2">
                  <Select value={toToken} onValueChange={setToToken}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportedTokens.filter(t => t !== fromToken).map(token => (
                        <SelectItem key={token} value={token}>
                          <span className={TOKEN_INFO[token]?.color}>{TOKEN_INFO[token]?.icon}</span> {token}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex-1 flex items-center px-3 bg-muted/50 rounded-md border border-border">
                    <span className="text-lg font-semibold">
                      {outputAmount > 0 ? outputAmount.toFixed(toToken === 'NC' ? 2 : 6) : '0.00'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee Display */}
              {inputAmount > 0 && (
                <div className="flex justify-between text-xs text-muted-foreground p-2 bg-muted/30 rounded">
                  <span>Swap Fee ({SWAP_FEE_PERCENT}%)</span>
                  <span>{swapFee.toFixed(fromToken === 'NC' ? 2 : 4)} {fromToken === 'NC' ? 'NC' : 'USD'}</span>
                </div>
              )}

              {/* Swap Button */}
              <Button
                onClick={handleSwap}
                disabled={!amount || inputAmount <= 0 || inputAmount > availableBalance || ratesLoading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                <ArrowRight className="h-4 w-4 mr-2" />
                Swap {fromToken} → {toToken}
              </Button>

              {/* Info */}
              <div className="text-xs text-center text-muted-foreground">
                <p>• NC = ₦1 | Live rates from CoinGecko</p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Swap</DialogTitle>
            <DialogDescription>Review your swap details</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">You pay</p>
                <p className="text-2xl font-bold">{inputAmount.toLocaleString()} {fromToken}</p>
              </div>
              <ArrowRight className="h-6 w-6 text-muted-foreground" />
              <div className="text-right">
                <p className="text-sm text-muted-foreground">You receive</p>
                <p className="text-2xl font-bold">{outputAmount.toFixed(4)} {toToken}</p>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rate</span>
                <span>{getDisplayRate()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fee ({SWAP_FEE_PERCENT}%)</span>
                <span>{swapFee.toFixed(4)} {fromToken === 'NC' ? 'NC' : 'USD'}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>Cancel</Button>
            <Button onClick={confirmSwap} disabled={loading} className="bg-purple-600 hover:bg-purple-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Swap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
