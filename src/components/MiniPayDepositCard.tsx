import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandButton } from '@/components/ui/brand-button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Wallet, Zap, CheckCircle, Loader2, AlertCircle, DollarSign } from 'lucide-react';
import { useMiniPay } from '@/hooks/useMiniPay';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface MiniPayDepositCardProps {
  onSuccess?: (amount: number) => void;
}

export const MiniPayDepositCard = ({ onSuccess }: MiniPayDepositCardProps) => {
  const { 
    isMiniPay, 
    isConnected, 
    account, 
    cusdBalance, 
    usdtBalance,
    isLoading, 
    error, 
    userWalletAddress,
    connect, 
    deposit 
  } = useMiniPay();
  const navigate = useNavigate();
  const [amount, setAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [selectedToken, setSelectedToken] = useState<'cusd' | 'usdt'>('cusd');

  // Minimum deposit: 100 NC
  const MIN_DEPOSIT = 100;

  const handleDeposit = async () => {
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum < MIN_DEPOSIT) {
      toast.error(`Minimum deposit is NC ${MIN_DEPOSIT}`);
      return;
    }

    // If user doesn't have a wallet address, they need to register
    if (!userWalletAddress) {
      navigate('/signup');
      return;
    }

    setIsDepositing(true);
    const result = await deposit(amountNum, selectedToken);
    
    if (result.success) {
      onSuccess?.(amountNum);
      setAmount('');
    }
    setIsDepositing(false);
  };

  const quickAmounts = [100, 500, 1000, 2500];

  // Show loading state
  if (isLoading && !isConnected) {
    return (
      <Card className="border-green-500/30 bg-gradient-to-br from-green-500/10 to-emerald-500/5">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <p className="text-muted-foreground">Connecting wallet...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error if connection failed
  if (error && !isConnected) {
    return (
      <Card className="border-orange-500/30 bg-gradient-to-br from-orange-500/10 to-amber-500/5">
        <CardContent className="py-6 space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}. Please ensure you're using MiniPay or a Celo-compatible wallet.
            </AlertDescription>
          </Alert>
          <BrandButton 
            onClick={connect} 
            className="w-full"
          >
            <Wallet className="h-4 w-4 mr-2" />
            Try Again
          </BrandButton>
        </CardContent>
      </Card>
    );
  }

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
          Deposit cUSD or USDT directly from your wallet
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Connect your wallet to deposit funds
            </p>
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
              Connect Wallet
            </BrandButton>
          </div>
        ) : (
          <>
            {/* Connected Status */}
            <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span className="text-sm font-medium">Connected</span>
              </div>
              <div className="text-right text-xs">
                {account?.slice(0, 6)}...{account?.slice(-4)}
              </div>
            </div>

            {/* Token Selection Tabs */}
            <Tabs value={selectedToken} onValueChange={(v) => setSelectedToken(v as 'cusd' | 'usdt')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cusd" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  cUSD
                </TabsTrigger>
                <TabsTrigger value="usdt" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  USDT
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="cusd" className="mt-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">cUSD Balance</span>
                  <span className="font-bold text-green-600">${cusdBalance}</span>
                </div>
              </TabsContent>
              
              <TabsContent value="usdt" className="mt-3">
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="text-sm">USDT Balance</span>
                  <span className="font-bold text-green-600">${usdtBalance}</span>
                </div>
              </TabsContent>
            </Tabs>

            {/* No wallet address warning */}
            {!userWalletAddress && (
              <Alert className="border-orange-500/50 bg-orange-500/10">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-sm">
                  Complete your registration to receive a wallet address for deposits.
                </AlertDescription>
              </Alert>
            )}

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
                placeholder={`Enter amount (min NC ${MIN_DEPOSIT})`}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={MIN_DEPOSIT}
              />
              <p className="text-xs text-muted-foreground">
                You'll receive: <span className="font-medium text-foreground">NC {parseFloat(amount || '0').toLocaleString()}</span>
              </p>
            </div>

            {/* Deposit Button */}
            <BrandButton
              onClick={handleDeposit}
              disabled={isDepositing || !amount || parseFloat(amount) < MIN_DEPOSIT}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isDepositing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Zap className="h-4 w-4 mr-2" />
              )}
              {!userWalletAddress ? 'Register to Deposit' : `Deposit ${selectedToken.toUpperCase()} via MiniPay`}
            </BrandButton>

            <p className="text-xs text-center text-muted-foreground">
              Funds will be sent to your NaijaLancers wallet
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};
