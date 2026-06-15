import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandButton } from '@/components/ui/brand-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Wallet, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserSecrets } from '@/hooks/useUserSecrets';
import { SecurePinInput } from '@/components/SecurePinInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChargeSession {
  session_id: string;
  developer_id: string;
  amount: number;
  currency: string;
  description: string | null;
  status: string;
  metadata: any;
  expires_at: string;
  payer_user_id: string | null;
}

export default function ChargeSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { transactionPin } = useUserSecrets();

  const [session, setSession] = useState<ChargeSession | null>(null);
  const [developerName, setDeveloperName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=/charge/${sessionId}`);
      return;
    }
    if (!sessionId) return;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('developer_charge_sessions')
          .select('session_id, developer_id, amount, currency, description, status, metadata, expires_at, payer_user_id')
          .eq('session_id', sessionId)
          .maybeSingle();
        if (error) throw error;
        if (!data) throw new Error('Session not found');
        setSession(data as ChargeSession);
        if (data.status === 'completed') setCompleted(true);
        const { data: dev } = await supabase
          .from('profiles')
          .select('full_name, username')
          .eq('user_id', data.developer_id)
          .maybeSingle();
        setDeveloperName(dev?.full_name || dev?.username || 'a NaijaLancers developer');
      } catch (e: any) {
        setError(e?.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId, user, authLoading, navigate]);

  const startApprove = () => {
    if (!transactionPin) {
      toast.error('Set a transaction PIN in Settings → Security first');
      return;
    }
    setShowPin(true);
  };

  const handlePin = async (pin: string) => {
    if (pin !== transactionPin) {
      toast.error('Incorrect PIN');
      return;
    }
    setShowPin(false);
    if (!session) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('developer_charge_consume_atomic', {
        p_session_id: session.session_id,
        p_payer_user_id: user!.id,
      });
      if (error) throw error;
      const res: any = data;
      if (!res?.ok) throw new Error(res?.error || 'Charge failed');
      toast.success(`Paid ${session.amount.toLocaleString()} NC`);
      setCompleted(true);
      const successUrl = session.metadata?.success_url;
      if (successUrl) setTimeout(() => { window.location.href = String(successUrl); }, 2000);
    } catch (e: any) {
      toast.error(e?.message || 'Charge failed');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = () => {
    const cancelUrl = session?.metadata?.cancel_url;
    if (cancelUrl) window.location.href = String(cancelUrl);
    else navigate('/');
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }
  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Charge unavailable</CardTitle>
            <CardDescription>{error || 'This charge session does not exist or has expired.'}</CardDescription>
          </CardHeader>
          <CardContent><BrandButton onClick={() => navigate('/')}>Go home</BrandButton></CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(session.expires_at).getTime() < Date.now();
  const balance = Number(profile?.wallet_balance || 0);
  const insufficient = balance < session.amount;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Approve charge</CardTitle>
          <CardDescription>{developerName} is requesting payment from your NaijaLancers wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold text-lg">{Number(session.amount).toLocaleString()} {session.currency}</span>
            </div>
            {session.description && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">For</span>
                <span className="font-medium text-right max-w-[60%]">{session.description}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Your balance</span>
              <span className="font-medium">{balance.toLocaleString()} NC</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{session.status}</span>
            </div>
          </div>

          {isExpired && <Alert variant="destructive"><AlertDescription>This charge has expired.</AlertDescription></Alert>}
          {insufficient && !completed && (
            <Alert variant="destructive"><AlertDescription>Insufficient NC balance. Top up and try again.</AlertDescription></Alert>
          )}

          {completed ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>Payment confirmed. You can close this window.</AlertDescription>
            </Alert>
          ) : (
            <div className="flex gap-2">
              <BrandButton
                onClick={startApprove}
                disabled={submitting || isExpired || insufficient || !transactionPin}
                className="flex-1"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : `Pay ${Number(session.amount).toLocaleString()} NC`}
              </BrandButton>
              <BrandButton variant="outline" onClick={cancel} disabled={submitting}>Cancel</BrandButton>
            </div>
          )}

          {!transactionPin && !completed && (
            <Alert><AlertDescription>You need to set a transaction PIN first. Visit Settings → Security.</AlertDescription></Alert>
          )}

          <p className="text-xs text-muted-foreground text-center">Signed in as {profile?.full_name || user?.email}</p>
        </CardContent>
      </Card>

      {showPin && (
        <SecurePinInput
          onVerified={handlePin}
          onCancel={() => setShowPin(false)}
          title="Confirm payment"
          description={`Enter PIN to pay ${Number(session.amount).toLocaleString()} NC to ${developerName}`}
        />
      )}
    </div>
  );
}
