import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Zap, FileText, User, History, Users, ArrowUpRight, Wifi, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import NaijaLanceWalletCard from '@/components/NaijaLanceWalletCard'
import { DailySigninCard } from '@/components/DailySigninCard'
import { TransactionHistory } from '@/components/TransactionHistory'
import { WithdrawalDialog } from '@/components/WithdrawalDialog'
import TopBannerAd from '@/components/TopBannerAd'

const EnhancedEarn = () => {
  const { balance, loading } = useWallet()
  const navigate = useNavigate()
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)

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
                disabled
              >
                <Wifi className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs">Data</span>
              </Button>
              <Button
                variant="outline"
                className="flex flex-col items-center justify-center h-20 gap-2"
                disabled
              >
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
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
    </div>
  )
}

export default EnhancedEarn