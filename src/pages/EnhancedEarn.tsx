import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Zap, FileText, User, History, Users, ArrowUpRight, Phone, Wifi, TrendingUp, Home, MessageCircle, Briefcase, DollarSign, User as UserIcon } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import NaijaLanceWalletCard from '@/components/NaijaLanceWalletCard'
import { DailySigninCard } from '@/components/DailySigninCard'
import { TransactionHistory } from '@/components/TransactionHistory'
import { WithdrawalDialog } from '@/components/WithdrawalDialog'
import { VTUAirtimeDialog } from '@/components/VTUAirtimeDialog'
import { VTUDataDialog } from '@/components/VTUDataDialog'
import { BettingFundDialog } from '@/components/BettingFundDialog'
import TopBannerAd from '@/components/TopBannerAd'

const EnhancedEarn = () => {
  const { balance, loading } = useWallet()
  const navigate = useNavigate()
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [showAirtimeDialog, setShowAirtimeDialog] = useState(false)
  const [showDataDialog, setShowDataDialog] = useState(false)
  const [showBettingDialog, setShowBettingDialog] = useState(false)

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
    { icon: DollarSign, label: 'Earn', path: '/earn', active: true },
    { icon: UserIcon, label: 'Profile', path: '/profile' }
  ]

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
        currentBalance={balance.total}
      />

      {/* VTU Dialogs */}
      <VTUAirtimeDialog
        open={showAirtimeDialog}
        onOpenChange={setShowAirtimeDialog}
        currentBalance={balance.total}
        onSuccess={() => window.location.reload()}
      />
      
      <VTUDataDialog
        open={showDataDialog}
        onOpenChange={setShowDataDialog}
        currentBalance={balance.total}
        onSuccess={() => window.location.reload()}
      />
      
      <BettingFundDialog
        open={showBettingDialog}
        onOpenChange={setShowBettingDialog}
        currentBalance={balance.total}
        onSuccess={() => window.location.reload()}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border">
        <div className="flex justify-around items-center px-4 py-2">
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
      </nav>
    </div>
  )
}

export default EnhancedEarn