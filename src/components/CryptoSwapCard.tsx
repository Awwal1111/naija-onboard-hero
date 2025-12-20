import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ArrowDownUp, Loader2, RefreshCw, Wallet, ArrowRight, ExternalLink, TrendingUp, Send } from 'lucide-react';
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

export const CryptoSwapCard = () => {
  const { rates, ratesLoading, fetchRates, calculateOutput, getDisplayRate, supportedTokens } = useCryptoSwap();
  const { balance } = useWallet();
  const { address: celoAddress, cUsdBalance, usdtBalance, celoBalance } = useCeloWallet();
  
  const [fromToken, setFromToken] = useState('NC');
  const [toToken, setToToken] = useState('cUSD');
  const [amount, setAmount] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate output
  const inputAmount = parseFloat(amount) || 0;
  const outputAmount = calculateOutput(fromToken, toToken, inputAmount);

  // Get available balance for from token
  const getAvailableBalance = (token: string): number => {
    switch (token) {
      case 'NC': return balance.withdrawable;
      case 'cUSD': return parseFloat(cUsdBalance) || 0;
      case 'USDT': return parseFloat(usdtBalance) || 0;
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

  // Execute swap
  const handleSwap = async () => {
    if (!amount || inputAmount <= 0) {
      toast.error('Please enter an amount');
      return;
    }

    if (inputAmount > availableBalance) {
      toast.error('Insufficient balance');
      return;
    }

    if (fromToken === 'NC' && toToken !== 'NC') {
      // This is a withdrawal - need destination address
      if (!destinationAddress && toToken !== 'NC') {
        toast.error('Please enter a destination wallet address');
        return;
      }
      setShowSwapDialog(true);
    } else if (toToken === 'NC' && fromToken !== 'NC') {
      // This is a deposit - redirect to deposit flow
      toast.info('Use the deposit feature to convert crypto to NC');
    } else {
      toast.info('Crypto-to-crypto swaps coming soon!');
    }
  };

  // Confirm and execute the swap/withdrawal
  const confirmSwap = async () => {
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Please log in');
      }

      // Call celo-withdrawal for NC to crypto
      const { data, error } = await supabase.functions.invoke('celo-withdrawal', {
        body: {
          walletAddress: destinationAddress || celoAddress,
          ncAmount: inputAmount,
          currency: toToken
        },
        headers: {
          Authorization: `Bearer ${session.data.session.access_token}`
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Swapped ${inputAmount} NC to ${outputAmount.toFixed(4)} ${toToken}`);
        setShowSwapDialog(false);
        setAmount('');
        setDestinationAddress('');
      } else {
        throw new Error(data?.error || 'Swap failed');
      }
    } catch (error: any) {
      console.error('[SWAP] Error:', error);
      toast.error(error.message || 'Swap failed');
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
          {/* Rate Display */}
          <div className="flex items-center justify-between p-3 bg-background/50 rounded-lg border border-border/50">
            <span className="text-sm text-muted-foreground">Rate</span>
            <span className="text-sm font-medium">
              {ratesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : getDisplayRate(fromToken, toToken)}
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

          {/* Swap Button */}
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

          {/* Destination Address (for withdrawals) */}
          {fromToken === 'NC' && toToken !== 'NC' && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Destination Address</span>
                {celoAddress && (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs h-auto p-0"
                    onClick={() => setDestinationAddress(celoAddress)}
                  >
                    Use my wallet
                  </Button>
                )}
              </div>
              <Input
                placeholder="0x..."
                value={destinationAddress}
                onChange={(e) => setDestinationAddress(e.target.value)}
              />
            </div>
          )}

          {/* Swap Button */}
          <Button
            onClick={handleSwap}
            disabled={!amount || inputAmount <= 0 || inputAmount > availableBalance || ratesLoading}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <ArrowRight className="h-4 w-4 mr-2" />
            {fromToken === 'NC' && toToken !== 'NC' ? 'Withdraw to ' + toToken : 
             toToken === 'NC' && fromToken !== 'NC' ? 'Convert to NC' : 
             'Swap'}
          </Button>

          {/* Info */}
          <div className="text-xs text-center text-muted-foreground space-y-1">
            <p>• Send {toToken} to any wallet address (MiniPay, Binance, etc.)</p>
            <p>• Real-time rates from Mento & CoinGecko</p>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Swap</DialogTitle>
            <DialogDescription>
              Review your transaction details before confirming.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">You send</p>
                <p className="text-2xl font-bold">{inputAmount.toLocaleString()} NC</p>
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
                <span>{getDisplayRate(fromToken, toToken)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Destination</span>
                <span className="font-mono text-xs truncate max-w-[200px]">
                  {destinationAddress || celoAddress}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Network</span>
                <span>Celo Mainnet</span>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-600 text-xs">
              <p><strong>Note:</strong> Transactions are final. Make sure the destination address is correct.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSwapDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmSwap} 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Confirm Swap
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
