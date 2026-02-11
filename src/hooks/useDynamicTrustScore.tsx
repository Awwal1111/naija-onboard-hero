import { useMemo } from 'react';
import { calculateTrustScore, TrustScoreData } from './useTrustScore';

interface ProfileForTrust {
  email_verified?: boolean;
  phone_verified?: boolean;
  face_verified?: boolean;
  identity_verified?: boolean;
  average_rating?: number;
  rating_count?: number;
  created_at?: string;
  avg_response_time_seconds?: number;
  connections_count?: number;
  is_expert?: boolean;
  verification_level?: string;
  risk_score?: number;
}

/**
 * Calculates a dynamic trust score from profile data.
 * This integrates with the identity verification system
 * and adjusts based on AI risk scoring.
 */
export const useDynamicTrustScore = (profile: ProfileForTrust | null): TrustScoreData & { adjustedScore: number } => {
  return useMemo(() => {
    if (!profile) {
      const base = calculateTrustScore({});
      return { ...base, adjustedScore: 0 };
    }

    const base = calculateTrustScore({
      emailVerified: !!(profile as any).email_verified,
      phoneVerified: !!(profile as any).phone_verified,
      faceVerified: !!(profile as any).face_verified,
      averageRating: profile.average_rating || 0,
      ratingCount: profile.rating_count || 0,
      createdAt: profile.created_at,
      avgResponseTimeSeconds: (profile as any).avg_response_time_seconds,
      connectionsCount: profile.connections_count || 0,
      isExpert: profile.is_expert || false,
    });

    // Bonus for identity verification (NIN/BVN)
    let adjustedScore = base.score;
    if ((profile as any).identity_verified) {
      adjustedScore = Math.min(100, adjustedScore + 15);
    }

    // Penalty for high risk score
    const riskScore = (profile as any).risk_score || 0;
    if (riskScore > 50) {
      adjustedScore = Math.max(0, adjustedScore - 20);
    } else if (riskScore > 25) {
      adjustedScore = Math.max(0, adjustedScore - 10);
    }

    // Update level based on adjusted score
    let level = base.level;
    let levelLabel = base.levelLabel;
    if (adjustedScore >= 75) { level = 'highly_trusted'; levelLabel = 'Highly Trusted'; }
    else if (adjustedScore >= 50) { level = 'trusted'; levelLabel = 'Trusted'; }
    else if (adjustedScore >= 25) { level = 'basic'; levelLabel = 'Basic'; }
    else { level = 'unverified'; levelLabel = 'Unverified'; }

    return {
      ...base,
      score: adjustedScore,
      level,
      levelLabel,
      adjustedScore,
      details: {
        ...base.details,
        faceVerified: !!(profile as any).face_verified,
        emailVerified: !!(profile as any).email_verified,
        phoneVerified: !!(profile as any).phone_verified,
      },
    };
  }, [
    (profile as any)?.email_verified,
    (profile as any)?.phone_verified,
    (profile as any)?.face_verified,
    (profile as any)?.identity_verified,
    profile?.average_rating,
    profile?.rating_count,
    profile?.created_at,
    (profile as any)?.avg_response_time_seconds,
    profile?.connections_count,
    profile?.is_expert,
    (profile as any)?.risk_score,
  ]);
};
