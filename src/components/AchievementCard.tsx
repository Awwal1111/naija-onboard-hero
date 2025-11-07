import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock } from "lucide-react";

interface AchievementCardProps {
  name: string;
  description: string;
  icon: string;
  category: string;
  rewardAmount: number;
  isEarned: boolean;
  earnedAt?: string;
}

export const AchievementCard = ({
  name,
  description,
  icon,
  category,
  rewardAmount,
  isEarned,
  earnedAt,
}: AchievementCardProps) => {
  return (
    <Card
      className={`relative overflow-hidden transition-all ${
        isEarned
          ? "bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border-amber-300"
          : "opacity-50 grayscale"
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={`text-4xl ${
              isEarned ? "animate-bounce" : "opacity-30"
            }`}
          >
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-semibold">{name}</h4>
              {!isEarned && <Lock className="h-4 w-4 text-muted-foreground" />}
            </div>
            <p className="text-sm text-muted-foreground mb-2">{description}</p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {category}
              </Badge>
              {rewardAmount > 0 && (
                <Badge variant="default" className="text-xs bg-green-600">
                  +₦{rewardAmount} NC
                </Badge>
              )}
            </div>
            {isEarned && earnedAt && (
              <p className="text-xs text-muted-foreground mt-2">
                Earned {new Date(earnedAt).toLocaleDateString()}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
