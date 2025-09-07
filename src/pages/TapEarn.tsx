import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  FileText, 
  GamepadIcon, 
  Users, 
  Coins,
  ChevronRight,
  Trophy,
  Target,
  Share
} from 'lucide-react'
import { toast } from 'sonner'

export const TapEarn = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [loading, setLoading] = useState(false)

  const handleSurveyClick = () => {
    navigate('/surveys')
  }

  const handleGameClick = (gameType: string) => {
    navigate(`/games/${gameType}`)
  }

  const handleReferralClick = () => {
    navigate('/referrals')
  }

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-8">
          <div className="flex items-center justify-center mb-4">
            <Coins className="h-8 w-8 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground">Tap Earn</h1>
          </div>
          <p className="text-muted-foreground">
            Complete tasks and earn rewards!
          </p>
          <div className="bg-primary/10 rounded-lg p-3">
            <p className="text-sm text-primary font-medium">
              Current Balance: ₦{profile.wallet_balance?.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        {/* Earning Options */}
        <div className="space-y-4">
          {/* Surveys Card */}
          <Card className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={handleSurveyClick}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Surveys (BitLabs)</CardTitle>
                    <CardDescription>Complete surveys for rewards</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  Available
                </Badge>
                <p className="text-sm text-muted-foreground">Earn up to ₦500</p>
              </div>
            </CardContent>
          </Card>

          {/* Simple Games Card */}
          <Card className="border-accent/20 hover:border-primary/40 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <GamepadIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">Simple Games</CardTitle>
                  <CardDescription>Play games and earn points</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-between"
                onClick={() => handleGameClick('guess-number')}
              >
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4" />
                  <span>Guess the Number 🎯</span>
                </div>
                <span className="text-sm text-primary">₦10</span>
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between opacity-50 cursor-not-allowed"
                disabled
              >
                <div className="flex items-center space-x-2">
                  <Trophy className="h-4 w-4" />
                  <span>Motorbike Game 🏍️</span>
                </div>
                <span className="text-sm text-muted-foreground">Coming Soon</span>
              </Button>
            </CardContent>
          </Card>

          {/* Referral System Card */}
          <Card className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={handleReferralClick}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-primary/10 p-2 rounded-lg">
                    <Share className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Referral System</CardTitle>
                    <CardDescription>Invite friends and earn rewards</CardDescription>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  ₦100 per referral
                </Badge>
                <p className="text-sm text-muted-foreground">When they earn ₦1000</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Trophy className="h-5 w-5 text-primary" />
              <span>Your Stats</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-xs text-muted-foreground">Surveys Completed</p>
              </div>
              <div className="text-center p-3 bg-primary/5 rounded-lg">
                <p className="text-2xl font-bold text-primary">0</p>
                <p className="text-xs text-muted-foreground">Games Played</p>
              </div>
            </div>
            <Separator />
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Referral Code: <span className="font-mono font-bold text-primary">{profile.referral_code}</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}