import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandButton } from '@/components/ui/brand-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowDownUp, ExternalLink, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useUserSecrets } from '@/hooks/useUserSecrets';
import { SecurePinInput } from '@/components/SecurePinInput';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const NAIRA_PER_USDT_FALLBACK = 1600;

interface RampSession {
  session_id: string;
  developer_id: string;
  type: 'buy' | 'sell';
  token: string;
  fiat_amount: number | null;
  token_amount: number | null;
  external_user_id: string | null;
  external_user_email: string | null;
  metadata: any;
  status: string;
  naijalancers_user_id: string | null;
  expires_at: string;
}

export default function RampSession() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile } = useProfile();
  const { transactionPin } = useUserSecrets();

  const [session, setSession] = useState<RampSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPinInput, setShowPinInput] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/login?redirect=/ramp/${sessionId}`);
      return;
    }
    if (!sessionId) return;
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, user, authLoading]);

  const loadSession = async () => {
    setLoading(true);
    try {
      const { data, error: invErr } = await supabase.functions.invoke('developer-ramp-session', {
        body: { action: 'get', session_id: sessionId },
      });
      if (invErr) throw invErr;
      if (!data?.session) throw new Error('Session not found');
      setSession(data.session as RampSession);
      if (data.session.status === 'completed') setCompleted(true);
    } catch (e: any) {
      setError(e?.message || 'Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  const startFlow = async () => {
    if (!session) return;
    if (session.type === 'sell') {
      setShowPinInput(true);
      return;
    }
    await proceedToQuidax();
  };

  const handlePin = (pin: string) => {
    if (pin !== transactionPin) {
      toast.error('Incorrect PIN');
      return;
    }
    setShowPinInput(false);
    proceedToQuidax();
  };

  const proceedToQuidax = async () => {
    if (!session || !user) return;
    setSubmitting(true);
    try {
      // Claim
      const { data: claimData, error: claimErr } = await supabase.functions.invoke('developer-ramp-session', {
        body: { action: 'claim', session_id: session.session_id },
      });
      if (claimErr) throw claimErr;
      if (claimData?.error) throw new Error(claimData.error);

      // Get / create wallet
      const { data: profileData } = await supabase
        .from('profiles')
        .select('celo_wallet_address')
        .eq('user_id', user.id)
        .maybeSingle();

      let walletAddress = profileData?.celo_wallet_address || '';
      if (!walletAddress) {
        const { data: walletData, error: walletError } = await supabase.functions.invoke('create-user-wallet');
        if (walletError) throw walletError;
        walletAddress = walletData?.address;
      }
      if (!walletAddress) throw new Error('Failed to prepare wallet');

      // Quidax public key
      const { data: keysData, error: keysErr } = await supabase.functions.invoke('get-quidax-public-key');
      if (keysErr) throw keysErr;
      if (!keysData?.publicKey) throw new Error('Quidax key missing');

      const reference = `${session.session_id}_${Date.now()}`;
      const params = new URLSearchParams();
      params.set('public_key', keysData.publicKey);
      params.set('reference', reference);
      params.set('mode', session.type);
      params.set('network', 'CELO');

      if (session.type === 'buy') {
        params.set('from_currency', 'ngn');
        params.set('to_currency', 'usdt');
        params.set('from_amount', String(session.fiat_amount || 0));
        params.set('address', walletAddress);
      } else {
        const tokenAmt = session.token_amount || Number(((session.fiat_amount || 0) / NAIRA_PER_USDT_FALLBACK).toFixed(6));
        params.set('from_currency', 'usdt');
        params.set('to_currency', 'ngn');
        params.set('from_amount', tokenAmt.toFixed(6));
      }

      // Pre-create transaction
      await supabase.from('quidax_transactions').insert({
        user_id: user.id,
        reference,
        transaction_type: session.type === 'buy' ? 'on_ramp' : 'off_ramp',
        status: 'pending',
        fiat_amount: session.fiat_amount,
        token_amount: session.token_amount,
        token: 'USDT',
        fiat_currency: 'NGN',
        wallet_address: walletAddress,
        quidax_data: { ramp_session_id: session.session_id },
      });

      const url = `https://ramp.quidax.io/?${params.toString()}`;
      window.open(url, '_blank', 'noopener,noreferrer');

      // Mark completed (developer is notified via webhook; final settlement is verified by webhook)
      const { error: completeErr } = await supabase.functions.invoke('developer-ramp-session', {
        body: { action: 'complete', session_id: session.session_id, reference },
      });
      if (completeErr) console.warn('complete error', completeErr);

      setCompleted(true);
      toast.success('Quidax opened in a new tab. Complete payment there.');

      const successUrl = session.metadata?.success_url;
      if (successUrl) {
        setTimeout(() => { window.location.href = String(successUrl); }, 2500);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to start ramp flow');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelFlow = async () => {
    if (!session) return;
    await supabase.functions.invoke('developer-ramp-session', {
      body: { action: 'cancel', session_id: session.session_id },
    });
    const cancelUrl = session.metadata?.cancel_url;
    if (cancelUrl) {
      window.location.href = String(cancelUrl);
    } else {
      navigate('/');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><XCircle className="h-5 w-5 text-destructive" /> Session unavailable</CardTitle>
            <CardDescription>{error || 'This ramp session does not exist or has expired.'}</CardDescription>
          </CardHeader>
          <CardContent>
            <BrandButton onClick={() => navigate('/')}>Go home</BrandButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(session.expires_at).getTime() < Date.now();
  const claimedByOther = session.naijalancers_user_id && session.naijalancers_user_id !== user?.id;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-5 w-5" />
            {session.type === 'buy' ? 'Buy USDT' : 'Sell USDT'}
          </CardTitle>
          <CardDescription>
            Hosted by NaijaLancers on behalf of a partner app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border p-4 space-y-2 bg-muted/30">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Type</span>
              <span className="font-medium capitalize">{session.type}</span>
            </div>
            {session.fiat_amount ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Amount (NGN)</span>
                <span className="font-medium">₦{Number(session.fiat_amount).toLocaleString()}</span>
              </div>
            ) : null}
            {session.token_amount ? (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Token amount</span>
                <span className="font-medium">{Number(session.token_amount).toFixed(6)} {session.token.toUpperCase()}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Network</span>
              <span className="font-medium">CELO</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span className="font-medium capitalize">{session.status}</span>
            </div>
          </div>

          {isExpired && (
            <Alert variant="destructive">
              <AlertDescription>This session has expired. Ask the partner app to start a new one.</AlertDescription>
            </Alert>
          )}

          {claimedByOther && (
            <Alert variant="destructive">
              <AlertDescription>This session is being completed by a different account.</AlertDescription>
            </Alert>
          )}

          {completed ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Quidax has opened in a new tab. Once you finish there, you can close this window.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {session.type === 'sell' && !transactionPin && (
                <Alert>
                  <AlertDescription>You need to set a transaction PIN first. Visit Settings → Security.</AlertDescription>
                </Alert>
              )}
              <div className="flex gap-2">
                <BrandButton
                  onClick={startFlow}
                  disabled={submitting || isExpired || !!claimedByOther || (session.type === 'sell' && !transactionPin)}
                  className="flex-1"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <span className="flex items-center gap-2">
                      Continue on Quidax <ExternalLink className="h-4 w-4" />
                    </span>
                  )}
                </BrandButton>
                <BrandButton variant="outline" onClick={cancelFlow} disabled={submitting}>
                  Cancel
                </BrandButton>
              </div>
            </>
          )}

          <p className="text-xs text-muted-foreground text-center">
            You're signed in as {profile?.full_name || user?.email}.
          </p>
        </CardContent>
      </Card>

      {showPinInput && (
        <SecurePinInput
          isOpen={showPinInput}
          onClose={() => setShowPinInput(false)}
          onPinVerified={handlePin}
          title="Confirm Withdrawal"
          description={`Enter PIN to confirm sell of ${session.token_amount ? session.token_amount.toFixed(6) + ' USDT' : '₦' + Number(session.fiat_amount || 0).toLocaleString()}`}
        />
      )}
    </div>
  );
}
