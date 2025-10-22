import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Zap, FileText, User, History, Users, ArrowUpRight, Phone, Wifi, TrendingUp, Home, MessageCircle, Briefcase, DollarSign, Menu, Tv } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import NaijaLanceWalletCard from '@/components/NaijaLanceWalletCard'
import { DailySigninCard } from '@/components/DailySigninCard'
import { TransactionHistory } from '@/components/TransactionHistory'
import { WithdrawalDialog } from '@/components/WithdrawalDialog'
import { VTUAirtimeDialog } from '@/components/VTUAirtimeDialog'
import { VTUDataDialog } from '@/components/VTUDataDialog'
import { BettingFundDialog } from '@/components/BettingFundDialog'
import { VTUElectricityDialog } from '@/components/VTUElectricityDialog'
import { VTUCableTVDialog } from '@/components/VTUCableTVDialog'
import TopBannerAd from '@/components/TopBannerAd'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'
import { useDailySignin } from '@/hooks/useDailySignin'
import { useProfile } from '@/hooks/useProfile'

const EnhancedEarn = () => {
  const { balance, loading } = useWallet()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useProfile()
  const { hasSignedInToday, claimDailyBonus, loading: signinLoading } = useDailySignin()
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [activeSection, setActiveSection] = useState<string>('wallet')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [showAirtimeDialog, setShowAirtimeDialog] = useState(false)
  const [showDataDialog, setShowDataDialog] = useState(false)
  const [showBettingDialog, setShowBettingDialog] = useState(false)
  const [showElectricityDialog, setShowElectricityDialog] = useState(false)
  const [showCableTVDialog, setShowCableTVDialog] = useState(false)
  const [showMoreServices, setShowMoreServices] = useState(false)

  const earningMethods = [
    {
      title: 'Social Media Tasks',
      description: 'Complete social tasks to earn',
      icon: Zap,
      reward: 'Up to NC 500',
      path: '/earn/social-tasks'
    },
    {
      title: 'Referral Tasks',
      description: 'Complete referral tasks for rewards',
      icon: Users,
      reward: 'Varies by task',
      path: '/earn/referral-tasks'
    },
    {
      title: 'Referral Program', 
      description: 'Invite friends and earn',
      icon: Trophy,
      reward: 'NC 100 per referral',
      path: '/referrals'
    },
    {
      title: 'Surveys',
      description: 'Complete surveys from BitLabs',
      icon: FileText,
      reward: 'Up to NC 1000',
      path: '/surveys'
    },
    {
      title: 'CPX Research Surveys',
      description: 'Complete surveys from CPX Research',
      icon: FileText,
      reward: 'Up to NC 2000',
      path: '/cpx-surveys'
    },
    {
      title: 'Gigs & Services',
      description: 'Offer your professional services',
      icon: User,
      reward: 'Set your own price',
      path: '/jobs'
    },
    {
      title: 'Read Articles',
      description: 'Read articles and write notes',
      icon: FileText,
      reward: 'Up to NC 200',
      path: '/earn/articles'
    },
    {
      title: 'Guess Number Game',
      description: 'Guess the number and win',
      icon: Trophy,
      reward: 'Win NC 10',
      path: '/earn/guess-number'
    },
    {
      title: 'Nigerian Trivia',
      description: 'Test your Nigerian knowledge',
      icon: Trophy,
      reward: 'Win NC 50',
      path: '/earn/trivia'
    },
    {
      title: 'Spin Wheel',
      description: 'Spin the wheel for prizes',
      icon: Trophy,
      reward: 'Up to NC 100',
      path: '/earn/spin-wheel'
    },
    {
      title: 'Naija Predictor',
      description: 'Predict outcomes and win',
      icon: Trophy,
      reward: 'Win from pool',
      path: '/earn/predictor'
    }
  ]

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn' }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Top Ad Banner */}
      <TopBannerAd />
      
      <div className="container mx-auto max-w-4xl p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Earn Hub</h1>
          <p className="text-text-secondary">Complete tasks and earn Naijacoins</p>
        </div>

        {/* Wallet Summary with Action Buttons */}
        <div className="mb-6">
          <NaijaLanceWalletCard balance={balance} />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Button
              variant="outline" 
              className="w-full"
              onClick={() => setShowWithdrawDialog(true)}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate('/activity-log')}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
          
          {/* Bill Payment Options */}
          <div className="mt-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Bill Payments & Services
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-20 gap-2"
                onClick={() => setShowAirtimeDialog(true)}
              >
                <Phone className="h-5 w-5 text-primary" />
                <span className="text-xs">Airtime</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-20 gap-2"
                onClick={() => setShowDataDialog(true)}
              >
                <Wifi className="h-5 w-5 text-primary" />
                <span className="text-xs">Data</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-20 gap-2"
                onClick={() => setShowBettingDialog(true)}
              >
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-xs">Bet Fund</span>
              </Button>
            </div>

            {/* View More Button */}
            <Button
              variant="ghost"
              className="w-full mt-2 text-primary"
              onClick={() => setShowMoreServices(!showMoreServices)}
            >
              {showMoreServices ? 'Show Less' : 'View More Services'}
            </Button>

            {/* More Services */}
            {showMoreServices && (
              <div className="grid grid-cols-3 gap-3 mt-3">
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-20 gap-2"
                  onClick={() => setShowElectricityDialog(true)}
                >
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="text-xs">Electricity</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center justify-center h-20 gap-2"
                  onClick={() => setShowCableTVDialog(true)}
                >
                  <Tv className="h-5 w-5 text-primary" />
                  <span className="text-xs">Cable TV</span>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Daily Sign-In */}
        <DailySigninCard />

        {/* Earning Methods */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-primary" />
            Earning Methods
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {earningMethods.map((method, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => navigate(method.path)}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <method.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{method.title}</h3>
                      <p className="text-sm text-text-secondary">{method.description}</p>
                      <Badge variant="secondary" className="text-xs mt-2">
                        {method.reward}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Transaction History */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <History className="h-5 w-5 text-primary" />
            Recent Transactions
          </h2>
          <TransactionHistory />
        </div>
      </div>

      {/* Withdrawal Dialog */}
      <WithdrawalDialog 
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        currentBalance={balance.withdrawable}
      />

      {/* VTU Dialogs */}
      <VTUAirtimeDialog
        open={showAirtimeDialog}
        onOpenChange={setShowAirtimeDialog}
        currentBalance={balance.withdrawable}
        onSuccess={() => window.location.reload()}
      />
      
      <VTUDataDialog
        open={showDataDialog}
        onOpenChange={setShowDataDialog}
        currentBalance={balance.withdrawable}
        onSuccess={() => window.location.reload()}
      />
      
      <BettingFundDialog
        open={showBettingDialog}
        onOpenChange={setShowBettingDialog}
        currentBalance={balance.withdrawable}
        onSuccess={() => window.location.reload()}
      />
      
      <VTUElectricityDialog
        open={showElectricityDialog}
        onOpenChange={setShowElectricityDialog}
        currentBalance={balance.withdrawable}
        onSuccess={() => window.location.reload()}
      />
      
      <VTUCableTVDialog
        open={showCableTVDialog}
        onOpenChange={setShowCableTVDialog}
        currentBalance={balance.withdrawable}
        onSuccess={() => window.location.reload()}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex justify-around items-center px-1 sm:px-4 py-1.5 sm:py-2 max-w-md mx-auto">
          {bottomNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors ${
                location.pathname === item.path
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors text-text-secondary hover:text-primary hover:bg-primary/5"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-[10px] sm:text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
      <MoreMenuDrawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />
    </div>
  )
}

export default EnhancedEarn