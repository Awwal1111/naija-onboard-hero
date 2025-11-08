import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trophy, Medal, Award } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const Leaderboard = () => {
  const [period, setPeriod] = useState<"all_time" | "monthly" | "weekly">("all_time");
  const navigate = useNavigate();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ["leaderboard", period],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_leaderboard", {
        p_period: period,
        p_limit: 50,
      });
      if (error) throw error;
      return data;
    },
  });

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="h-6 w-6 text-amber-500" />;
    if (rank === 2) return <Medal className="h-6 w-6 text-gray-400" />;
    if (rank === 3) return <Medal className="h-6 w-6 text-amber-700" />;
    return <Award className="h-5 w-5 text-muted-foreground" />;
  };

  return (
    <ResponsiveLayout>
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-amber-500" />
            Leaderboard
          </h1>
        </div>

        <Tabs value={period} onValueChange={(v) => setPeriod(v as any)}>
          <TabsList className="w-full">
            <TabsTrigger value="all_time" className="flex-1">All Time</TabsTrigger>
            <TabsTrigger value="monthly" className="flex-1">This Month</TabsTrigger>
            <TabsTrigger value="weekly" className="flex-1">This Week</TabsTrigger>
          </TabsList>

          <TabsContent value={period} className="space-y-3 mt-6">
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">Loading...</div>
            ) : leaderboard && leaderboard.length > 0 ? (
              leaderboard.map((user: any) => (
                <Card
                  key={user.user_id}
                  className={`cursor-pointer hover:shadow-lg transition-all ${
                    user.rank <= 3 ? "border-2 border-amber-500" : ""
                  }`}
                  onClick={() => navigate(`/profile/${user.user_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        {getRankIcon(user.rank)}
                        <span className="text-2xl font-bold text-muted-foreground">
                          #{user.rank}
                        </span>
                      </div>

                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.profile_picture} />
                        <AvatarFallback>{user.full_name?.[0]}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <h3 className="font-semibold">{user.full_name}</h3>
                        <div className="flex items-center gap-3 mt-1">
                          <Badge className="bg-green-600">
                            ₦{Number(user.total_earnings).toLocaleString()}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {user.tasks_completed} tasks completed
                          </span>
                        </div>
                      </div>

                      {user.rank <= 3 && (
                        <div className="text-right">
                          {user.rank === 1 && (
                            <Badge className="bg-amber-500">🏆 Champion</Badge>
                          )}
                          {user.rank === 2 && (
                            <Badge className="bg-gray-400">🥈 Runner-up</Badge>
                          )}
                          {user.rank === 3 && (
                            <Badge className="bg-amber-700">🥉 Third Place</Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No leaderboard data yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default Leaderboard;
