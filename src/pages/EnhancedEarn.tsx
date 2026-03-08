import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Trophy, Zap, FileText, User, History, Users, ArrowUpRight, Phone, Wifi, TrendingUp, Tv, Wallet, Receipt, Coins, PiggyBank } from 'lucide-react'
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
import { BottomNavBar } from '@/components/BottomNavBar'
import { USDTStakingCard } from '@/components/USDTStakingCard'

const EnhancedEarn = () => {
  const { balance, loading } = useWallet()
  const navigate = useNavigate()
  const location = useLocation()
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  
  const [showAirtimeDialog, setShowAirtimeDialog] = useState(false)
  const [showDataDialog, setShowDataDialog] = useState(false)
  const [showBettingDialog, setShowBettingDialog] = useState(false)
  const [showElectricityDialog, setShowElectricityDialog] = useState(false)
  const [showCableTVDialog, setShowCableTVDialog] = useState(false)
  const searchParams = new URLSearchParams(location.search)
  const initialTab = searchParams.get('tab') || 'earn'
  const [activeTab, setActiveTab] = useState(initialTab)

  const earningMethods = [
    {
      title: 'Social Media Tasks',
      description: 'Complete social tasks to earn',
      icon: Zap,
      reward: 'Up to NC 500',
      path: '/earn/social-tasks',
      category: 'tasks'
    },
    {
      title: 'Tasks',
      description: 'Complete or create tasks for rewards',
      icon: Users,
      reward: 'Min 20 NC/slot',
      path: '/tasks',
      category: 'tasks'
    },
    {
      title: 'Surveys',
      description: 'Complete surveys from BitLabs',
      icon: FileText,
      reward: 'Up to NC 1000',
      path: '/surveys',
      category: 'surveys'
    },
    {
      title: 'CPX Research Surveys',
      description: 'Complete surveys from CPX Research',
      icon: FileText,
      reward: 'Up to NC 2000',
      path: '/cpx-surveys',
      category: 'surveys'
    },
    {
      title: 'Gigs & Services',
      description: 'Offer your professional services',
      icon: User,
      reward: 'Set your own price',
      path: '/jobs',
      category: 'services'
    },
    {
      title: 'Read Articles',
      description: 'Read articles and write notes',
      icon: FileText,
      reward: 'Up to NC 200',
      path: '/earn/articles',
      category: 'tasks'
    }
  ]

  const billServices = [
    { title: 'Airtime', icon: Phone, onClick: () => setShowAirtimeDialog(true), color: 'text-green-500' },
    { title: 'Data', icon: Wifi, onClick: () => setShowDataDialog(true), color: 'text-blue-500' },
    { title: 'Bet Funding', icon: TrendingUp, onClick: () => setShowBettingDialog(true), color: 'text-orange-500' },
    { title: 'Electricity', icon: Zap, onClick: () => setShowElectricityDialog(true), color: 'text-yellow-500' },
    { title: 'Cable TV', icon: Tv, onClick: () => setShowCableTVDialog(true), color: 'text-purple-500' },
  ]


  // Group earning methods by category
  const taskMethods = earningMethods.filter(m => m.category === 'tasks')
  const surveyMethods = earningMethods.filter(m => m.category === 'surveys')
  const serviceMethods = earningMethods.filter(m => m.category === 'services')

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto max-w-4xl p-4">
        {/* Compact Header */}
        <div className="text-center py-4 mb-2">
          <h1 className="text-2xl font-bold text-foreground">Earn Hub</h1>
          <p className="text-sm text-muted-foreground">Complete tasks, pay bills, manage wallet</p>
        </div>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="earn" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span>Earn</span>
            </TabsTrigger>
            <TabsTrigger value="bills" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              <span>Bills</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>Wallet</span>
            </TabsTrigger>
          </TabsList>

          {/* EARN TAB */}
          <TabsContent value="earn" className="space-y-6 mt-0">
            {/* USDT Staking Section */}
            <USDTStakingCard />

            {/* Daily Sign-In Streak */}
            <DailySigninCard />

            {/* Tasks Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Tasks</h3>
              <div className="grid grid-cols-1 gap-3">
                {taskMethods.map((method, index) => (
                  <Card key={index} className="hover:bg-accent/50 transition-colors cursor-pointer border-border/50" onClick={() => navigate(method.path)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                          <method.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{method.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{method.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {method.reward}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Surveys Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Surveys</h3>
              <div className="grid grid-cols-1 gap-3">
                {surveyMethods.map((method, index) => (
                  <Card key={index} className="hover:bg-accent/50 transition-colors cursor-pointer border-border/50" onClick={() => navigate(method.path)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                          <method.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{method.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{method.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {method.reward}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>




            {/* Services Section */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Services</h3>
              <div className="grid grid-cols-1 gap-3">
                {serviceMethods.map((method, index) => (
                  <Card key={index} className="hover:bg-accent/50 transition-colors cursor-pointer border-border/50" onClick={() => navigate(method.path)}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0">
                          <method.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground">{method.title}</h3>
                          <p className="text-xs text-muted-foreground truncate">{method.description}</p>
                        </div>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {method.reward}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* BILLS TAB */}
          <TabsContent value="bills" className="space-y-6 mt-0">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">Bill Payments & Services</h3>
                <p className="text-sm text-muted-foreground mb-6">Pay your bills instantly using your NC balance</p>
                
                <div className="grid grid-cols-3 gap-4">
                  {billServices.map((service, index) => (
                    <button
                      key={index}
                      onClick={service.onClick}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent transition-colors border border-border/50"
                    >
                      <div className={`p-3 rounded-full bg-background mb-2 ${service.color}`}>
                        <service.icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{service.title}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Balance View */}
            <Card className="border-border/50 bg-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Available Balance</p>
                    <p className="text-2xl font-bold text-foreground">NC {balance.withdrawable.toLocaleString()}</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setActiveTab('wallet')}>
                    View Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WALLET TAB */}
          <TabsContent value="wallet" className="space-y-6 mt-0">
            {/* Wallet Card */}
            <NaijaLanceWalletCard balance={balance} />
            
            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="default" 
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
                Full History
              </Button>
            </div>

            {/* Transaction History */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Recent Transactions</h3>
              <TransactionHistory />
            </div>
          </TabsContent>
        </Tabs>
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

      <BottomNavBar />
    </div>
  )
}

export default EnhancedEarn
