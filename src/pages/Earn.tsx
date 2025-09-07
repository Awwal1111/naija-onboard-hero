import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { WalletCard } from '@/components/WalletCard'
import { TransactionHistory } from '@/components/TransactionHistory'
import { ReferralTaskCard } from '@/components/ReferralTaskCard'
import { useReferralTasks } from '@/hooks/useReferralTasks'
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
  TrendingUp,
  ChevronRight,
  Trophy,
  Target
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

export const Earn = () => {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()

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
    navigate('/earn/referral-tasks')
  }

  const handleSocialMediaTasksClick = () => {
    navigate('/earn/social-tasks')
  }

  if (authLoading || profileLoading || !profile) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <div className="max-w-6xl mx-auto">
        {/* Header Section */}
        <div className="bg-card border-b border-border px-6 py-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Wallet className="h-6 w-6 text-primary mr-2" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Earn Hub</h1>
                <p className="text-sm text-muted-foreground">Your financial dashboard</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Current Time</p>
              <p className="text-lg font-semibold">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            </div>
          </div>

          {/* Wallet Card with integrated functionality */}
          <WalletCard />
        </div>

        {/* Main Content Layout - Main Column + Sidebar */}
        <div className="flex flex-col lg:flex-row gap-6 p-6">
          {/* Main Column */}
          <div className="flex-1 space-y-6">
            {/* Earning Methods Section */}
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center">
                <TrendingUp className="h-6 w-6 mr-2 text-primary" />
                Earning Methods
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Freelance Jobs - Larger Card */}
                <Card className="border-blue-200 bg-blue-50/50 hover:border-blue-400 transition-colors cursor-pointer col-span-full md:col-span-1" 
                      onClick={() => navigate('/jobs')}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="bg-blue-500/10 p-3 rounded-xl">
                        <Briefcase className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-blue-900">Freelance Jobs</h3>
                        <p className="text-sm text-blue-700">Find & complete professional gigs</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200">High Earnings</Badge>
                      <ChevronRight className="h-5 w-5 text-blue-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Surveys */}
                <Card className="border-green-200 bg-green-50/50 hover:border-green-400 transition-colors cursor-pointer" 
                      onClick={handleSurveyClick}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="bg-green-500/10 p-3 rounded-xl">
                        <FileText className="h-8 w-8 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-green-900">Surveys (BitLabs)</h3>
                        <p className="text-sm text-green-700">Complete surveys for rewards</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge className="bg-green-100 text-green-800 border-green-200">Up to ₦500</Badge>
                      <ChevronRight className="h-5 w-5 text-green-600" />
                    </div>
                  </CardContent>
                </Card>

                {/* Refer & Earn */}
                <Card className="border-purple-200 bg-purple-50/50 hover:border-purple-400 transition-colors cursor-pointer col-span-full" 
                      onClick={handleReferralClick}>
                  <CardContent className="p-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="bg-purple-500/10 p-3 rounded-xl">
                        <Share className="h-8 w-8 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-purple-900">Refer & Earn</h3>
                        <p className="text-sm text-purple-700">Invite friends and earn ₦100 each</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200">₦100 per referral</Badge>
                      <ChevronRight className="h-5 w-5 text-purple-600" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Transaction History */}
            <TransactionHistory />

            {/* Recent Transactions Section */}
            <Card className="border-accent/20">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl flex items-center">
                  <History className="h-6 w-6 mr-2 text-primary" />
                  Recent Transactions
                </CardTitle>
                <Button variant="ghost" size="sm" className="text-primary">
                  View All
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                  <p className="text-sm">Start earning to see your transaction history</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="w-full lg:w-80 space-y-6">
            {/* Games Section */}
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-orange-500/10 p-2 rounded-lg">
                    <GamepadIcon className="h-6 w-6 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg text-orange-900">Simple Games</CardTitle>
                    <CardDescription className="text-orange-700">Play & win rewards</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-between border-orange-200 hover:bg-orange-100"
                  onClick={() => handleGameClick('guess-number')}
                >
                  <div className="flex items-center space-x-2">
                    <Target className="h-4 w-4 text-orange-600" />
                    <span>Guess the Number 🎯</span>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">₦10</Badge>
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

            {/* Social Media Tasks Card */}
            <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-purple/5 cursor-pointer" 
                  onClick={handleSocialMediaTasksClick}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gradient-to-r from-primary to-purple p-2 rounded-lg">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Social Media Tasks</CardTitle>
                      <CardDescription>Earn by engaging</CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-primary to-purple text-white">
                    NEW
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  Complete social media tasks for brands and influencers.
                </p>
                <Badge className="bg-primary/10 text-primary">₦20-100 per task</Badge>
              </CardContent>
            </Card>

            {/* Activity Statistics */}
            <Card className="border-accent/20">
              <CardHeader>
                <CardTitle className="text-lg flex items-center space-x-2">
                  <History className="h-5 w-5 text-primary" />
                  <span>Your Activity</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                    <span className="text-sm text-muted-foreground">Jobs Done</span>
                    <span className="text-lg font-bold text-primary">0</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                    <span className="text-sm text-muted-foreground">Surveys</span>
                    <span className="text-lg font-bold text-primary">0</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
                    <span className="text-sm text-muted-foreground">Games Won</span>
                    <span className="text-lg font-bold text-primary">0</span>
                  </div>
                </div>
                <Separator />
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Referral Code</p>
                  <p className="font-mono font-bold text-primary text-sm">{profile?.referral_code || 'Loading...'}</p>
                </div>
              </CardContent>
            </Card>
          </div>
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