import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { Trophy, Zap } from "lucide-react";

interface LevelBadgeProps {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  size?: "sm" | "md" | "lg";
  showProgress?: boolean;
}

export const LevelBadge = ({
  level,
  currentXP,
  nextLevelXP,
  size = "md",
  showProgress = true,
}: LevelBadgeProps) => {
  const progress = (currentXP / nextLevelXP) * 100;

  const sizeClasses = {
    sm: "h-8 w-8 text-xs",
    md: "h-12 w-12 text-sm",
    lg: "h-16 w-16 text-base",
  };

  if (!showProgress) {
    return (
      <div
        className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-bold text-white shadow-lg`}
      >
        {level}
      </div>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center gap-3">
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center font-bold text-white shadow-lg`}
        >
          {level}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-semibold flex items-center gap-1">
              <Trophy className="h-4 w-4 text-amber-600" />
              Level {level}
            </span>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Zap className="h-3 w-3" />
              {currentXP}/{nextLevelXP} XP
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>
    </Card>
  );
};
