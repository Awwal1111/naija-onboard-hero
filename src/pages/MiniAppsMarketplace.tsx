import { useState, useEffect } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Star, Download, Search, Plus, Sparkles, Receipt, Building2, Wallet, CreditCard, Shield, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { SubmitMiniAppForm } from '@/components/miniapps/SubmitMiniAppForm'
import { MiniAppViewer } from '@/components/miniapps/MiniAppViewer'
import { motion } from 'framer-motion'

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

const INTERNAL_ICONS: Record<string, typeof Receipt> = {
  bills: Receipt,
  bank_deposit: Building2,
  crypto_deposit: Wallet,
  deposit_naira: CreditCard,
  escrow: Shield,
  nc_converter: RefreshCw,
}

const MARKETPLACE_INTERNAL_APPS: MiniApp[] = [
  { id: 'int-bills', app_name: 'Bills', app_description: 'Pay bills, airtime & data', app_icon_url: null, app_url: '', category: 'finance', install_count: 0, rating: 5, review_count: 0, sdk_app_id: 'bills', developer_id: 'system', status: 'approved' },
  { id: 'int-bank', app_name: 'Bank Deposit', app_description: 'Deposit via bank transfer', app_icon_url: null, app_url: '', category: 'finance', install_count: 0, rating: 5, review_count: 0, sdk_app_id: 'bank_deposit', developer_id: 'system', status: 'approved' },
  { id: 'int-naira', app_name: 'Deposit Naira', app_description: 'Deposit with Naira', app_icon_url: null, app_url: '', category: 'finance', install_count: 0, rating: 5, review_count: 0, sdk_app_id: 'deposit_naira', developer_id: 'system', status: 'approved' },
  { id: 'int-crypto', app_name: 'Crypto Deposit', app_description: 'Deposit via crypto', app_icon_url: null, app_url: '', category: 'finance', install_count: 0, rating: 5, review_count: 0, sdk_app_id: 'crypto_deposit', developer_id: 'system', status: 'approved' },
  { id: 'int-escrow', app_name: 'Escrow', app_description: 'Secure escrow payments', app_icon_url: null, app_url: '', category: 'finance', install_count: 0, rating: 5, review_count: 0, sdk_app_id: 'escrow', developer_id: 'system', status: 'approved' },
  { id: 'int-converter', app_name: 'NC Converter', app_description: 'Convert 100 non-withdrawable NC to 5 withdrawable NC', app_icon_url: null, app_url: '', category: 'finance', install_count: 0, rating: 5, review_count: 0, sdk_app_id: 'nc_converter', developer_id: 'system', status: 'approved' },
]

const MiniAppsMarketplace = () => {
  const [apps, setApps] = useState<MiniApp[]>([])
  const [myApps, setMyApps] = useState<MiniApp[]>([])
  const [search, setSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null)
  const [showSubmit, setShowSubmit] = useState(false)
  const [tab, setTab] = useState<'explore' | 'my-apps'>('explore')
  const { user } = useAuth()
  const navigate = useNavigate()

  const fetchApps = async () => {
    const { data } = await supabase
      .from('mini_apps')
      .select('*')
      .eq('status', 'approved')
      .order('is_featured', { ascending: false })
      .order('install_count', { ascending: false })

    const internalIds = new Set(MARKETPLACE_INTERNAL_APPS.map(a => a.sdk_app_id))
    const dbApps = (data || []).filter((a: any) => !internalIds.has(a.sdk_app_id)) as MiniApp[]
    setApps([...MARKETPLACE_INTERNAL_APPS, ...dbApps])
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

  const filtered = apps.filter(a =>
    a.app_name.toLowerCase().includes(search.toLowerCase()) ||
    a.app_description.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (s: string) => {
    if (s === 'approved') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    if (s === 'pending') return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
    if (s === 'rejected') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
    return 'bg-muted text-muted-foreground'
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
              Mini Apps
            </h1>
          </div>
          <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="h-4 w-4" /> Submit App
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Submit Your Mini App</DialogTitle>
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
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search mini apps..."
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((app, i) => (
              <motion.button
                key={app.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedApp(app)}
                className="bg-card border border-border rounded-xl p-4 flex items-start gap-3 text-left hover:border-primary/50 transition-colors"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {(() => {
                    const InternalIcon = INTERNAL_ICONS[app.sdk_app_id]
                    if (app.id.startsWith('int-') && InternalIcon) {
                      return <InternalIcon className="h-6 w-6 text-primary" />
                    }
                    if (app.app_icon_url) {
                      return <img src={app.app_icon_url} alt="" className="w-full h-full object-cover rounded-xl" />
                    }
                    return <span className="text-lg font-bold text-primary">{app.app_name.charAt(0)}</span>
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{app.app_name}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{app.app_description}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                      {app.rating.toFixed(1)}
                    </span>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                      <Download className="h-3 w-3" />
                      {app.install_count}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {app.category}
                    </Badge>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No mini apps found</p>
              <p className="text-sm text-muted-foreground mt-1">Be the first to submit one!</p>
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
              </div>
            ))
          )}
        </div>
      )}

      {selectedApp && (
        <MiniAppViewer app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
    </div>
  )
}

export default MiniAppsMarketplace
