import { useState, useEffect, lazy, Suspense, useMemo } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Search, Plus, Sparkles, Receipt, Building2, Wallet, Shield, RefreshCw, Trophy, Heart, GraduationCap, Users, Gamepad2, Dices, Target, RotateCw, Gift, Banknote, AlertCircle, ShoppingBag, PiggyBank, Flame, FileText, Zap, BookOpen, Send } from 'lucide-react'
import { useUserCountry } from '@/hooks/useUserCountry'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SubmitMiniAppForm } from '@/components/miniapps/SubmitMiniAppForm'
import { MiniAppViewer } from '@/components/miniapps/MiniAppViewer'
import { MiniAppWebhookSettings } from '@/components/miniapps/MiniAppWebhookSettings'
import { BottomNavBar } from '@/components/BottomNavBar'
import { motion } from 'framer-motion'

const DepositDialog = lazy(() => import('@/components/DepositDialog').then(m => ({ default: m.DepositDialog })))
const EscrowSearchDialog = lazy(() => import('@/components/EscrowSearchDialog').then(m => ({ default: m.EscrowSearchDialog })))
const NCConverterDialog = lazy(() => import('@/components/miniapps/NCConverterDialog').then(m => ({ default: m.NCConverterDialog })))
const TransferDialog = lazy(() => import('@/components/TransferDialog').then(m => ({ default: m.TransferDialog })))

interface MiniApp {
  id: string
  app_name: string
  app_description: string
  app_icon_url: string | null
  app_url: string
  category: string
  install_count: number
  rating: number
  review_count: number
  sdk_app_id: string
  developer_id: string
  status: string
}

interface UnifiedApp {
  id: string
  name: string
  description: string
  icon?: typeof Trophy
  iconUrl?: string | null
  path?: string
  category: string
  color?: string
  isInternal?: boolean
  miniApp?: MiniApp
  internalAction?: string
}

// All built-in apps (platform features + internal mini apps)
const BUILT_IN_APPS: UnifiedApp[] = [
  // Work
  { id: 'pa-contests', name: 'Contests', description: 'Compete for prizes or run design contests', icon: Trophy, path: '/contests', category: 'work', color: 'from-amber-500/20 to-yellow-500/20', isInternal: true },
  { id: 'pa-products', name: 'Sell Products', description: 'Sell digital products and templates', icon: ShoppingBag, path: '/digital-products', category: 'work', color: 'from-green-500/20 to-emerald-500/20', isInternal: true },
  // Finance
  { id: 'pa-fundraising', name: 'Fundraising', description: 'Create or support fundraising campaigns', icon: Heart, path: '/fundraising', category: 'finance', color: 'from-rose-500/20 to-pink-500/20', isInternal: true },
  { id: 'pa-donations', name: 'Donations', description: 'Support the platform with donations', icon: Gift, path: '/donations', category: 'finance', color: 'from-pink-500/20 to-rose-500/20', isInternal: true },
  { id: 'pa-loan', name: 'Loan Services', description: 'Access quick loans via partners', icon: Banknote, path: '/loan', category: 'finance', color: 'from-indigo-500/20 to-purple-500/20', isInternal: true },
  { id: 'pa-emergency', name: 'Emergency Fund', description: 'Request emergency financial assistance', icon: AlertCircle, path: '/emergency', category: 'finance', color: 'from-amber-500/20 to-orange-500/20', isInternal: true },
  { id: 'int-bills', name: 'Bills & Airtime', description: 'Pay bills, buy airtime & data', icon: Receipt, category: 'finance', color: 'from-primary/20 to-accent/20', isInternal: true, internalAction: 'bills' },
  { id: 'int-bank', name: 'Deposit', description: 'Deposit via bank or Naira', icon: Building2, category: 'finance', color: 'from-primary/20 to-accent/20', isInternal: true, internalAction: 'bank_deposit' },
  { id: 'int-bank-withdraw', name: 'Withdraw', description: 'Withdraw to your bank with Quidax', icon: Banknote, category: 'finance', color: 'from-primary/20 to-accent/20', isInternal: true, internalAction: 'bank_withdrawal' },
  { id: 'int-crypto', name: 'Crypto Deposit', description: 'Deposit via crypto wallet', icon: Wallet, category: 'finance', color: 'from-primary/20 to-accent/20', isInternal: true, internalAction: 'crypto_deposit' },
  { id: 'int-metamask', name: 'MetaMask Deposit', description: 'Deposit cUSD or USDT from MetaMask', icon: Wallet, category: 'finance', color: 'from-orange-500/20 to-amber-500/20', isInternal: true, internalAction: 'metamask_deposit' },
  { id: 'int-ivorypay', name: 'IvoryPay Deposit', description: 'Pay via bank or crypto across Africa', icon: Wallet, category: 'finance', color: 'from-amber-500/20 to-yellow-500/20', isInternal: true, internalAction: 'ivorypay_deposit' },
  { id: 'int-escrow', name: 'Escrow', description: 'Secure escrow payments', icon: Shield, category: 'finance', color: 'from-primary/20 to-accent/20', isInternal: true, internalAction: 'escrow' },
  { id: 'int-escrowhubs', name: 'EscrowHubs (On-chain)', description: 'Non-custodial cUSD escrow on Celo with AI arbitration', icon: Shield, category: 'finance', color: 'from-emerald-500/20 to-teal-500/20', isInternal: true, internalAction: 'escrowhubs' },
  { id: 'int-converter', name: 'NC Converter', description: 'Convert non-withdrawable to withdrawable NC', icon: RefreshCw, category: 'finance', color: 'from-primary/20 to-accent/20', isInternal: true, internalAction: 'nc_converter' },
  { id: 'int-send-money', name: 'Send Money', description: 'Send NC to any NaijaLancers user instantly', icon: Send, category: 'finance', color: 'from-emerald-500/20 to-green-500/20', isInternal: true, internalAction: 'send_money' },
  // Learning
  { id: 'pa-courses', name: 'Courses', description: 'Buy or sell professional courses', icon: GraduationCap, path: '/courses', category: 'learning', color: 'from-blue-500/20 to-cyan-500/20', isInternal: true },
  // Earn
  { id: 'pa-savings', name: 'NC Savings', description: 'Grow NC with 5% yearly interest', icon: PiggyBank, path: '/earn', category: 'earn', color: 'from-emerald-500/20 to-teal-500/20', isInternal: true },
  { id: 'pa-streak', name: 'Daily Streak', description: 'Claim your streak bonus every day', icon: Flame, path: '/earn', category: 'earn', color: 'from-orange-500/20 to-amber-500/20', isInternal: true },
  { id: 'pa-bitlabs', name: 'BitLabs Surveys', description: 'Complete surveys and earn NC rewards', icon: FileText, path: '/surveys', category: 'earn', color: 'from-primary/20 to-accent/20', isInternal: true },
  { id: 'pa-cpx', name: 'CPX Surveys', description: 'Open CPX Research surveys for extra rewards', icon: FileText, path: '/cpx-surveys', category: 'earn', color: 'from-blue-500/20 to-cyan-500/20', isInternal: true },
  { id: 'pa-social-tasks', name: 'Social Tasks', description: 'Do social media tasks for cash rewards', icon: Zap, path: '/earn/social-tasks', category: 'earn', color: 'from-primary/20 to-accent/20', isInternal: true },
  { id: 'pa-tasks', name: 'Tasks', description: 'Complete community reward tasks', icon: Users, path: '/tasks', category: 'earn', color: 'from-violet-500/20 to-purple-500/20', isInternal: true },
  { id: 'pa-media', name: 'Local Media Tasks', description: 'Read articles and submit short notes', icon: BookOpen, path: '/earn/articles', category: 'earn', color: 'from-sky-500/20 to-cyan-500/20', isInternal: true },
  { id: 'pa-referrals', name: 'Referrals', description: 'Invite friends and earn ₦50 each', icon: Users, path: '/referrals', category: 'earn', color: 'from-purple-500/20 to-violet-500/20', isInternal: true },
  // Games
  { id: 'pa-guess', name: 'Guess Number', description: 'Guess the number and win NC', icon: Dices, path: '/earn/guess-number', category: 'games', color: 'from-emerald-500/20 to-green-500/20', isInternal: true },
  { id: 'pa-trivia', name: 'Nigerian Trivia', description: 'Test your Nigerian knowledge', icon: Gamepad2, path: '/earn/trivia', category: 'games', color: 'from-orange-500/20 to-amber-500/20', isInternal: true },
  { id: 'pa-spin', name: 'Spin Wheel', description: 'Spin the wheel for prizes', icon: RotateCw, path: '/earn/spin-wheel', category: 'games', color: 'from-indigo-500/20 to-blue-500/20', isInternal: true },
  { id: 'pa-predictor', name: 'Naija Predictor', description: 'Predict outcomes and win from pool', icon: Target, path: '/earn/predictor', category: 'games', color: 'from-teal-500/20 to-cyan-500/20', isInternal: true },
]

const CATEGORY_FILTERS = ['all', 'work', 'finance', 'games', 'learning', 'earn'] as const

const MiniAppsMarketplace = () => {
  const [externalApps, setExternalApps] = useState<MiniApp[]>([])
  const [myApps, setMyApps] = useState<MiniApp[]>([])
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [tab, setTab] = useState<'explore' | 'my-apps'>('explore')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [showDepositDialog, setShowDepositDialog] = useState(false)
  const [depositMethod, setDepositMethod] = useState<'metamask' | 'ivorypay' | undefined>(undefined)
  const [showEscrowSearch, setShowEscrowSearch] = useState(false)
  const [showNCConverter, setShowNCConverter] = useState(false)
  const [showTransferDialog, setShowTransferDialog] = useState(false)
  const [webhookApp, setWebhookApp] = useState<{ id: string; name: string } | null>(null)
  const { user } = useAuth()
  const { isNigerian } = useUserCountry()
  const navigate = useNavigate()

  const fetchApps = async () => {
    const { data } = await supabase
      .from('mini_apps')
      .select('*')
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('install_count', { ascending: false })

    // Filter out internal:// apps (handled as built-in) and known internal sdk_app_ids
    const internalIds = new Set(['bills', 'bank_deposit', 'bank_withdrawal', 'deposit_naira', 'crypto_deposit', 'metamask_deposit', 'ivorypay_deposit', 'escrow', 'nc_converter'])
    const dbApps = (data || []).filter((a: any) => 
      !internalIds.has(a.sdk_app_id) && !a.app_url?.startsWith('internal://')
    ) as MiniApp[]
    setExternalApps(dbApps)
  }

  const fetchMyApps = async () => {
    if (!user) return
    const { data } = await supabase
      .from('mini_apps')
      .select('*')
      .eq('developer_id', user.id)
      .order('created_at', { ascending: false })

    if (data) setMyApps(data as MiniApp[])
  }

  useEffect(() => {
    fetchApps()
    fetchMyApps()
  }, [user])

  // Determine "App of the Week" - most installed external app, fallback to featured built-in
  const topApp: UnifiedApp | null = (() => {
    if (externalApps.length > 0) {
      const top = externalApps.reduce((a, b) => (a.install_count > b.install_count ? a : b))
      return {
        id: top.id,
        name: top.app_name,
        description: top.app_description,
        iconUrl: top.app_icon_url,
        category: top.category,
        color: 'from-primary/20 to-accent/20',
        isInternal: false,
        miniApp: top,
      }
    }
    // Fallback to a popular built-in app
    return BUILT_IN_APPS.find(a => a.id === 'pa-contests') || null
  })()

  // Convert external apps to unified format
  const externalUnified: UnifiedApp[] = externalApps.map(app => ({
    id: app.id,
    name: app.app_name,
    description: app.app_description,
    iconUrl: app.app_icon_url,
    category: app.category,
    color: 'from-primary/20 to-accent/20',
    isInternal: false,
    miniApp: app,
  }))

  // Combine all apps, filtering out Quidax-dependent apps for non-Nigerian users
  const NIGERIA_ONLY_IDS = new Set(['int-bank', 'int-bank-withdraw'])
  const filteredBuiltIn = BUILT_IN_APPS.filter(a => isNigerian || !NIGERIA_ONLY_IDS.has(a.id))
  const allApps: UnifiedApp[] = [...filteredBuiltIn, ...externalUnified]

  // Filter apps
  const filteredApps = allApps.filter(a => {
    const matchesSearch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.description.toLowerCase().includes(search.toLowerCase())
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (s === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    return 'bg-muted text-muted-foreground'
  }

  const handleInternalAction = (action: string) => {
    switch (action) {
      case 'bills':
        navigate('/earn?tab=bills')
        break
      case 'bank_deposit':
      case 'deposit_naira':
        window.dispatchEvent(new CustomEvent('open-quidax-widget', { detail: { mode: 'buy' } }))
        break
      case 'bank_withdrawal':
        window.dispatchEvent(new CustomEvent('open-quidax-widget', { detail: { mode: 'sell' } }))
        break
      case 'crypto_deposit':
        setDepositMethod(undefined)
        setShowDepositDialog(true)
        break
      case 'metamask_deposit':
        setDepositMethod('metamask')
        setShowDepositDialog(true)
        break
      case 'ivorypay_deposit':
        setDepositMethod('ivorypay')
        setShowDepositDialog(true)
        break
      case 'escrow':
        setShowEscrowSearch(true)
        break
      case 'escrowhubs':
        window.open('https://celo.escrowhubs.io', '_blank', 'noopener,noreferrer')
        break
      case 'nc_converter':
        setShowNCConverter(true)
        break
      case 'send_money':
        setShowTransferDialog(true)
        break
    }
  }

  const handleAppClick = (app: UnifiedApp) => {
    if (app.internalAction) {
      handleInternalAction(app.internalAction)
    } else if (app.path) {
      navigate(app.path)
    } else if (app.miniApp) {
      setSelectedApp(app.miniApp)
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Apps
            </h1>
          </div>
          <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Submit
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Your Mini App</DialogTitle>
                <DialogDescription>
                  Share your app details for review and publication in the marketplace.
                </DialogDescription>
              </DialogHeader>
              <SubmitMiniAppForm onSuccess={() => { setShowSubmit(false); fetchMyApps() }} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setTab('explore')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            tab === 'explore' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          Explore
        </button>
        <button
          onClick={() => setTab('my-apps')}
          className={`flex-1 py-3 text-sm font-medium border-b-2 transition ${
            tab === 'my-apps' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
          }`}
        >
          My Apps
        </button>
      </div>

      {tab === 'explore' ? (
        <div className="p-4 space-y-4">
          {/* App of the Week */}
          {topApp && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-accent/10 to-primary/5 border border-primary/30 p-4"
            >
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">App of the Week</span>
              </div>
              <button
                onClick={() => handleAppClick(topApp)}
                className="flex items-center gap-3 w-full text-left"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${topApp.color || 'from-primary/20 to-accent/20'} flex items-center justify-center shrink-0 overflow-hidden`}>
                  {topApp.icon ? (
                    <topApp.icon className="h-7 w-7 text-foreground" />
                  ) : topApp.iconUrl ? (
                    <img src={topApp.iconUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <span className="text-xl font-bold text-primary">{topApp.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm">{topApp.name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{topApp.description}</p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 mt-1">{topApp.category}</Badge>
                </div>
              </button>
            </motion.div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search apps..."
              className="pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORY_FILTERS.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  categoryFilter === cat
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>

          {/* Unified Apps Grid */}
          {filteredApps.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredApps.map((app, i) => (
                <motion.button
                  key={app.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => handleAppClick(app)}
                  className="bg-card border border-border rounded-xl p-4 flex flex-col items-center gap-2 text-center hover:border-primary/50 hover:shadow-sm transition-all"
                >
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${app.color || 'from-primary/20 to-accent/20'} flex items-center justify-center overflow-hidden`}>
                    {app.icon ? (
                      <app.icon className="h-6 w-6 text-foreground" />
                    ) : app.iconUrl ? (
                      <img src={app.iconUrl} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="text-lg font-bold text-primary">{app.name.charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">{app.name}</h3>
                    <p className="text-[10px] text-muted-foreground line-clamp-2 mt-0.5">{app.description}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {app.category}
                  </Badge>
                </motion.button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No apps found</p>
              <p className="text-sm text-muted-foreground mt-1">Try a different search or category</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 space-y-3">
          {myApps.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">You haven't submitted any apps yet</p>
              <Button className="mt-4" onClick={() => setShowSubmit(true)}>
                Submit Your First App
              </Button>
            </div>
          ) : (
            myApps.map(app => (
              <div key={app.id} className="bg-card border border-border rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    {app.app_icon_url ? (
                      <img src={app.app_icon_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="font-bold text-primary">{app.app_name.charAt(0)}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm text-foreground">{app.app_name}</h3>
                    <p className="text-xs text-muted-foreground">{app.app_description}</p>
                  </div>
                  <Badge className={statusColor(app.status)}>{app.status}</Badge>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button size="sm" variant="outline" onClick={() => setWebhookApp({ id: app.id, name: app.app_name })}>
                    Webhook & Secret
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {selectedApp && (
        <MiniAppViewer app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}

      {webhookApp && (
        <MiniAppWebhookSettings
          appId={webhookApp.id}
          appName={webhookApp.name}
          open={!!webhookApp}
          onOpenChange={(v) => !v && setWebhookApp(null)}
        />
      )}

      <Suspense fallback={null}>
        <DepositDialog open={showDepositDialog} onOpenChange={setShowDepositDialog} defaultMethod={depositMethod} />
        <EscrowSearchDialog open={showEscrowSearch} onOpenChange={setShowEscrowSearch} />
        <NCConverterDialog open={showNCConverter} onClose={() => setShowNCConverter(false)} />
        <TransferDialog open={showTransferDialog} onOpenChange={setShowTransferDialog} />
      </Suspense>

      <BottomNavBar />
    </div>
  )
}

export default MiniAppsMarketplace
