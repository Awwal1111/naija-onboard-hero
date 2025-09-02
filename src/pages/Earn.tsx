import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  Coins,
  FileText, 
  GamepadIcon, 
  Share,
  Briefcase,
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  Wallet,
  History,
  Home,
  MessageCircle,
  Users,
  DollarSign,
  User,
  TrendingUp
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

export const Earn = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // Only redirect if we're not loading and there's definitely no user
    if (!loading && !user) {
      navigate('/login')
    }
  }, [user, navigate, loading])

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: DollarSign, label: 'Earn', path: '/earn', active: true },
    { icon: User, label: 'Profile', path: '/profile' }
  ]

  const handleSurveyClick = () => {
    navigate('/surveys')
  }

  const handleGameClick = (gameType: string) => {
    navigate(`/games/${gameType}`)
  }

  const handleReferralClick = () => {
    navigate('/referrals')
  }

  const handleSocialMediaTasksClick = () => {
    navigate('/earn/social-tasks')
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center pb-20">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <div className="max-w-md mx-auto">
        {/* Header with Wallet Summary */}
        <div className="bg-card border-b border-border px-6 py-6">
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-2">
              <Wallet className="h-6 w-6 text-primary mr-2" />
              <h1 className="text-xl font-bold text-foreground">Earn Hub</h1>
            </div>
            <p className="text-sm text-muted-foreground">Your financial dashboard</p>
          </div>

          {/* Wallet Balance Card */}
          <Card className="bg-gradient-to-r from-primary to-primary-glow text-white border-0 mb-4">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-white/80 text-sm">Total Balance</p>
                  <p className="text-3xl font-bold">₦{profile.wallet_balance?.toFixed(2) || '0.00'}</p>
                </div>
                <Coins className="h-8 w-8 text-white/80" />
              </div>
              
              <div className="flex gap-3">
                <Button variant="secondary" size="sm" className="flex-1 bg-white/20 text-white hover:bg-white/30 border-white/20">
                  <ArrowDownLeft className="h-4 w-4 mr-2" />
                  Deposit
                </Button>
                <Button variant="secondary" size="sm" className="flex-1 bg-white/20 text-white hover:bg-white/30 border-white/20">
                  <ArrowUpRight className="h-4 w-4 mr-2" />
                  Withdraw
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ways to Earn Grid */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-primary" />
            Ways to Earn
          </h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            {/* Freelance Jobs */}
            <Card className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer" 
                  onClick={() => navigate('/jobs')}>
              <CardContent className="p-4 text-center">
                <div className="bg-primary/10 p-3 rounded-lg mb-3 mx-auto w-fit">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Freelance Jobs</h3>
                <p className="text-xs text-muted-foreground mt-1">Find & complete gigs</p>
              </CardContent>
            </Card>

            {/* Surveys */}
            <Card className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer" 
                  onClick={handleSurveyClick}>
              <CardContent className="p-4 text-center">
                <div className="bg-primary/10 p-3 rounded-lg mb-3 mx-auto w-fit">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Surveys</h3>
                <p className="text-xs text-muted-foreground mt-1">Answer & earn</p>
                <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs mt-2">
                  Up to ₦500
                </Badge>
              </CardContent>
            </Card>

            {/* Games */}
            <Card className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer" 
                  onClick={() => handleGameClick('guess-number')}>
              <CardContent className="p-4 text-center">
                <div className="bg-primary/10 p-3 rounded-lg mb-3 mx-auto w-fit">
                  <GamepadIcon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Games</h3>
                <p className="text-xs text-muted-foreground mt-1">Play & win</p>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800 text-xs mt-2">
                  ₦10 per win
                </Badge>
              </CardContent>
            </Card>

            {/* Referrals */}
            <Card className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer" 
                  onClick={handleReferralClick}>
              <CardContent className="p-4 text-center">
                <div className="bg-primary/10 p-3 rounded-lg mb-3 mx-auto w-fit">
                  <Share className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-sm">Refer & Earn</h3>
                <p className="text-xs text-muted-foreground mt-1">Invite friends</p>
                <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs mt-2">
                  ₦100 each
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Social Media Tasks - New Feature */}
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-purple/5 cursor-pointer mb-6" 
                onClick={handleSocialMediaTasksClick}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-r from-primary to-purple p-2 rounded-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Social Media Tasks</CardTitle>
                    <CardDescription>Earn by liking, following & more</CardDescription>
                  </div>
                </div>
                <Badge className="bg-gradient-to-r from-primary to-purple text-white">
                  NEW
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground">
                Complete social media tasks for brands and influencers. Earn ₦20-100 per task.
              </p>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="border-accent/20 mb-6">
            <CardHeader>
              <CardTitle className="text-lg flex items-center space-x-2">
                <History className="h-5 w-5 text-primary" />
                <span>Your Activity</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <p className="text-xl font-bold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Jobs Done</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <p className="text-xl font-bold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Surveys</p>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <p className="text-xl font-bold text-primary">0</p>
                  <p className="text-xs text-muted-foreground">Referrals</p>
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

          {/* Transaction History Preview */}
          <Card className="border-accent/20">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Recent Transactions</CardTitle>
              <Button variant="ghost" size="sm">View All</Button>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No transactions yet</p>
                <p className="text-xs">Start earning to see your transaction history</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
                item.active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}