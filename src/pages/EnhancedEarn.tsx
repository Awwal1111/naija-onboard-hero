import { useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Zap, FileText, User, Users, ArrowUpRight, Phone, Wifi, TrendingUp, Tv, Wallet, Coins, Clock } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useWallet } from '@/hooks/useWallet'
import { useQueryClient } from '@tanstack/react-query'
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
  const { balance } = useWallet()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  const refreshWallet = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
  }, [queryClient])
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false)
  const [showAirtimeDialog, setShowAirtimeDialog] = useState(false)
  const [showDataDialog, setShowDataDialog] = useState(false)
  const [showBettingDialog, setShowBettingDialog] = useState(false)
  const [showElectricityDialog, setShowElectricityDialog] = useState(false)
  const [showCableTVDialog, setShowCableTVDialog] = useState(false)

  const searchParams = new URLSearchParams(location.search)
  const requestedTab = searchParams.get('tab')
  const initialTab = requestedTab === 'wallet' || requestedTab === 'bills' ? requestedTab : 'earn'
  const [activeTab, setActiveTab] = useState(initialTab)

  const earningMethods = [
    {
      title: 'Referrals',
      description: 'Invite friends and earn ₦50 after profile completion',
      icon: Users,
      reward: '₦50 each',
      path: '/referrals',
      category: 'rewards'
    },
    {
      title: 'Social Media Tasks',
      description: 'Complete social tasks to earn NC rewards',
      icon: Zap,
      reward: 'Up to NC 500',
      path: '/earn/social-tasks',
      category: 'tasks'
    },
    {
      title: 'Community Tasks',
      description: 'Complete or create reward tasks',
      icon: Users,
      reward: 'Min 20 NC/slot',
      path: '/tasks',
      category: 'tasks'
    },
    {
      title: 'Local Media Tasks',
      description: 'Read articles and submit short notes for rewards',
      icon: FileText,
      reward: 'Up to NC 200',
      path: '/earn/articles',
      category: 'tasks'
    },
    {
      title: 'BitLabs Surveys',
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
      description: 'Offer your professional services and earn directly',
      icon: User,
      reward: 'Set your own price',
      path: '/jobs',
      category: 'services'
    }
  ]

  const billServices = [
    { title: 'Airtime', icon: Phone, onClick: () => setShowAirtimeDialog(true), color: 'text-green-500' },
    { title: 'Data', icon: Wifi, onClick: () => setShowDataDialog(true), color: 'text-blue-500' },
    { title: 'Bet Funding', icon: TrendingUp, onClick: () => setShowBettingDialog(true), color: 'text-orange-500' },
    { title: 'Electricity', icon: Zap, onClick: () => setShowElectricityDialog(true), color: 'text-yellow-500' },
    { title: 'Cable TV', icon: Tv, onClick: () => setShowCableTVDialog(true), color: 'text-purple-500' },
  ]

  const rewardMethods = earningMethods.filter((method) => method.category === 'rewards')
  const taskMethods = earningMethods.filter((method) => method.category === 'tasks')
  const surveyMethods = earningMethods.filter((method) => method.category === 'surveys')
  const serviceMethods = earningMethods.filter((method) => method.category === 'services')

  const renderMethodSection = (title: string, methods: typeof earningMethods) => {
    if (methods.length === 0) return null

    return (
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{title}</h3>
        <div className="grid grid-cols-1 gap-3">
          {methods.map((method) => (
            <Card
              key={method.title}
              className="hover:bg-accent/50 transition-colors cursor-pointer border-border/50"
              onClick={() => navigate(method.path)}
            >
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
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto max-w-4xl p-4">
        <div className="text-center py-4 mb-2">
          <h1 className="text-2xl font-bold text-foreground">Earn Hub</h1>
          <p className="text-sm text-muted-foreground">Tasks, surveys, savings and daily rewards in one place</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="earn" className="flex items-center gap-2">
              <Coins className="h-4 w-4" />
              <span>Earn</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              <span>Wallet</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="earn" className="space-y-6 mt-0">
            <DailySigninCard />
            <USDTStakingCard />
            {renderMethodSection('Rewards', rewardMethods)}
            {renderMethodSection('Tasks', taskMethods)}
            {renderMethodSection('Surveys', surveyMethods)}
            {renderMethodSection('Services', serviceMethods)}
          </TabsContent>

          <TabsContent value="bills" className="space-y-6 mt-0">
            <Card className="border-border/50">
              <CardContent className="p-6 space-y-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">Bills & Airtime</h3>
                    <p className="text-sm text-muted-foreground">Opened from Apps so bill services stay separate from your wallet and earn flow.</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/mini-apps')}>
                    Open Apps
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  {billServices.map((service) => (
                    <button
                      key={service.title}
                      onClick={service.onClick}
                      className="flex flex-col items-center justify-center p-4 rounded-xl bg-accent/30 hover:bg-accent transition-colors border border-border/50"
                    >
                      <div className={`p-3 rounded-full bg-background mb-2 ${service.color}`}>
                        <service.icon className="h-6 w-6" />
                      </div>
                      <span className="text-sm font-medium text-foreground text-center">{service.title}</span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

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

          <TabsContent value="wallet" className="space-y-6 mt-0">
            <NaijaLanceWalletCard balance={balance} />

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
                <Clock className="h-4 w-4 mr-2" />
                Full History
              </Button>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Recent Transactions</h3>
              <TransactionHistory />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <WithdrawalDialog
        open={showWithdrawDialog}
        onOpenChange={setShowWithdrawDialog}
        currentBalance={balance.withdrawable}
      />

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