import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/integrations/supabase/client'
import { ChevronRight, Star, Sparkles, Phone, Building2, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { MiniAppViewer } from './MiniAppViewer'

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

const INTERNAL_ICONS: Record<string, typeof Phone> = {
  airtime: Phone,
  bank_transfer: Building2,
  crypto_deposit: Wallet,
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

  useEffect(() => {
    const fetchApps = async () => {
      const { data } = await supabase
        .from('mini_apps')
        .select('*')
        .eq('status', 'approved')
        .order('is_featured', { ascending: false })
        .order('install_count', { ascending: false })
        .limit(10)

      if (data?.length) setApps(data as MiniApp[])
    }
    fetchApps()
  }, [])

  useEffect(() => {
    if (apps.length <= 1) return
    intervalRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % apps.length)
    }, 4000)
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
                    {app.rating >= 4 && (
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
