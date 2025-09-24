import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, Clock, Trophy, CheckCircle, XCircle } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

interface TriviaQuestion {
  id: string
  question: string
  options: string[]
  correct_answer: number
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
}

const triviaQuestions: TriviaQuestion[] = [
  {
    id: '1',
    question: 'What is the capital of Nigeria?',
    options: ['Lagos', 'Abuja', 'Kano', 'Port Harcourt'],
    correct_answer: 1,
    difficulty: 'easy',
    category: 'Geography'
  },
  {
    id: '2',
    question: 'Which year did Nigeria gain independence?',
    options: ['1958', '1960', '1962', '1963'],
    correct_answer: 1,
    difficulty: 'easy',
    category: 'History'
  },
  {
    id: '3',
    question: 'What is the largest ethnic group in Nigeria?',
    options: ['Yoruba', 'Igbo', 'Hausa-Fulani', 'Edo'],
    correct_answer: 2,
    difficulty: 'medium',
    category: 'Culture'
  },
  {
    id: '4',
    question: 'Which Nigerian author wrote "Things Fall Apart"?',
    options: ['Wole Soyinka', 'Chinua Achebe', 'Chimamanda Adichie', 'Ben Okri'],
    correct_answer: 1,
    difficulty: 'medium',
    category: 'Literature'
  },
  {
    id: '5',
    question: 'What is the currency of Nigeria?',
    options: ['Naira', 'Cedi', 'Franc', 'Rand'],
    correct_answer: 0,
    difficulty: 'easy',
    category: 'Economy'
  },
  {
    id: '6',
    question: 'Which river is the longest in Nigeria?',
    options: ['River Benue', 'River Niger', 'River Kaduna', 'River Cross'],
    correct_answer: 1,
    difficulty: 'medium',
    category: 'Geography'
  },
  {
    id: '7',
    question: 'Who was Nigeria\'s first President?',
    options: ['Nnamdi Azikiwe', 'Abubakar Tafawa Balewa', 'Obafemi Awolowo', 'Ahmadu Bello'],
    correct_answer: 0,
    difficulty: 'hard',
    category: 'History'
  },
  {
    id: '8',
    question: 'Which state is known as the "Centre of Excellence"?',
    options: ['Lagos', 'Ogun', 'Delta', 'Rivers'],
    correct_answer: 0,
    difficulty: 'medium',
    category: 'Geography'
  }
]

const NigerianTrivia: React.FC = () => {
  const { balance } = useWallet()
  const { user } = useAuth()
  const { toast } = useToast()
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'finished'>('menu')
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([])
  const [timeLeft, setTimeLeft] = useState(15)
  const [score, setScore] = useState(0)
  const [gameQuestions, setGameQuestions] = useState<TriviaQuestion[]>([])
  const [showAnswer, setShowAnswer] = useState(false)
  const [playing, setPlaying] = useState(false)

  const ENTRY_FEE = 20
  const QUESTIONS_PER_GAME = 5

  useEffect(() => {
    let timer: NodeJS.Timeout
    if (gameState === 'playing' && timeLeft > 0 && !showAnswer) {
      timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000)
    } else if (timeLeft === 0 && gameState === 'playing') {
      handleTimeUp()
    }
    return () => clearTimeout(timer)
  }, [timeLeft, gameState, showAnswer])

  const startGame = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to play games",
        variant: "destructive",
      })
      return
    }

    if (balance.total < ENTRY_FEE) {
      toast({
        title: "Insufficient Balance",
        description: `You need NC ${ENTRY_FEE} to play Nigerian Trivia`,
        variant: "destructive",
      })
      return
    }

    setPlaying(true)

    try {
      // Deduct entry fee
      await supabase
        .from('wallet_transactions')
        .insert({
          user_id: user.id,
          transaction_type: 'game_loss',
          amount: ENTRY_FEE,
          amount_nc: ENTRY_FEE,  
          status: 'completed',
          description: 'Nigerian Trivia entry fee'
        })

      // Shuffle questions and select random ones
      const shuffled = [...triviaQuestions].sort(() => Math.random() - 0.5)
      const selectedQuestions = shuffled.slice(0, QUESTIONS_PER_GAME)
      
      setGameQuestions(selectedQuestions)
      setGameState('playing')
      setCurrentQuestionIndex(0)
      setSelectedAnswers([])
      setTimeLeft(15)
      setScore(0)
      setShowAnswer(false)

      toast({
        title: "Game Started!",
        description: `Answer ${QUESTIONS_PER_GAME} questions to win prizes`,
      })
    } catch (error) {
      console.error('Error starting game:', error)
      toast({
        title: "Game Error",
        description: "Failed to start game. Please try again.",
        variant: "destructive",
      })
    } finally {
      setPlaying(false)
    }
  }

  const handleAnswerSelect = (answerIndex: number) => {
    if (showAnswer) return

    const currentQuestion = gameQuestions[currentQuestionIndex]
    const isCorrect = answerIndex === currentQuestion.correct_answer
    
    setSelectedAnswers([...selectedAnswers, answerIndex])
    setShowAnswer(true)
    
    if (isCorrect) {
      setScore(score + 1)
    }

    // Move to next question after 2 seconds
    setTimeout(() => {
      if (currentQuestionIndex < gameQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setTimeLeft(15)
        setShowAnswer(false)
      } else {
        finishGame(isCorrect ? score + 1 : score)
      }
    }, 2000)
  }

  const handleTimeUp = () => {
    setSelectedAnswers([...selectedAnswers, -1])
    setShowAnswer(true)
    
    setTimeout(() => {
      if (currentQuestionIndex < gameQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setTimeLeft(15)
        setShowAnswer(false)
      } else {
        finishGame(score)
      }
    }, 2000)
  }

  const finishGame = async (finalScore: number) => {
    setGameState('finished')
    
    // Only give reward for perfect score (all 5 correct)
    let winnings = 0
    if (finalScore === 5) winnings = 50 // Perfect score only

    try {
      if (winnings > 0 && user) {
        // Add winnings to withdrawable balance
        await supabase
          .from('wallet_transactions')
          .insert({
            user_id: user.id,
            transaction_type: 'game_win',
            amount: winnings,
            amount_nc: winnings,
            status: 'completed',
            description: `Nigerian Trivia winnings (${finalScore}/${QUESTIONS_PER_GAME})`
          })

        toast({
          title: "Congratulations!",
          description: `Perfect score! You won NC ${winnings}!`,
        })
      } else {
        toast({
          title: "Better luck next time!",
          description: `You got ${finalScore}/${QUESTIONS_PER_GAME} correct. Get all 5 correct to win NC 50!`,
        })
      }
    } catch (error) {
      console.error('Error processing winnings:', error)
    }
  }

  const resetGame = () => {
    setGameState('menu')
    setCurrentQuestionIndex(0)
    setSelectedAnswers([])
    setTimeLeft(30)
    setScore(0)
    setGameQuestions([])
    setShowAnswer(false)
  }

  if (gameState === 'menu') {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-900">
            <Brain className="h-6 w-6" />
            Nigerian Trivia
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="space-y-2">
            <p className="text-green-800">Test your knowledge of Nigeria!</p>
            <p className="text-sm text-green-700">
              Answer {QUESTIONS_PER_GAME} questions in 15 seconds each
            </p>
          </div>
          
          <div className="p-4 bg-green-100 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">Prizes:</h4>
            <div className="space-y-1 text-sm text-green-800">
              <div className="flex justify-between">
                <span>5/5 correct (Perfect!):</span>
                <Badge className="bg-green-200 text-green-800">NC 50</Badge>
              </div>
              <div className="flex justify-between">
                <span>Less than 5 correct:</span>
                <Badge className="bg-gray-200 text-gray-600">No Reward</Badge>
              </div>
              <p className="text-xs text-green-600 mt-2 font-medium">
                ⚡ Get ALL questions right to win!
              </p>
            </div>
          </div>

          <Button
            onClick={startGame}
            disabled={playing || balance.total < ENTRY_FEE}
            className="w-full"
            size="lg"
          >
            {playing ? (
              <>Starting Game...</>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Start Game (NC {ENTRY_FEE})
              </>
            )}
          </Button>

          {balance.total < ENTRY_FEE && (
            <p className="text-sm text-muted-foreground">
              Need more coins to play
            </p>
          )}
        </CardContent>
      </Card>
    )
  }

  if (gameState === 'playing') {
    const currentQuestion = gameQuestions[currentQuestionIndex]
    
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-green-900">
              Question {currentQuestionIndex + 1}/{QUESTIONS_PER_GAME}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-600" />
              <Badge variant={timeLeft <= 10 ? "destructive" : "secondary"}>
                {timeLeft}s
              </Badge>
            </div>
          </div>
          <Progress value={(timeLeft / 15) * 100} className="h-2" />
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-white rounded-lg border">
            <p className="font-medium text-gray-900">{currentQuestion.question}</p>
            <Badge className="mt-2 bg-green-100 text-green-800">
              {currentQuestion.category} • {currentQuestion.difficulty}
            </Badge>
          </div>

          <div className="grid gap-3">
            {currentQuestion.options.map((option, index) => {
              let buttonClass = "w-full text-left p-4 border-2 transition-colors"
              let icon = null

              if (showAnswer) {
                if (index === currentQuestion.correct_answer) {
                  buttonClass += " border-green-500 bg-green-100 text-green-900"
                  icon = <CheckCircle className="h-4 w-4 text-green-600" />
                } else if (selectedAnswers[currentQuestionIndex] === index) {
                  buttonClass += " border-red-500 bg-red-100 text-red-900"
                  icon = <XCircle className="h-4 w-4 text-red-600" />
                } else {
                  buttonClass += " border-gray-200 bg-gray-50 text-gray-600"
                }
              } else {
                buttonClass += " border-green-200 hover:border-green-400 hover:bg-green-50"
              }

              return (
                <Button
                  key={index}
                  variant="outline"
                  className={buttonClass}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showAnswer}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option}</span>
                    {icon}
                  </div>
                </Button>
              )
            })}
          </div>

          <div className="text-center text-sm text-green-700">
            Score: {score}/{currentQuestionIndex + (showAnswer ? 1 : 0)}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (gameState === 'finished') {
    const winnings = score === 5 ? 50 : 0
    
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-900">
            <Trophy className="h-6 w-6" />
            Game Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <div className="p-6 bg-white rounded-lg border">
            <div className="text-4xl font-bold text-green-600 mb-2">
              {score}/{QUESTIONS_PER_GAME}
            </div>
            <p className="text-green-800 mb-4">Correct Answers</p>
            
            {winnings > 0 ? (
              <div className="space-y-2">
                <Badge className="bg-green-200 text-green-800 text-lg px-4 py-2">
                  You won NC {winnings}!
                </Badge>
                <p className="text-sm text-green-700">
                  Winnings added to your withdrawable balance
                </p>
              </div>
            ) : (
              <p className="text-green-700">
                Need all 5 correct answers to win NC 50. Try again!
              </p>
            )}
          </div>

          <Button onClick={resetGame} className="w-full" size="lg">
            Play Again
          </Button>
        </CardContent>
      </Card>
    )
  }

  return null
}

export default NigerianTrivia