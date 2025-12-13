import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Gift, Check, Calendar, Flame, Zap } from 'lucide-react'
import { useDailySignin } from '@/hooks/useDailySignin'

export const DailySigninCard = () => {
  const { hasSignedInToday, loading, claiming, currentStreak, nextReward, claimDailyBonus, getStreakReward } = useDailySignin()

  if (loading) {
    return (
      <Card className="border-accent/20">
        <CardHeader className="pb-3">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    )
  }

  // Streak day indicators
  const streakDays = [1, 2, 3, 4, 5, 6, 7]

  return (
    <Card className="border-accent/20 bg-gradient-to-r from-primary/5 to-secondary/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flame className="h-5 w-5 text-orange-500" />
            <CardTitle className="text-base">Daily Streak</CardTitle>
          </div>
          {currentStreak > 0 && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
              <Flame className="h-3 w-3 mr-1" />
              {currentStreak} day{currentStreak > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">
          Sign in daily for increasing rewards! Streak resets after 7 days.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-0 space-y-4">
        {/* Streak Progress */}
        <div className="flex justify-between gap-1">
          {streakDays.map((day) => {
            const isCompleted = hasSignedInToday ? day <= currentStreak : day < currentStreak
            const isCurrent = hasSignedInToday ? day === currentStreak : day === currentStreak + 1
            const reward = getStreakReward(day)
            
            return (
              <div 
                key={day} 
                className={`flex-1 flex flex-col items-center p-1.5 rounded-lg transition-all ${
                  isCompleted 
                    ? 'bg-green-500/20 border border-green-500/30' 
                    : isCurrent && !hasSignedInToday
                      ? 'bg-primary/20 border border-primary/50 animate-pulse'
                      : 'bg-muted/30 border border-border/50'
                }`}
              >
                <span className={`text-[10px] font-medium ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  Day {day}
                </span>
                <div className={`my-1 ${isCompleted ? 'text-green-500' : isCurrent && !hasSignedInToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : day === 7 ? (
                    <Flame className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Gift className="h-4 w-4" />
                  )}
                </div>
                <span className={`text-[9px] font-bold ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`}>
                  {reward}NC
                </span>
              </div>
            )
          })}
        </div>

        {/* Action Button */}
        {hasSignedInToday ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center space-x-2 text-green-600 dark:text-green-400 bg-green-500/10 p-3 rounded-lg">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Claimed today! +{getStreakReward(currentStreak)} NC</span>
            </div>
            <div className="flex items-center justify-center space-x-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">
                Come back tomorrow for {nextReward} NC
              </span>
            </div>
          </div>
        ) : (
          <Button 
            onClick={claimDailyBonus}
            disabled={claiming}
            className="w-full bg-gradient-to-r from-orange-500 to-primary hover:from-orange-600 hover:to-primary/90"
            size="lg"
          >
            {claiming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Claiming...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Claim Day {currentStreak + 1} Bonus ({nextReward} NC)
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
