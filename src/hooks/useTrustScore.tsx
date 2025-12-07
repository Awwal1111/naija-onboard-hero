import { useMemo } from 'react';

export interface TrustScoreData {
  score: number; // 0-100
  level: 'unverified' | 'basic' | 'trusted' | 'highly_trusted';
  levelLabel: string;
  breakdown: {
    verification: number; // 0-40 points
    reputation: number;   // 0-30 points
    activity: number;     // 0-20 points
    community: number;    // 0-10 points
  };
  details: {
    emailVerified: boolean;
    phoneVerified: boolean;
    faceVerified: boolean;
    averageRating: number;
    ratingCount: number;
    accountAgeDays: number;
    avgResponseTimeSeconds: number;
    connectionsCount: number;
    isExpert: boolean;
  };
}

interface TrustScoreInput {
  emailVerified?: boolean;
  phoneVerified?: boolean;
  faceVerified?: boolean;
  averageRating?: number;
  ratingCount?: number;
  createdAt?: string;
  avgResponseTimeSeconds?: number;
  connectionsCount?: number;
  isExpert?: boolean;
}

export const calculateTrustScore = (input: TrustScoreInput): TrustScoreData => {
  const {
    emailVerified = false,
    phoneVerified = false,
    faceVerified = false,
    averageRating = 0,
    ratingCount = 0,
    createdAt,
    avgResponseTimeSeconds = Infinity,
    connectionsCount = 0,
    isExpert = false,
  } = input;

  // VERIFICATION SCORE (0-40 points)
  let verificationScore = 0;
  if (emailVerified) verificationScore += 10;
  if (phoneVerified) verificationScore += 10;
  if (faceVerified) verificationScore += 20;

  // REPUTATION SCORE (0-30 points)
  let reputationScore = 0;
  if (ratingCount > 0) {
    // Rating component (0-20 points based on average rating 1-5)
    const ratingPoints = Math.min(20, (averageRating / 5) * 20);
    reputationScore += ratingPoints;
    
    // Volume component (0-10 points based on number of ratings)
    const volumePoints = Math.min(10, Math.log10(ratingCount + 1) * 5);
    reputationScore += volumePoints;
  }
  // Expert bonus
  if (isExpert) reputationScore = Math.min(30, reputationScore + 5);

  // ACTIVITY SCORE (0-20 points)
  let activityScore = 0;
  
  // Account age component (0-10 points)
  const accountAgeDays = createdAt 
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  if (accountAgeDays >= 365) activityScore += 10;
  else if (accountAgeDays >= 180) activityScore += 7;
  else if (accountAgeDays >= 90) activityScore += 5;
  else if (accountAgeDays >= 30) activityScore += 3;
  else if (accountAgeDays >= 7) activityScore += 1;

  // Response time component (0-10 points)
  if (avgResponseTimeSeconds < 60) activityScore += 10;
  else if (avgResponseTimeSeconds < 180) activityScore += 8;
  else if (avgResponseTimeSeconds < 600) activityScore += 5;
  else if (avgResponseTimeSeconds < 3600) activityScore += 2;

  // COMMUNITY SCORE (0-10 points)
  let communityScore = 0;
  if (connectionsCount >= 100) communityScore = 10;
  else if (connectionsCount >= 50) communityScore = 8;
  else if (connectionsCount >= 20) communityScore = 6;
  else if (connectionsCount >= 10) communityScore = 4;
  else if (connectionsCount >= 5) communityScore = 2;

  // TOTAL SCORE
  const totalScore = Math.round(verificationScore + reputationScore + activityScore + communityScore);

  // DETERMINE LEVEL
  let level: TrustScoreData['level'];
  let levelLabel: string;
  
  if (totalScore >= 75) {
    level = 'highly_trusted';
    levelLabel = 'Highly Trusted';
  } else if (totalScore >= 50) {
    level = 'trusted';
    levelLabel = 'Trusted';
  } else if (totalScore >= 25) {
    level = 'basic';
    levelLabel = 'Basic';
  } else {
    level = 'unverified';
    levelLabel = 'Unverified';
  }

  return {
    score: totalScore,
    level,
    levelLabel,
    breakdown: {
      verification: Math.round(verificationScore),
      reputation: Math.round(reputationScore),
      activity: Math.round(activityScore),
      community: Math.round(communityScore),
    },
    details: {
      emailVerified,
      phoneVerified,
      faceVerified,
      averageRating,
      ratingCount,
      accountAgeDays,
      avgResponseTimeSeconds,
      connectionsCount,
      isExpert,
    },
  };
};

export const useTrustScore = (input: TrustScoreInput): TrustScoreData => {
  return useMemo(() => calculateTrustScore(input), [
    input.emailVerified,
    input.phoneVerified,
    input.faceVerified,
    input.averageRating,
    input.ratingCount,
    input.createdAt,
    input.avgResponseTimeSeconds,
    input.connectionsCount,
    input.isExpert,
  ]);
};

export default useTrustScore;
