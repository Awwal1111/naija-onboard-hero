import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, RotateCcw, Target, Brain, Calendar, Trophy, Zap, FileText, User, History, TrendingUp, Users, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import NaijaLanceWalletCard from '@/components/NaijaLanceWalletCard'
import { DailySigninCard } from '@/components/DailySigninCard'
import { TransactionHistory } from '@/components/TransactionHistory'
import NaijaPredictor from '@/components/NaijaPredictor'
import { WithdrawalDialog } from '@/components/WithdrawalDialog'

const EnhancedEarn = () => {
  const { balance, loading } = useWallet()
  const navigate = useNavigate()
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)

  const games = [
    {
      id: 'spin-wheel',
      title: 'Spin Wheel',
      description: 'Spin to win up to NC 100!',
      cost: 'NC 10',
      icon: RotateCcw,
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      maxWin: 'NC 100',
      path: '/earn/spin-wheel'
    },
    {
      id: 'guess-number',
      title: 'Guess Number',
      description: 'Guess the number and win!',
      cost: 'NC 10', 
      icon: Target,
      color: 'bg-gradient-to-br from-orange-500 to-red-500',
      maxWin: 'NC 10',
      path: '/earn/guess-number'
    },
    {
      id: 'trivia',
      title: 'Nigerian Trivia',
      description: '5 questions, win NC 50',
      cost: 'NC 20',
      icon: Brain,
      color: 'bg-gradient-to-br from-green-500 to-emerald-500',
      maxWin: 'NC 50',
      path: '/earn/trivia'
    },
    {
      id: 'predictor',
      title: 'Naija Predictor',
      description: 'Bet on real-world outcomes',
      cost: 'NC 20',
      icon: TrendingUp,
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      maxWin: 'Varies',
      path: '/earn/predictor'
    }
  ]

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
      title: 'Gigs & Services',
      description: 'Offer your professional services',
      icon: User,
      reward: 'Set your own price',
      path: '/jobs'
    }
  ]


  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto max-w-4xl p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Earn Hub</h1>
          <p className="text-text-secondary">Play games, complete tasks, and earn Naijacoins</p>
        </div>

        {/* Wallet Summary with Withdraw Button */}
        <div className="mb-6">
          <NaijaLanceWalletCard balance={balance} />
          <div className="mt-4 flex gap-3">
            <Button
              variant="outline" 
              className="flex-1"
              onClick={() => setShowWithdrawDialog(true)}
            >
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Withdraw
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/activity-log')}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </div>
        </div>

        {/* Daily Sign-In */}
        <DailySigninCard />

        {/* Games Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Games
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {games.map((game) => (
              <Card key={game.id} className="relative overflow-hidden hover:shadow-lg transition-shadow cursor-pointer">
                <div className={`absolute inset-0 ${game.color} opacity-10`} />
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <game.icon className="h-5 w-5 text-primary" />
                    {game.title}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-3">
                  <p className="text-sm text-text-secondary">{game.description}</p>
                  
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-xs">
                      Cost: {game.cost}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      Max: {game.maxWin}
                    </Badge>
                  </div>

                  <Button
                    className="w-full bg-primary hover:bg-primary/90"
                    onClick={() => navigate(game.path)}
                  >
                    Play Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

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

        {/* Naija Predictor Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Naija Predictor
          </h2>
          <NaijaPredictor />
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
    </div>
  )
}

export default EnhancedEarn