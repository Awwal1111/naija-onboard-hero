import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { BrandButton } from '@/components/ui/brand-button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Clock, DollarSign, User, Calendar } from 'lucide-react';

interface Payout {
  id: string;
  user_id: string;
  amount: number;
  method: string;
  status: string;
  bank_details: any;
  created_at: string;
  paystack_transfer_ref: string;
  profiles: {
    full_name: string;
    phone_number: string;
  };
}

export const AdminWithdrawalsSection = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const { toast } = useToast();

  const fetchPayouts = async () => {
    try {
      const { data, error } = await supabase
        .from('payouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch profile data separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name, phone_number')
          .in('user_id', userIds);

        const profilesMap = new Map(
          profilesData?.map(p => [p.user_id, p]) || []
        );

        const enrichedData = data.map(payout => ({
          ...payout,
          profiles: profilesMap.get(payout.user_id) || {
            full_name: 'Unknown User',
            phone_number: 'N/A'
          }
        }));

        setPayouts(enrichedData as any);
      } else {
        setPayouts([]);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();

    // Real-time subscription
    const channel = supabase
      .channel('payouts-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'payouts' }, () => {
        fetchPayouts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleAction = async (payoutId: string, action: 'approve' | 'reject') => {
    setProcessing(payoutId);
    try {
      const { data, error } = await supabase.functions.invoke('approve-payout', {
        body: {
          payout_id: payoutId,
          action,
          rejection_reason: action === 'reject' ? rejectionReason : undefined,
        },
      });

      if (error) throw error;

      toast({
        title: action === 'approve' ? 'Withdrawal Approved' : 'Withdrawal Rejected',
        description: data.message,
      });

      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedPayout(null);
      await fetchPayouts();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      approved: 'bg-green-500/10 text-green-500 border-green-500/20',
      completed: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
      rejected: 'bg-red-500/10 text-red-500 border-red-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20',
    };

    return (
      <Badge className={styles[status as keyof typeof styles] || ''}>
        {status.toUpperCase()}
      </Badge>
    );
  };

  const pendingPayouts = payouts.filter(p => p.status === 'pending');
  const processedPayouts = payouts.filter(p => p.status !== 'pending');

  if (loading) {
    return <div className="text-center py-8">Loading withdrawals...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pending Withdrawals */}
      <div>
        <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-yellow-500" />
          Pending Withdrawals ({pendingPayouts.length})
        </h3>
        {pendingPayouts.length === 0 ? (
          <Card className="p-6 text-center text-text-secondary">
            No pending withdrawals
          </Card>
        ) : (
          <div className="space-y-4">
            {pendingPayouts.map((payout) => (
              <Card key={payout.id} className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <User className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-semibold">{payout.profiles.full_name}</p>
                          <p className="text-sm text-text-secondary">{payout.profiles.phone_number}</p>
                        </div>
                      </div>
                      {getStatusBadge(payout.status)}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-primary" />
                        <span className="font-bold text-lg text-primary">
                          ₦{payout.amount.toLocaleString()} NC
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(payout.created_at).toLocaleString()}</span>
                      </div>
                    </div>

                    {payout.bank_details && (
                      <div className="bg-accent/30 rounded-lg p-3 space-y-1">
                        <p className="text-sm"><strong>Bank:</strong> {payout.bank_details.account_name}</p>
                        <p className="text-sm"><strong>Account:</strong> {payout.bank_details.account_number}</p>
                        <p className="text-sm"><strong>Bank Code:</strong> {payout.bank_details.bank_code}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 lg:flex-col">
                    <BrandButton
                      onClick={() => handleAction(payout.id, 'approve')}
                      disabled={processing === payout.id}
                      className="flex-1 lg:flex-none"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      {processing === payout.id ? 'Processing...' : 'Approve'}
                    </BrandButton>
                    <BrandButton
                      variant="outline"
                      onClick={() => {
                        setSelectedPayout(payout);
                        setShowRejectDialog(true);
                      }}
                      disabled={processing === payout.id}
                      className="flex-1 lg:flex-none border-red-500/20 text-red-500 hover:bg-red-500/10"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </BrandButton>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Processed Withdrawals */}
      <div>
        <h3 className="text-xl font-semibold mb-4">Recent History</h3>
        <div className="space-y-3">
          {processedPayouts.slice(0, 10).map((payout) => (
            <Card key={payout.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4" />
                  <div>
                    <p className="font-medium text-sm">{payout.profiles.full_name}</p>
                    <p className="text-xs text-text-secondary">
                      {new Date(payout.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">₦{payout.amount.toLocaleString()}</span>
                  {getStatusBadge(payout.status)}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Reject Dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Withdrawal</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this withdrawal request.
              The funds will be refunded to the user's account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Enter rejection reason..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowRejectDialog(false);
              setRejectionReason('');
              setSelectedPayout(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPayout && handleAction(selectedPayout.id, 'reject')}
              disabled={!rejectionReason.trim() || processing === selectedPayout?.id}
              className="bg-red-500 hover:bg-red-600"
            >
              Reject Withdrawal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
