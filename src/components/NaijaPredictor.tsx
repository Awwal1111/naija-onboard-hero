import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Brain, TrendingUp, Users, Clock } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'

interface PredictorQuestion {
  id: string
  title: string
  description?: string
  options: Array<{
    id: number
    text: string
    votes: number
  }>
  stake_amount: number
  total_pool: number
  status: string
  correct_option?: number
  resolved_at?: string
}

const NaijaPredictor: React.FC = () => {
  const { balance } = useWallet()
  const { user } = useAuth()
  const { toast } = useToast()
  const [questions, setQuestions] = useState<PredictorQuestion[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({})
  const [betting, setBetting] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetchActiveQuestions()
  }, [])

  const fetchActiveQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('predictor_questions')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform the data to match our interface
      const transformedQuestions = (data || []).map(question => ({
        ...question,
        options: Array.isArray(question.options) 
          ? question.options.map((opt: any, index: number) => ({
              id: index,
              text: typeof opt === 'string' ? opt : opt.text || `Option ${index + 1}`,
              votes: opt.votes || 0
            }))
          : [
              { id: 0, text: 'Yes', votes: 0 },
              { id: 1, text: 'No', votes: 0 }
            ]
      }))
      
      setQuestions(transformedQuestions)
    } catch (error) {
      console.error('Error fetching questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const placeBet = async (questionId: string, optionIndex: number, stakeAmount: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to place bets",
        variant: "destructive",
      })
      return
    }

    if (balance.total < stakeAmount) {
      toast({
        title: "Insufficient Balance",
        description: `You need NC ${stakeAmount} to place this bet`,
        variant: "destructive",
      })
      return
    }

    setBetting(prev => ({ ...prev, [questionId]: true }))

    try {
      const { error } = await supabase
        .from('predictor_bets')
        .insert({
          user_id: user.id,
          question_id: questionId,
          selected_option: optionIndex,
          stake_amount: stakeAmount
        })

      if (error) throw error

      toast({
        title: "Bet Placed!",
        description: `You bet NC ${stakeAmount} on this prediction`,
      })

      // Refresh questions to show updated pool
      fetchActiveQuestions()
    } catch (error: any) {
      console.error('Error placing bet:', error)
      toast({
        title: "Bet Failed",
        description: error.message || "Failed to place bet",
        variant: "destructive",
      })
    } finally {
      setBetting(prev => ({ ...prev, [questionId]: false }))
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Active Predictions</h3>
            <p className="text-muted-foreground">Check back soon for new prediction questions!</p>
          </CardContent>
        </Card>
      ) : (
        questions.map((question) => (
          <Card key={question.id} className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg text-blue-900 mb-2">{question.title}</CardTitle>
                  {question.description && (
                    <p className="text-sm text-blue-700">{question.description}</p>
                  )}
                </div>
                <Badge className="bg-blue-100 text-blue-800 ml-4">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  NC {question.stake_amount}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Total Pool Info */}
              <div className="flex items-center justify-between p-3 bg-blue-100/50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-800">Total Pool</span>
                </div>
                <span className="font-semibold text-blue-900">NC {question.total_pool}</span>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {question.options.map((option, index) => {
                  const totalVotes = question.options.reduce((sum, opt) => sum + opt.votes, 0)
                  const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0
                  const isSelected = selectedOptions[question.id] === index

                  return (
                    <div key={index} className="space-y-2">
                      <div
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-blue-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                        }`}
                        onClick={() => setSelectedOptions(prev => ({ 
                          ...prev, 
                          [question.id]: index 
                        }))}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-blue-900">{option.text}</span>
                          <span className="text-xs text-blue-600">{percentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={percentage} className="h-2" />
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-blue-600">{option.votes} votes</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Place Bet Button */}
              <Button
                onClick={() => {
                  const selectedOption = selectedOptions[question.id]
                  if (selectedOption !== undefined) {
                    placeBet(question.id, selectedOption, question.stake_amount)
                  }
                }}
                disabled={
                  selectedOptions[question.id] === undefined ||
                  betting[question.id] ||
                  balance.total < question.stake_amount
                }
                className="w-full"
                size="lg"
              >
                {betting[question.id] ? (
                  <>Placing Bet...</>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Predict & Win (NC {question.stake_amount})
                  </>
                )}
              </Button>

              {balance.total < question.stake_amount && (
                <p className="text-center text-sm text-muted-foreground">
                  Need more coins to predict
                </p>
              )}
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}

export default NaijaPredictor