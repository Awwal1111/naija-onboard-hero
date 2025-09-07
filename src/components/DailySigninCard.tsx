import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Gift, Check, Calendar } from 'lucide-react'
import { useDailySignin } from '@/hooks/useDailySignin'

export const DailySigninCard = () => {
  const { hasSignedInToday, loading, claiming, claimDailyBonus } = useDailySignin()

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

  return (
    <Card className="border-accent/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gift className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Daily Sign-In Bonus</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            ₦5
          </Badge>
        </div>
        <CardDescription>
          Sign in daily to earn ₦5 bonus - claim once per day!
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {hasSignedInToday ? (
          <div className="space-y-3">
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="h-4 w-4" />
              <span className="text-sm font-medium">Already claimed today!</span>
            </div>
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span className="text-sm">Come back tomorrow to claim again</span>
            </div>
          </div>
        ) : (
          <Button 
            onClick={claimDailyBonus}
            disabled={claiming}
            className="w-full bg-gradient-primary hover:bg-gradient-primary/90"
          >
            {claiming ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Claiming...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Claim ₦5 Daily Bonus
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}