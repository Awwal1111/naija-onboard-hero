import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Coins, RotateCcw, Target, Brain, Calendar, HelpCircle, Trophy, Zap } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import NaijaLanceWalletCard from '@/components/NaijaLanceWalletCard'
import SpinWheelGame from '@/components/SpinWheelGame'
import { DailySigninCard } from '@/components/DailySigninCard'

const EnhancedEarn = () => {
  const { balance, loading } = useWallet()

  const games = [
    {
      id: 'spin-wheel',
      title: 'Spin Wheel',
      description: 'Spin to win up to NC 100!',
      cost: 'NC 10',
      icon: RotateCcw,
      color: 'bg-gradient-to-br from-purple-500 to-pink-500',
      maxWin: 'NC 100',
      component: SpinWheelGame
    },
    {
      id: 'predictor',
      title: 'Naija Predictor',
      description: 'Bet on real-world outcomes',
      cost: 'NC 20',
      icon: Target,
      color: 'bg-gradient-to-br from-blue-500 to-cyan-500',
      maxWin: 'Varies',
      disabled: true
    },
    {
      id: 'trivia',
      title: 'Nigerian Trivia',
      description: '5 questions, win NC 50',
      cost: 'NC 10',
      icon: Brain,
      color: 'bg-gradient-to-br from-green-500 to-emerald-500',
      maxWin: 'NC 50',
      disabled: true
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
      title: 'Referral Program', 
      description: 'Invite friends and earn',
      icon: Trophy,
      reward: 'NC 100 per referral',
      path: '/referrals'
    }
  ]

  const [selectedGame, setSelectedGame] = useState<string | null>(null)

  const GameModal = ({ game }: { game: any }) => {
    if (!game.component) return null
    const GameComponent = game.component
    return <GameComponent />
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto max-w-4xl p-4 space-y-6">
        {/* Header */}
        <div className="text-center py-6">
          <h1 className="text-3xl font-bold text-primary mb-2">Earn Hub</h1>
          <p className="text-text-secondary">Play games, complete tasks, and earn Naijacoins</p>
        </div>

        {/* Wallet Summary */}
        <NaijaLanceWalletCard balance={balance} />

        {/* Daily Sign-In */}
        <DailySigninCard />

        {/* Games Section */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Games
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {games.map((game) => (
              <Card key={game.id} className={`relative overflow-hidden ${game.disabled ? 'opacity-60' : 'hover:shadow-lg transition-shadow cursor-pointer'}`}>
                <div className={`absolute inset-0 ${game.color} opacity-10`} />
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <game.icon className="h-5 w-5" />
                      {game.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-1 h-8 w-8"
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </div>
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
                    className="w-full"
                    disabled={game.disabled}
                    onClick={() => !game.disabled && setSelectedGame(game.id)}
                  >
                    {game.disabled ? 'Coming Soon' : 'Play Now'}
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
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
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

        {/* Game Modal */}
        {selectedGame && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">
                  {games.find(g => g.id === selectedGame)?.title}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedGame(null)}
                >
                  ×
                </Button>
              </div>
              <div className="p-4">
                <GameModal game={games.find(g => g.id === selectedGame)} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default EnhancedEarn