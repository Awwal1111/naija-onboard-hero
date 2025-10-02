import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trophy, Zap, FileText, User, History, Users, ArrowUpRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import NaijaLanceWalletCard from '@/components/NaijaLanceWalletCard'
import { DailySigninCard } from '@/components/DailySigninCard'
import { TransactionHistory } from '@/components/TransactionHistory'

import { WithdrawalDialog } from '@/components/WithdrawalDialog'

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
    }
  ]


  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto max-w-4xl p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Earn Hub</h1>
          <p className="text-text-secondary">Complete tasks and earn Naijacoins</p>
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