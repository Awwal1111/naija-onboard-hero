import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { RotateCcw, HelpCircle, Coins, Trophy } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/use-toast'

const SpinWheelGame: React.FC = () => {
  const { balance, playSpinWheel } = useWallet()
  const { toast } = useToast()
  const [spinning, setSpinning] = useState(false)
  const [showRules, setShowRules] = useState(false)
  const [lastWin, setLastWin] = useState<number | null>(null)

  const handleSpin = async () => {
    if (spinning) return
    
    const totalBalance = balance.withdrawable + balance.non_withdrawable
    if (totalBalance < 10) {
      toast({
        title: "Insufficient Balance",
        description: "You need at least NC 10 to play",
        variant: "destructive",
      })
      return
    }

    setSpinning(true)
    
    // Simulate spinning animation
    setTimeout(async () => {
      const winnings = await playSpinWheel()
      setLastWin(winnings)
      setSpinning(false)
    }, 3000)
  }

  const getWinChance = (amount: number) => {
    switch (amount) {
      case 100: return '1%'
      case 10: return '9%'
      case 5: return '20%'
      case 0: return '70%'
      default: return '0%'
    }
  }

  const prizes = [
    { amount: 0, color: 'bg-gray-500', label: 'Try Again' },
    { amount: 5, color: 'bg-blue-500', label: 'NC 5' },
    { amount: 0, color: 'bg-gray-500', label: 'Try Again' },
    { amount: 10, color: 'bg-green-500', label: 'NC 10' },
    { amount: 0, color: 'bg-gray-500', label: 'Try Again' },
    { amount: 100, color: 'bg-yellow-500', label: 'NC 100' },
    { amount: 0, color: 'bg-gray-500', label: 'Try Again' },
    { amount: 5, color: 'bg-blue-500', label: 'NC 5' },
  ]

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-primary" />
              Spin Wheel
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRules(true)}
              className="p-1 h-8 w-8"
            >
              <HelpCircle className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Wheel Display */}
          <div className="flex items-center justify-center">
            <div className={`relative w-32 h-32 rounded-full border-4 border-primary ${spinning ? 'animate-spin' : ''}`}>
              {prizes.map((prize, index) => {
                const rotation = (index * 45) - 22.5
                return (
                  <div
                    key={index}
                    className={`absolute w-4 h-16 ${prize.color} transform-gpu`}
                    style={{
                      top: '8px',
                      left: '50%',
                      transformOrigin: '50% 56px',
                      transform: `translateX(-50%) rotate(${rotation}deg)`,
                    }}
                  />
                )
              })}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-white rounded-full border-2 border-primary flex items-center justify-center">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* Game Info */}
          <div className="text-center space-y-2">
            <Badge variant="outline" className="text-sm">
              <Coins className="h-4 w-4 mr-1" />
              Cost: NC 10
            </Badge>
            
            {lastWin !== null && (
              <div className="p-3 bg-muted rounded-lg">
                {lastWin > 0 ? (
                  <div className="flex items-center justify-center gap-2 text-green-600">
                    <Trophy className="h-4 w-4" />
                    <span className="font-medium">You won NC {lastWin}!</span>
                  </div>
                ) : (
                  <span className="text-text-secondary">Better luck next time!</span>
                )}
              </div>
            )}
          </div>

          {/* Ad Redemption Placeholder */}
          <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg bg-primary/5">
            <p className="text-sm text-center text-muted-foreground">
              Watch ads to redeem (Coming soon)
            </p>
          </div>

          {/* Spin Button */}
          <Button
            onClick={handleSpin}
            disabled={spinning || balance.total < 10}
            className="w-full"
            size="lg"
          >
            {spinning ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Spinning...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Spin Wheel (NC 10)
              </>
            )}
          </Button>

          {balance.total < 10 && (
            <p className="text-center text-sm text-text-secondary">
              Need more coins to play
            </p>
          )}
        </CardContent>
      </Card>

      {/* Rules Dialog */}
      <Dialog open={showRules} onOpenChange={setShowRules}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Spin Wheel Rules</DialogTitle>
            <DialogDescription>
              How to play and win Naijacoins
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">How to Play:</h4>
              <ul className="text-sm text-text-secondary space-y-1">
                <li>• Cost: NC 10 per spin</li>
                <li>• Spins deduct from Non-Withdrawable balance first</li>
                <li>• Winnings go to your Withdrawable balance</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Win Chances:</h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>NC 100 (Jackpot)</span>
                  <Badge variant="secondary">1%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>NC 10</span>
                  <Badge variant="secondary">9%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>NC 5</span>
                  <Badge variant="secondary">20%</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span>No Win</span>
                  <Badge variant="secondary">70%</Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default SpinWheelGame