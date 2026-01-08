import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Wallet, Zap, CheckCircle } from 'lucide-react';
import { useMiniPay } from '@/hooks/useMiniPay';
import { BrandButton } from './ui/brand-button';

interface MiniPayBannerProps {
  onDepositClick?: () => void;
}

export const MiniPayBanner = ({ onDepositClick }: MiniPayBannerProps) => {
  const { isMiniPay, isConnected, cusdBalance, connect, isLoading } = useMiniPay();

  if (!isMiniPay) return null;

  return (
    <Card className="border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/5">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <Wallet className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm">MiniPay Connected</p>
                <Badge className="bg-green-600 text-xs py-0">
                  <Zap className="h-3 w-3 mr-1" />
                  Fast
                </Badge>
              </div>
              {isConnected ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-green-500" />
                  Balance: ${cusdBalance} cUSD
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Tap to connect wallet
                </p>
              )}
            </div>
          </div>
          
          {isConnected ? (
            <BrandButton 
              size="sm" 
              onClick={onDepositClick}
              className="bg-green-600 hover:bg-green-700"
            >
              Deposit
            </BrandButton>
          ) : (
            <BrandButton 
              size="sm" 
              onClick={connect}
              disabled={isLoading}
              variant="outline"
              className="border-green-500/50"
            >
              Connect
            </BrandButton>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
