import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  ArrowLeft,
  Target,
  Trophy,
  RotateCcw,
  Coins
} from 'lucide-react'
import { toast } from 'sonner'

export const GuessNumberGame = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const [gameState, setGameState] = useState<'ready' | 'playing' | 'won' | 'lost'>('ready')
  const [targetNumber, setTargetNumber] = useState<number>(0)
  const [userGuess, setUserGuess] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [maxAttempts] = useState(7)
  const [hint, setHint] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      navigate('/login')
    }
  }, [user, navigate])

  const startGame = () => {
    const number = Math.floor(Math.random() * 100) + 1
    setTargetNumber(number)
    setGameState('playing')
    setAttempts(0)
    setHint('')
    setUserGuess('')
    
    // Create game session
    createGameSession()
  }

  const createGameSession = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('game_sessions')
        .insert([{
          user_id: user.id,
          game_type: 'guess_number',
          session_data: { started_at: new Date().toISOString() }
        }])
        .select()
        .single()

      if (error) throw error
      setSessionId(data.id)
    } catch (error) {
      console.error('Error creating game session:', error)
    }
  }

  const endGameSession = async (won: boolean) => {
    if (!user || !sessionId) return

    try {
      const pointsEarned = won ? 10 : 0
      
      const { error } = await supabase
        .from('game_sessions')
        .update({
          points_earned: pointsEarned,
          completed_at: new Date().toISOString(),
          session_data: {
            started_at: new Date().toISOString(),
            attempts,
            won,
            target_number: targetNumber
          }
        })
        .eq('id', sessionId)

      if (error) throw error

      if (won) {
        // Update wallet balance
        const newBalance = (profile?.wallet_balance || 0) + pointsEarned
        await updateProfile({ wallet_balance: newBalance })
        toast.success(`Congratulations! You earned ₦${pointsEarned}`)
      }
    } catch (error) {
      console.error('Error ending game session:', error)
    }
  }

  const checkGuess = () => {
    const guess = parseInt(userGuess)
    
    if (isNaN(guess) || guess < 1 || guess > 100) {
      toast.error('Please enter a number between 1 and 100')
      return
    }

    const newAttempts = attempts + 1
    setAttempts(newAttempts)

    if (guess === targetNumber) {
      setGameState('won')
      setHint('🎉 Correct! Great job!')
      endGameSession(true)
    } else if (newAttempts >= maxAttempts) {
      setGameState('lost')
      setHint(`Game over! The number was ${targetNumber}`)
      endGameSession(false)
    } else {
      if (guess < targetNumber) {
        setHint('📈 Higher!')
      } else {
        setHint('📉 Lower!')
      }
      setUserGuess('')
    }
  }

  const resetGame = () => {
    setGameState('ready')
    setTargetNumber(0)
    setUserGuess('')
    setAttempts(0)
    setHint('')
    setSessionId(null)
  }

  if (!user || !profile) {
    return <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/earn')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Guess the Number 🎯</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>

        {/* Balance */}
        <div className="bg-primary/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-primary">
                ₦{profile.wallet_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <Coins className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Game Rules */}
        {gameState === 'ready' && (
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-primary" />
                <span>How to Play</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Guess a number between 1 and 100</p>
                <p>• You have {maxAttempts} attempts</p>
                <p>• Get hints after each wrong guess</p>
                <p>• Win ₦10 if you guess correctly!</p>
              </div>
              <Button 
                onClick={startGame} 
                className="w-full"
                size="lg"
              >
                Start Game
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Game Play */}
        {gameState === 'playing' && (
          <Card className="border-accent/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Make your guess!</CardTitle>
                <Badge variant="secondary">
                  {maxAttempts - attempts} attempts left
                </Badge>
              </div>
              <CardDescription>
                I'm thinking of a number between 1 and 100
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {hint && (
                <div className="p-3 bg-primary/10 rounded-lg text-center">
                  <p className="text-primary font-medium">{hint}</p>
                </div>
              )}
              
              <div className="space-y-3">
                <Input
                  type="number"
                  placeholder="Enter your guess (1-100)"
                  value={userGuess}
                  onChange={(e) => setUserGuess(e.target.value)}
                  min="1"
                  max="100"
                  className="text-center text-lg"
                />
                <Button 
                  onClick={checkGuess} 
                  className="w-full"
                  size="lg"
                  disabled={!userGuess}
                >
                  Submit Guess
                </Button>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                Attempt {attempts} of {maxAttempts}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Won */}
        {gameState === 'won' && (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-6 text-center space-y-4">
              <Trophy className="h-16 w-16 text-yellow-500 mx-auto" />
              <div>
                <h2 className="text-2xl font-bold text-green-800">Congratulations! 🎉</h2>
                <p className="text-green-700">You guessed it in {attempts} attempts!</p>
                <p className="text-lg font-semibold text-green-800 mt-2">
                  You earned ₦10!
                </p>
              </div>
              <div className="space-y-2">
                <Button onClick={resetGame} className="w-full" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Play Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/earn')} 
                  className="w-full"
                >
                  Back to Earn Hub
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Game Lost */}
        {gameState === 'lost' && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="p-6 text-center space-y-4">
              <div className="text-6xl">😔</div>
              <div>
                <h2 className="text-2xl font-bold text-red-800">Game Over!</h2>
                <p className="text-red-700">The number was {targetNumber}</p>
                <p className="text-red-600 mt-2">Better luck next time!</p>
              </div>
              <div className="space-y-2">
                <Button onClick={resetGame} className="w-full" size="lg">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/earn')} 
                  className="w-full"
                >
                  Back to Earn Hub
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}