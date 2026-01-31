import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Trophy, Crown, Medal, Flame } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface LeaderboardEntry {
  user_id: string;
  full_name: string | null;
  profile_picture_url: string | null;
  referral_count: number;
}

export function ReferralLeaderboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRank, setUserRank] = useState<number | null>(null);

  useEffect(() => {
    fetchLeaderboard();
  }, [user]);

  const fetchLeaderboard = async () => {
    try {
      // Get top referrers with completed referrals
      const { data: referralCounts, error } = await supabase
        .from('referrals')
        .select('referrer_id')
        .eq('status', 'completed');

      if (error) throw error;

      // Count referrals per user
      const countMap = new Map<string, number>();
      referralCounts?.forEach(r => {
        countMap.set(r.referrer_id, (countMap.get(r.referrer_id) || 0) + 1);
      });

      // Get top 10 user IDs
      const sortedUsers = Array.from(countMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

      if (sortedUsers.length === 0) {
        setLoading(false);
        return;
      }

      // Fetch user profiles
      const userIds = sortedUsers.map(u => u[0]);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', userIds);

      // Combine data
      const leaderboard: LeaderboardEntry[] = sortedUsers.map(([userId, count]) => {
        const profile = profiles?.find(p => p.user_id === userId);
        return {
          user_id: userId,
          full_name: profile?.full_name || 'Anonymous',
          profile_picture_url: profile?.profile_picture_url,
          referral_count: count
        };
      });

      setLeaders(leaderboard);

      // Find current user's rank
      if (user) {
        const allUsers = Array.from(countMap.entries())
          .sort((a, b) => b[1] - a[1]);
        const rank = allUsers.findIndex(u => u[0] === user.id);
        if (rank !== -1) {
          setUserRank(rank + 1);
        }
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2:
        return <Medal className="h-5 w-5 text-slate-400" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return <span className="w-5 text-center font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-slate-400/20 to-slate-500/10 border-slate-400/30';
      case 3:
        return 'bg-gradient-to-r from-amber-500/20 to-amber-600/10 border-amber-500/30';
      default:
        return 'hover:bg-accent/50';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </CardContent>
      </Card>
    );
  }

  if (leaders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            Referral Champions
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-6">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Be the first to top the leaderboard!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            Referral Champions
          </CardTitle>
          {userRank && (
            <Badge variant="secondary" className="gap-1">
              <Flame className="h-3 w-3" />
              You: #{userRank}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {leaders.map((leader, idx) => {
          const rank = idx + 1;
          const isCurrentUser = user?.id === leader.user_id;
          
          return (
            <div
              key={leader.user_id}
              onClick={() => navigate(`/profile/${leader.user_id}`)}
              className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border ${getRankBg(rank)} ${
                isCurrentUser ? 'ring-2 ring-primary/50' : ''
              }`}
            >
              <div className="w-8 flex justify-center">
                {getRankIcon(rank)}
              </div>
              
              <Avatar className="h-10 w-10 border-2 border-background">
                <AvatarImage src={leader.profile_picture_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold">
                  {leader.full_name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {leader.full_name}
                  {isCurrentUser && <span className="text-primary ml-1">(You)</span>}
                </p>
              </div>
              
              <Badge variant="outline" className="bg-background">
                {leader.referral_count} referrals
              </Badge>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
