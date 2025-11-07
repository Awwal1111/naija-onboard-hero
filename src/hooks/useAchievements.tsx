import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useAchievements = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["achievements", userId],
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");

      // Get all achievements
      const { data: allAchievements, error: achievementsError } = await supabase
        .from("achievements")
        .select("*")
        .order("category");

      if (achievementsError) throw achievementsError;

      // Get user's earned achievements
      const { data: userAchievements, error: userAchievementsError } = await supabase
        .from("user_achievements")
        .select("achievement_id, earned_at")
        .eq("user_id", userId);

      if (userAchievementsError) throw userAchievementsError;

      // Merge data
      const earnedIds = new Set(userAchievements?.map((ua) => ua.achievement_id) || []);
      const earnedMap = new Map(
        userAchievements?.map((ua) => [ua.achievement_id, ua.earned_at]) || []
      );

      const achievements = allAchievements?.map((achievement) => ({
        ...achievement,
        isEarned: earnedIds.has(achievement.id),
        earnedAt: earnedMap.get(achievement.id),
      }));

      return {
        achievements,
        totalAchievements: allAchievements?.length || 0,
        earnedCount: userAchievements?.length || 0,
      };
    },
    enabled: !!userId,
  });
};

export const useCheckAchievements = () => {
  return async (userId: string) => {
    const { error } = await supabase.rpc("check_achievements", {
      p_user_id: userId,
    });
    if (error) console.error("Error checking achievements:", error);
  };
};
