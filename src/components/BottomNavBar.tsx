import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useRoleFeatures } from '@/hooks/useRoleFeatures'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'

export const BottomNavBar = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { bottomNavItems } = useRoleFeatures()
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border px-1 sm:px-4 py-1.5 sm:py-2 safe-area-bottom safe-area-x z-50">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          {bottomNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl transition-colors min-w-0 flex-1 ${
                location.pathname === item.path
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-1.5 sm:px-3 rounded-xl transition-colors min-w-0 flex-1 text-muted-foreground hover:text-primary hover:bg-primary/5"
          >
            <svg className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-[10px] sm:text-xs font-medium truncate max-w-full">More</span>
          </button>
        </div>
      </div>
      <MoreMenuDrawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />
    </>
  )
}
