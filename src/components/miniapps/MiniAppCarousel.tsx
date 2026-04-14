import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { ChevronRight, Star, Sparkles, Receipt, Building2, Wallet, CreditCard, Shield, RefreshCw, Banknote } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MiniAppViewer } from './MiniAppViewer'
import { useUserCountry } from '@/hooks/useUserCountry'

interface MiniApp {
  id: string
  app_name: string
  app_description: string
  app_icon_url: string | null
  app_url: string
  category: string
  install_count: number
  rating: number
  sdk_app_id: string
  developer_id: string
  is_internal?: boolean
  internal_action?: string
}

const INTERNAL_MINI_APPS: MiniApp[] = [
  {
    id: 'internal-bills',
    app_name: 'Bills',
    app_description: 'Pay bills and airtime',
    app_icon_url: null,
    app_url: '',
    category: 'finance',
    install_count: 0,
    rating: 5,
    sdk_app_id: 'bills',
    developer_id: 'system',
    is_internal: true,
    internal_action: 'bills',
  },
  {
    id: 'internal-bank-deposit',
    app_name: 'Bank Deposit',
    app_description: 'Deposit via bank',
    app_icon_url: null,
    app_url: '',
    category: 'finance',
    install_count: 0,
    rating: 5,
    sdk_app_id: 'bank_deposit',
    developer_id: 'system',
    is_internal: true,
    internal_action: 'bank_deposit',
  },
  {
    id: 'internal-bank-withdrawal',
    app_name: 'Bank Withdrawal',
    app_description: 'Withdraw to your bank with Quidax',
    app_icon_url: null,
    app_url: '',
    category: 'finance',
    install_count: 0,
    rating: 5,
    sdk_app_id: 'bank_withdrawal',
    developer_id: 'system',
    is_internal: true,
    internal_action: 'bank_withdrawal',
  },
  {
    id: 'internal-deposit-naira',
    app_name: 'Deposit Naira',
    app_description: 'Deposit with Naira',
    app_icon_url: null,
    app_url: '',
    category: 'finance',
    install_count: 0,
    rating: 5,
    sdk_app_id: 'deposit_naira',
    developer_id: 'system',
    is_internal: true,
    internal_action: 'deposit_naira',
  },
  {
    id: 'internal-crypto-deposit',
    app_name: 'Crypto Deposit',
    app_description: 'Deposit via crypto',
    app_icon_url: null,
    app_url: '',
    category: 'finance',
    install_count: 0,
    rating: 5,
    sdk_app_id: 'crypto_deposit',
    developer_id: 'system',
    is_internal: true,
    internal_action: 'crypto_deposit',
  },
  {
    id: 'internal-escrow',
    app_name: 'Escrow',
    app_description: 'Secure payments with escrow',
    app_icon_url: null,
    app_url: '',
    category: 'finance',
    install_count: 0,
    rating: 5,
    sdk_app_id: 'escrow',
    developer_id: 'system',
    is_internal: true,
    internal_action: 'escrow',
  },
  {
    id: 'internal-nc-converter',
    app_name: 'NC Converter',
    app_description: 'Convert 100 non-withdrawable NC to 5 withdrawable NC',
    app_icon_url: null,
    app_url: '',
    category: 'finance',
    install_count: 0,
    rating: 5,
    sdk_app_id: 'nc_converter',
    developer_id: 'system',
    is_internal: true,
    internal_action: 'nc_converter',
  },
]

const INTERNAL_ICONS: Record<string, typeof Receipt> = {
  bills: Receipt,
  bank_deposit: Building2,
  bank_withdrawal: Banknote,
  crypto_deposit: Wallet,
  deposit_naira: CreditCard,
  escrow: Shield,
  nc_converter: RefreshCw,
}

interface MiniAppCarouselProps {
  onInternalAction?: (action: string) => void
}

export const MiniAppCarousel = ({ onInternalAction }: MiniAppCarouselProps) => {
  const [apps, setApps] = useState<MiniApp[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const [selectedApp, setSelectedApp] = useState<MiniApp | null>(null)
  const navigate = useNavigate()
  const intervalRef = useRef<NodeJS.Timeout>()
  const { isNigerian } = useUserCountry()

  // Filter out Nigeria-only apps for international users
  const NIGERIA_ONLY_ACTIONS = new Set(['bank_deposit', 'bank_withdrawal', 'deposit_naira'])
  const filteredInternalApps = useMemo(() => 
    INTERNAL_MINI_APPS.filter(a => isNigerian || !NIGERIA_ONLY_ACTIONS.has(a.internal_action || '')),
    [isNigerian]
  )

  useEffect(() => {
    const fetchApps = async () => {
      const { data } = await supabase
        .from('mini_apps')
        .select('*')
        .eq('status', 'approved')
        .order('is_featured', { ascending: false })
        .order('install_count', { ascending: false })
        .limit(10)

      const internalIds = new Set(filteredInternalApps.map(a => a.sdk_app_id))
      const dbApps = (data || []).filter((a: any) => !a.is_internal && !internalIds.has(a.sdk_app_id)) as MiniApp[]
      setApps([...filteredInternalApps, ...dbApps])
    }
    fetchApps()
  }, [filteredInternalApps])

  useEffect(() => {
    if (apps.length <= 4) return
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % apps.length)
    }, 8000)
    return () => clearInterval(intervalRef.current)
  }, [apps.length])

  const handleAppClick = (app: MiniApp) => {
    if (app.is_internal && app.internal_action) {
      onInternalAction?.(app.internal_action)
    } else {
      setSelectedApp(app)
    }
  }

  if (!apps.length) return null

  const visibleApps = apps.length <= 4 ? apps : apps.slice(activeIndex, activeIndex + 4).concat(
    activeIndex + 4 > apps.length ? apps.slice(0, (activeIndex + 4) - apps.length) : []
  )

  return (
    <>
      <div className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <h3 className="text-sm font-semibold text-foreground">Mini Apps</h3>
          </div>
          <button
            onClick={() => navigate('/mini-apps')}
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            See all <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          <AnimatePresence mode="popLayout">
            {visibleApps.map((app, i) => {
              const InternalIcon = app.internal_action ? INTERNAL_ICONS[app.internal_action] : null
              return (
                <motion.button
                  key={app.id}
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8, x: -20 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  onClick={() => handleAppClick(app)}
                  className="flex flex-col items-center gap-1.5 min-w-[72px] group"
                >
                  <div className="relative">
                    <motion.div
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm group-hover:shadow-md transition-shadow border-2 ${
                        app.is_internal 
                          ? 'bg-gradient-to-br from-primary/30 to-primary/10 border-primary/40' 
                          : 'bg-gradient-to-br from-primary/20 to-accent/20 border-primary/30'
                      }`}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {app.is_internal && InternalIcon ? (
                        <InternalIcon className="h-6 w-6 text-primary" />
                      ) : app.app_icon_url ? (
                        <img src={app.app_icon_url} alt={app.app_name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <span className="text-xl font-bold text-primary">{app.app_name.charAt(0)}</span>
                      )}
                    </motion.div>
                    {!app.is_internal && app.rating >= 4 && (
                      <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-0.5">
                        <Star className="h-2.5 w-2.5 text-white fill-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium text-center line-clamp-1 max-w-[72px]">
                    {app.app_name}
                  </span>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>

        {apps.length > 4 && (
          <div className="flex justify-center gap-1 mt-2">
            {Array.from({ length: Math.ceil(apps.length / 4) }).map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  Math.floor(activeIndex / 4) === i ? 'w-4 bg-primary' : 'w-1 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {selectedApp && (
        <MiniAppViewer app={selectedApp} onClose={() => setSelectedApp(null)} />
      )}
    </>
  )
}
