import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandButton } from '@/components/ui/brand-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Wallet, Zap, CheckCircle, Loader2 } from 'lucide-react';
import { useMiniPay } from '@/hooks/useMiniPay';

interface MiniPayDepositCardProps {
  onSuccess?: (amount: number) => void;
}

export const MiniPayDepositCard = ({ onSuccess }: MiniPayDepositCardProps) => {
  const { isMiniPay, isConnected, account, cusdBalance, isLoading, connect, deposit } = useMiniPay();
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

  if (!isMiniPay) return null;

  const handleDeposit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < 500) return;

    setIsDepositing(true);
    const result = await deposit(amountNum);
    
    if (result.success) {
      onSuccess?.(amountNum);
      setAmount('');
    }
    setIsDepositing(false);
  };

  const quickAmounts = [1000, 2500, 5000, 10000];

  return (
    <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Wallet className="h-5 w-5 text-green-600" />
            MiniPay Deposit
          </CardTitle>
          <Badge className="bg-green-600">
            <Zap className="h-3 w-3 mr-1" />
            Instant
          </Badge>
        </div>
        <CardDescription>
          Deposit directly from your MiniPay wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <BrandButton 
            onClick={connect} 
            disabled={isLoading}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Wallet className="h-4 w-4 mr-2" />
            )}
            Connect MiniPay
          </BrandButton>
        ) : (
          <>
            {/* Connected Status */}
            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">cUSD Balance</p>
                <p className="font-bold text-green-600">${cusdBalance}</p>
              </div>
            </div>

            {/* Quick Amounts */}
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map(amt => (
                <button
                  key={amt}
                  onClick={() => setAmount(amt.toString())}
                  className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    amount === amt.toString()
                      ? 'bg-green-600 text-white'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  ₦{amt.toLocaleString()}
                </button>
              ))}
            </div>

            {/* Custom Amount */}
            <div className="space-y-2">
              <Input
                type="number"
                placeholder="Enter amount (min ₦500)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={500}
              />
              <p className="text-xs text-muted-foreground">
                You'll receive: <span className="font-medium text-foreground">NC {parseFloat(amount || '0').toLocaleString()}</span>
              </p>
            </div>

            {/* Deposit Button */}
            <BrandButton
              onClick={handleDeposit}
              disabled={isDepositing || !amount || parseFloat(amount) < 500}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isDepositing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              Deposit via MiniPay
            </BrandButton>

            <p className="text-xs text-center text-muted-foreground">
              Account: {account?.slice(0, 6)}...{account?.slice(-4)}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
