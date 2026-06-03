import { Shield, Lock, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface EscrowProtectionCardProps {
  variant?: 'full' | 'compact';
  className?: string;
}

/**
 * Buyer-facing escrow trust banner shown on Gig and Order pages
 * to make payment protection visible BEFORE checkout.
 */
export function EscrowProtectionCard({ variant = 'full', className = '' }: EscrowProtectionCardProps) {
  if (variant === 'compact') {
    return (
      <div className={`flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 ${className}`}>
        <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
        <p className="text-xs text-text-primary">
          <span className="font-semibold">Escrow Protected.</span> Your payment is held safely and only released after the work is delivered and approved.
        </p>
      </div>
    );
  }

  const items = [
    { icon: Lock, text: 'Your payment is securely held in escrow until the work is completed.' },
    { icon: RefreshCw, text: 'If the seller does not accept your order, you receive a full refund.' },
    { icon: CheckCircle2, text: 'Funds are only released after the work is delivered and approved.' },
    { icon: XCircle, text: 'You can cancel your order anytime before the seller accepts it.' },
  ];

  return (
    <Card className={`border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 ${className}`}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-text-primary">100% Escrow Protected</h3>
            <p className="text-xs text-text-secondary">Your money is safe with NaijaLancers</p>
          </div>
        </div>
        <ul className="space-y-2">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-text-primary">
              <item.icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export default EscrowProtectionCard;
