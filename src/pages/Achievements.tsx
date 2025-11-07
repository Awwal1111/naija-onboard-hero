import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AchievementCard } from "@/components/AchievementCard";
import { LevelBadge } from "@/components/LevelBadge";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useAchievements } from "@/hooks/useAchievements";
import { Trophy, Target } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const Achievements = () => {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const { data } = useAchievements(user?.id);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { value: "all", label: "All" },
    { value: "tasks", label: "Tasks" },
    { value: "social", label: "Social" },
    { value: "jobs", label: "Jobs" },
    { value: "earnings", label: "Earnings" },
    { value: "referrals", label: "Referrals" },
    { value: "streak", label: "Streaks" },
    { value: "special", label: "Special" },
  ];

  const filteredAchievements =
    selectedCategory === "all"
      ? data?.achievements
      : data?.achievements?.filter((a) => a.category === selectedCategory);

  const completionPercentage = data?.totalAchievements
    ? (data.earnedCount / data.totalAchievements) * 100
    : 0;

  return (
    <ResponsiveLayout>
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-amber-600" />
            Achievements
          </h1>
        </div>

        {profile && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <LevelBadge
              level={profile.user_level || 1}
              currentXP={profile.experience_points || 0}
              nextLevelXP={profile.next_level_xp || 100}
              showProgress={true}
            />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Achievements Earned</span>
                    <span className="font-semibold">
                      {data?.earnedCount || 0}/{data?.totalAchievements || 0}
                    </span>
                  </div>
                  <Progress value={completionPercentage} />
                  <p className="text-xs text-muted-foreground">
                    {Math.round(completionPercentage)}% Complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full justify-start overflow-x-auto flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.value} value={cat.value}>
                {cat.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedCategory} className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAchievements?.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  name={achievement.name}
                  description={achievement.description}
                  icon={achievement.icon || "🏆"}
                  category={achievement.category}
                  rewardAmount={achievement.reward_amount}
                  isEarned={achievement.isEarned}
                  earnedAt={achievement.earnedAt}
                />
              ))}
            </div>

            {filteredAchievements?.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No achievements in this category yet.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
};

export default Achievements;
