import React from 'react'
import { Trophy, ArrowLeft } from 'lucide-react'
import ResponsiveLayout from '@/components/ResponsiveLayout'
import { LeaderboardSection } from '@/components/LeaderboardSection'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/ui/logo'

const Leaderboard = () => {
  const navigate = useNavigate()

  return (
    <ResponsiveLayout className="pb-20">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 sticky top-0 z-10 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 mb-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Logo />
          <div className="w-10" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="text-muted-foreground mt-2">Top performers on NaijaLancers</p>
        </div>

        <LeaderboardSection />
      </div>
    </ResponsiveLayout>
  )
}

export default Leaderboard