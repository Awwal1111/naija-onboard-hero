import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useProfile } from '@/hooks/useProfile';

/**
 * Central premium gate + free-tier quota enforcement.
 *
 * Free-tier limits (premium = unlimited or higher):
 *   chat_send     : 20 / 24h   (premium: unlimited)
 *   ai_use        : 3  / 24h   (premium: unlimited)
 *   edit_action   : 1  / 24h   (premium: unlimited)
 *   platform_msg  : 10 / 30d   (premium: 40 / 30d)
 */
export function usePremiumGate() {
  const { profile } = useProfile();
  const navigate = useNavigate();

  const isPremium = Boolean(
    profile?.is_premium &&
      (!profile?.premium_expires_at ||
        new Date(profile.premium_expires_at).getTime() > Date.now())
  );

  const upsell = useCallback(
    (reason: string) => {
      toast.error(reason, {
        action: { label: 'Upgrade', onClick: () => navigate('/premium') },
        duration: 6000,
      });
    },
    [navigate]
  );

  /**
   * Increment counter then enforce limit. Returns true if allowed.
   * Premium users always pass without incrementing.
   */
  const enforce = useCallback(
    async (
      key: string,
      freeLimit: number,
      windowHours: number,
      label: string,
      premiumLimit?: number
    ): Promise<boolean> => {
      const limit = isPremium ? premiumLimit ?? Infinity : freeLimit;
      if (limit === Infinity) return true;

      try {
        const { data, error } = await supabase.rpc('increment_usage', {
          _key: key,
          _window_hours: windowHours,
        });
        if (error) {
          console.warn('[premium-gate] rpc error, fail-open:', error.message);
          return true;
        }
        const count = (data as number) ?? 0;
        if (count > limit) {
          upsell(
            `Free limit reached: ${label} (${limit} per ${
              windowHours >= 24 ? `${Math.round(windowHours / 24)}d` : `${windowHours}h`
            }). Upgrade to Premium for ${
              premiumLimit ? `${premiumLimit}` : 'unlimited'
            }.`
          );
          return false;
        }
        return true;
      } catch (e) {
        console.warn('[premium-gate] exception, fail-open', e);
        return true;
      }
    },
    [isPremium, upsell]
  );

  /** Check current usage without incrementing (best-effort). */
  const checkOnly = useCallback(
    async (key: string, freeLimit: number, windowHours: number) => {
      if (isPremium) return { count: 0, blocked: false };
      const { data } = await supabase
        .from('usage_counters')
        .select('count, window_start')
        .eq('key', key)
        .maybeSingle();
      if (!data) return { count: 0, blocked: false };
      const expired =
        new Date(data.window_start).getTime() <
        Date.now() - windowHours * 3600_000;
      const count = expired ? 0 : data.count;
      return { count, blocked: count >= freeLimit };
    },
    [isPremium]
  );

  const requirePremium = useCallback(
    (label: string) => {
      if (isPremium) return true;
      upsell(`${label} is a Premium feature.`);
      return false;
    },
    [isPremium, upsell]
  );

  return { isPremium, enforce, checkOnly, requirePremium, upsell };
}
