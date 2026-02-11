import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export type VerificationLevel = 'none' | 'basic' | 'verified' | 'fully_verified';

export interface VerificationStatus {
  level: VerificationLevel;
  emailVerified: boolean;
  phoneVerified: boolean;
  faceVerified: boolean;
  identityVerified: boolean;
  verificationCountry: string;
  riskScore: number;
}

export interface ActionCheckResult {
  allowed: boolean;
  userLevel: VerificationLevel;
  requiredLevel?: VerificationLevel;
  message?: string;
}

const LEVEL_ORDER: Record<string, number> = {
  none: 0,
  basic: 1,
  verified: 2,
  fully_verified: 3,
};

export const useVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [identityData, setIdentityData] = useState<any>(null);

  const fetchStatus = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email_verified, phone_verified, face_verified, identity_verified, verification_level, verification_country, risk_score')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setStatus({
          level: ((profile as any).verification_level || 'none') as VerificationLevel,
          emailVerified: !!(profile as any).email_verified,
          phoneVerified: !!(profile as any).phone_verified,
          faceVerified: !!(profile as any).face_verified,
          identityVerified: !!(profile as any).identity_verified,
          verificationCountry: (profile as any).verification_country || 'NG',
          riskScore: (profile as any).risk_score || 0,
        });
      }

      // Fetch identity verification data
      const { data: idData } = await supabase
        .from('identity_verifications')
        .select('verification_type, status, id_number_last4, verified_first_name, verified_last_name, verified_at, ai_risk_score')
        .eq('user_id', user.id)
        .single();

      if (idData) {
        setIdentityData(idData);
      }
    } catch (error) {
      console.error('Error fetching verification status:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const checkAction = useCallback(
    (action: string): ActionCheckResult => {
      if (!status) {
        return { allowed: false, userLevel: 'none', message: 'Loading verification status...' };
      }

      // Local action requirements (mirrors DB but avoids extra query)
      const requirements: Record<string, VerificationLevel> = {
        view_phone: 'verified',
        view_email: 'basic',
        send_message: 'basic',
        make_call: 'verified',
        accept_physical_job: 'fully_verified',
        withdraw_funds: 'verified',
        large_transfer: 'fully_verified',
      };

      const required = requirements[action];
      if (!required) return { allowed: true, userLevel: status.level };

      const userRank = LEVEL_ORDER[status.level] || 0;
      const requiredRank = LEVEL_ORDER[required] || 0;

      if (userRank >= requiredRank) {
        return { allowed: true, userLevel: status.level };
      }

      return {
        allowed: false,
        userLevel: status.level,
        requiredLevel: required,
        message: `You need ${required.replace('_', ' ')} verification to perform this action. Complete your verification in Settings.`,
      };
    },
    [status]
  );

  const requireAction = useCallback(
    (action: string, actionLabel?: string): boolean => {
      const result = checkAction(action);
      if (!result.allowed) {
        toast({
          title: 'Verification Required',
          description: result.message || `Complete verification to ${actionLabel || action}`,
          variant: 'destructive',
        });
        return false;
      }
      return true;
    },
    [checkAction, toast]
  );

  return {
    status,
    loading,
    identityData,
    checkAction,
    requireAction,
    refetch: fetchStatus,
  };
};
