import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { BrandInput } from '@/components/ui/brand-input'
import { Card } from '@/components/ui/card'
import { Logo } from '@/components/ui/logo'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Bot, 
  Send, 
  Sparkles, 
  ArrowRight, 
  Star,
  MapPin,
  CheckCircle2,
  Loader2,
  User,
  DollarSign,
  Clock,
  Globe,
  Package
} from 'lucide-react'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useMiniPayContext } from '@/components/MiniPayAuthWrapper'
import { supabase } from '@/integrations/supabase/client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  options?: string[]
  freelancers?: Freelancer[]
  gigs?: Gig[]
}

interface Freelancer {
  id: string
  full_name: string
  profession: string
  avatar_url: string | null
  rating: number
  trust_score: number
  country: string
  hourly_rate: number
  is_expert: boolean
  completed_jobs: number
  response_minutes: number | null
  match_score: number
  match_reasons: string[]
}

interface Gig {
  id: string
  title: string
  description: string
  price: number
  delivery_days: number
  seller_name: string
  seller_picture: string | null
  average_rating: number
  photo_url: string | null
  match_score: number
  match_reasons: string[]
}

interface HiringContext {
  service_needed?: string
  budget?: string
  budget_min?: number
  budget_max?: number
  urgency?: string
  urgency_days?: number
  complexity?: string
  preference?: string
}

const HIRING_QUESTIONS = [
  {
    id: 'service',
    question: "What type of work do you need done?",
    placeholder: "e.g. Logo design, React website, blog article, video editing...",
    options: ['Logo & Branding', 'Website/App', 'Writing & Content', 'Video & Animation', 'Marketing & SEO', 'Virtual Assistant', 'AI / Automation', 'Other'],
  },
  {
    id: 'budget',
    question: "What's your approximate budget?",
    options: ['Under NC 30,000', 'NC 30,000 – 100,000', 'NC 100,000 – 300,000', 'NC 300,000 – 800,000', 'Over NC 800,000', 'Flexible'],
  },
  {
    id: 'urgency',
    question: "When do you need this completed?",
    options: ['Within 3 days', 'Within a week', 'Within 2 weeks', 'Within a month', 'Flexible timeline'],
  },
  {
    id: 'complexity',
    question: "How complex is the project?",
    options: ['Simple (single deliverable)', 'Standard (multi-step)', 'Complex (multi-phase)', "I'm not sure"],
  },
  {
    id: 'preference',
    question: "Any preferences for the freelancer?",
    options: ['Verified expert only', 'Top-rated (4.5★+)', 'Fast responder', 'Best value for money', 'No preference'],
  },
]

// Parse the budget option into a numeric range (NC).
const parseBudget = (label: string): { min: number; max: number } => {
  if (label.includes('Under NC 30')) return { min: 0, max: 30000 }
  if (label.includes('30,000 – 100')) return { min: 30000, max: 100000 }
  if (label.includes('100,000 – 300')) return { min: 100000, max: 300000 }
  if (label.includes('300,000 – 800')) return { min: 300000, max: 800000 }
  if (label.includes('Over NC 800')) return { min: 800000, max: 10_000_000 }
  return { min: 0, max: 10_000_000 } // Flexible
}

const parseUrgencyDays = (label: string): number => {
  if (label.includes('3 days')) return 3
  if (label.includes('a week')) return 7
  if (label.includes('2 weeks')) return 14
  if (label.includes('a month')) return 30
  return 60
}


export default function AIHire() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, updateProfile } = useProfile()
  const { toast } = useToast()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [hiringContext, setHiringContext] = useState<HiringContext>({})
  const [matchedFreelancers, setMatchedFreelancers] = useState<Freelancer[]>([])
  const [isComplete, setIsComplete] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMsg: Message = {
      id: '1',
      role: 'assistant',
      content: `Hi${profile?.full_name ? ` ${profile.full_name.split(' ')[0]}` : ''}! 👋 I'm your AI hiring assistant. I'll help you find the perfect freelancer in just a few questions.\n\n${HIRING_QUESTIONS[0].question}`,
      options: HIRING_QUESTIONS[0].options,
    }
    setMessages([welcomeMsg])
  }, [profile?.full_name])

  const handleOptionSelect = async (option: string) => {
    await processUserResponse(option)
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return
    await processUserResponse(input.trim())
    setInput('')
  }

  const processUserResponse = async (response: string) => {
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: response
    }
    setMessages(prev => [...prev, userMsg])
    
    // Update hiring context based on current step
    const keys = ['service_needed', 'budget', 'urgency', 'complexity', 'preference'] as const
    const contextKey = keys[currentStep]
    const newContext: HiringContext = { ...hiringContext, [contextKey]: response }
    if (contextKey === 'budget') {
      const { min, max } = parseBudget(response)
      newContext.budget_min = min
      newContext.budget_max = max
    } else if (contextKey === 'urgency') {
      newContext.urgency_days = parseUrgencyDays(response)
    }
    setHiringContext(newContext)

    // Move to next step
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)

    if (nextStep < HIRING_QUESTIONS.length) {
      const nextQuestion = HIRING_QUESTIONS[nextStep]
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: nextQuestion.question,
        options: nextQuestion.options,
      }
      setMessages(prev => [...prev, assistantMsg])
    } else {
      await findMatchingFreelancers(newContext)
    }
  }

  // ---------------------------------------------------------------------------
  // Weighted matching algorithm.
  // Scores 0-100 across 9 industry-standard signals:
  //   • Skills / keyword match (25)
  //   • Expert verification (10)
  //   • Rating quality (15)
  //   • Job success history / completed jobs (10)
  //   • Response time (10)
  //   • Budget compatibility (10)
  //   • Recency of activity / boost (5)
  //   • Premium boost (5)
  //   • Client preference bonus (10)
  // ---------------------------------------------------------------------------
  const STOP_WORDS = new Set(['the','and','for','with','a','an','of','to','in','on','my','need','want','i','help'])
  const tokenize = (s: string) =>
    (s || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2 && !STOP_WORDS.has(w))

  const skillMatchScore = (target: string[], candidate: string): { score: number; matched: string[] } => {
    if (!candidate) return { score: 0, matched: [] }
    const cand = candidate.toLowerCase()
    const matched = target.filter(w => cand.includes(w))
    if (target.length === 0) return { score: 12, matched: [] }
    return { score: Math.min(25, Math.round((matched.length / target.length) * 25) + (matched.length > 0 ? 5 : 0)), matched }
  }

  const findMatchingFreelancers = async (context: HiringContext) => {
    setLoading(true)
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Perfect! 🔍 Scoring freelancers and service packages across 9 industry signals…",
    }])

    try {
      // Pull a broader candidate pool with the fields we actually score on.
      const { data: freelancers, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, bio, profile_picture_url, is_expert, is_premium, state_name, average_rating, rating_count, completed_jobs_count, avg_response_time_seconds, updated_at')
        .not('profession', 'is', null)
        .limit(80)
      if (error) throw error

      const { data: gigs } = await supabase
        .from('jobs_services')
        .select('id, title, description, price, delivery_days, average_rating, photo_urls, user_id, boost_amount, status, created_at')
        .eq('status', 'active')
        .limit(80)

      const queryTokens = [
        ...tokenize(context.service_needed || ''),
        ...tokenize((context.service_needed || '').split('&')[0]),
      ]
      const wantsExpertOnly = context.preference === 'Verified expert only'
      const wantsTopRated = context.preference?.startsWith('Top-rated')
      const wantsFast = context.preference === 'Fast responder'
      const wantsValue = context.preference === 'Best value for money'

      const complexityWeight =
        context.complexity?.startsWith('Complex') ? 1.25 :
        context.complexity?.startsWith('Standard') ? 1.0 :
        context.complexity?.startsWith('Simple') ? 0.85 : 1.0

      // -------- Freelancer scoring --------
      const scoredFreelancers = (freelancers || []).map(f => {
        const reasons: string[] = []
        const skills = skillMatchScore(queryTokens, `${f.profession || ''} ${f.bio || ''}`)
        let score = skills.score
        if (skills.matched.length > 0) reasons.push(`Matches: ${skills.matched.slice(0, 3).join(', ')}`)

        // Expert verification (10)
        if (f.is_expert) { score += 10; reasons.push('Verified expert') }
        else if (wantsExpertOnly) { score -= 30 }

        // Rating quality (0-15) — rating × confidence (rating_count)
        const rating = Number(f.average_rating || 0)
        const ratingCount = Number(f.rating_count || 0)
        const ratingConfidence = Math.min(1, ratingCount / 10)
        const ratingScore = Math.round((rating / 5) * 15 * ratingConfidence)
        score += ratingScore
        if (rating >= 4.5 && ratingCount >= 3) reasons.push(`${rating.toFixed(1)}★ (${ratingCount} reviews)`)
        if (wantsTopRated && rating < 4.5) score -= 15

        // Completed jobs (0-10) — log scale
        const completed = Number(f.completed_jobs_count || 0)
        const completedScore = Math.min(10, Math.round(Math.log10(completed + 1) * 6))
        score += completedScore
        if (completed >= 5) reasons.push(`${completed} jobs completed`)

        // Response time (0-10) — under 30 min is gold
        const respSec = Number(f.avg_response_time_seconds || 0)
        const respMin = respSec > 0 ? Math.round(respSec / 60) : null
        let respScore = 5
        if (respMin !== null) {
          if (respMin <= 30) respScore = 10
          else if (respMin <= 120) respScore = 8
          else if (respMin <= 360) respScore = 6
          else if (respMin <= 1440) respScore = 4
          else respScore = 2
        }
        score += respScore
        if (wantsFast && respMin !== null && respMin <= 60) {
          score += 5; reasons.push('Replies in under 1 hour')
        }

        // Activity recency (0-5)
        if (f.updated_at) {
          const days = (Date.now() - new Date(f.updated_at).getTime()) / 86_400_000
          if (days <= 3) score += 5
          else if (days <= 14) score += 3
          else if (days <= 30) score += 1
        }

        // Premium boost (0-5)
        if (f.is_premium) { score += 5; reasons.push('Premium freelancer') }

        // Complexity weighting — complex work prefers experts with completion history
        score = Math.round(score * complexityWeight)

        return {
          id: f.user_id,
          full_name: f.full_name || 'Freelancer',
          profession: f.profession || 'Professional',
          avatar_url: f.profile_picture_url,
          rating: rating || 4.5,
          trust_score: Math.min(100, 60 + completedScore + ratingScore),
          country: f.state_name || 'Nigeria',
          hourly_rate: 5000,
          is_expert: !!f.is_expert,
          completed_jobs: completed,
          response_minutes: respMin,
          match_score: Math.max(0, Math.min(100, score)),
          match_reasons: reasons.slice(0, 3),
        } as Freelancer
      })
        .sort((a, b) => b.match_score - a.match_score)
      const topFreelancers = (scoredFreelancers.filter(f => f.match_score >= 15).slice(0, 5).length
        ? scoredFreelancers.filter(f => f.match_score >= 15)
        : scoredFreelancers
      ).slice(0, 5)

      // -------- Gig scoring --------
      const minBudget = context.budget_min ?? 0
      const maxBudget = context.budget_max ?? 10_000_000

      const sellerIds = (gigs || []).map(g => g.user_id).filter(Boolean)
      let sellersMap: Record<string, { name: string; picture: string | null; is_expert: boolean }> = {}
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('user_id, full_name, profile_picture_url, is_expert')
          .in('user_id', sellerIds)
        sellers?.forEach(s => {
          sellersMap[s.user_id] = {
            name: s.full_name || 'Seller',
            picture: s.profile_picture_url,
            is_expert: !!s.is_expert,
          }
        })
      }

      const scoredGigs = (gigs || []).map(g => {
        const reasons: string[] = []
        const skills = skillMatchScore(queryTokens, `${g.title || ''} ${g.description || ''}`)
        let score = skills.score
        if (skills.matched.length > 0) reasons.push(`Matches: ${skills.matched.slice(0, 3).join(', ')}`)

        const price = Number(g.price || 0)
        // Budget compatibility (0-15)
        if (price >= minBudget && price <= maxBudget) {
          score += 15
          reasons.push('Fits your budget')
        } else if (price < minBudget) {
          score += 8
          if (wantsValue) { score += 5; reasons.push('Below budget — great value') }
        } else if (price > maxBudget * 1.3) {
          score -= 15
        } else {
          score += 3
        }

        // Rating
        const rating = Number(g.average_rating || 0)
        if (rating > 0) {
          score += Math.round((rating / 5) * 12)
          if (rating >= 4.5) reasons.push(`${rating.toFixed(1)}★ rated package`)
        }

        // Delivery vs urgency
        const delivery = Number(g.delivery_days || 7)
        const urgencyDays = context.urgency_days ?? 30
        if (delivery <= urgencyDays) { score += 8; if (delivery <= 3) reasons.push('Ships in 3 days') }
        else if (delivery <= urgencyDays * 1.5) score += 3
        else score -= 8

        // Boost & seller expert status
        if (g.boost_amount > 0) score += 4
        if (sellersMap[g.user_id]?.is_expert) { score += 6; reasons.push('Sold by verified expert') }

        // Recency
        if (g.created_at) {
          const days = (Date.now() - new Date(g.created_at).getTime()) / 86_400_000
          if (days <= 30) score += 3
        }

        return {
          id: g.id,
          title: g.title,
          description: g.description,
          price,
          delivery_days: delivery,
          seller_name: sellersMap[g.user_id]?.name || 'Seller',
          seller_picture: sellersMap[g.user_id]?.picture || null,
          average_rating: rating,
          photo_url: g.photo_urls?.[0] || null,
          match_score: Math.max(0, Math.min(100, score)),
          match_reasons: reasons.slice(0, 3),
        } as Gig
      })
        .sort((a, b) => b.match_score - a.match_score)
      const topGigs = (scoredGigs.filter(g => g.match_score >= 15).length
        ? scoredGigs.filter(g => g.match_score >= 15)
        : scoredGigs
      ).slice(0, 5)

      setMatchedFreelancers(topFreelancers)

      if (topGigs.length > 0) {

      setMatchedFreelancers(scoredFreelancers)

      if (scoredGigs.length > 0) {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `📦 Top ${scoredGigs.length} ready-to-order packages, ranked by match score:`,
          gigs: scoredGigs,
        }])
      }

      setMessages(prev => [...prev, {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: scoredFreelancers.length > 0
          ? `👨‍💻 Top ${scoredFreelancers.length} freelancers for custom work, ranked by 9-signal score:`
          : scoredGigs.length === 0
            ? "I couldn't find strong matches. Try a broader description or browse all experts."
            : "You can also reach out to these freelancers for custom work:",
        freelancers: scoredFreelancers,
      }])
      setIsComplete(true)
    } catch (error) {
      console.error('Error finding freelancers:', error)
      toast({ title: 'Error', description: 'Failed to find freelancers', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }


  const handleCompleteOnboarding = async () => {
    setLoading(true)
    try {
      await updateProfile({
        account_type: 'client',
        onboarding_completed: true
      } as any)

      toast({
        title: 'Welcome aboard! 🎉',
        description: 'Your account is ready. Start hiring talent!'
      })

      navigate('/experts')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to complete setup',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewFreelancer = (freelancerId: string) => {
    navigate(`/expert/${freelancerId}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="bg-background/95 backdrop-blur-sm border-b px-4 py-3 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">AI Hiring Assistant</span>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4 overflow-y-auto">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border shadow-sm'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground">AI Assistant</span>
                </div>
              )}
              
              <p className="whitespace-pre-line text-sm">{msg.content}</p>

              {/* Quick Options */}
              {msg.options && !isComplete && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {msg.options.map((option) => (
                    <Button
                      key={option}
                      size="sm"
                      variant="outline"
                      onClick={() => handleOptionSelect(option)}
                      disabled={loading}
                      className="text-xs"
                    >
                      {option}
                    </Button>
                  ))}
                </div>
              )}

              {/* Gig Results */}
              {msg.gigs && msg.gigs.length > 0 && (
                <div className="space-y-3 mt-4">
                  {msg.gigs.map((gig) => (
                    <Card
                      key={gig.id}
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => navigate(`/gig/${gig.id}`)}
                    >
                      <div className="flex items-start gap-3">
                        {gig.photo_url ? (
                          <img
                            src={gig.photo_url}
                            alt={gig.title}
                            className="w-14 h-14 object-cover rounded-lg shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 bg-muted rounded-lg flex items-center justify-center shrink-0">
                            <Package className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm line-clamp-1">{gig.title}</p>
                          <p className="text-xs text-muted-foreground">by {gig.seller_name}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-primary">
                              NC {gig.price.toLocaleString()} (~${(gig.price / 1600).toFixed(0)})
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {gig.delivery_days}d
                            </span>
                            {gig.average_rating > 0 && (
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {gig.average_rating.toFixed(1)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              {/* Freelancer Results */}
              {msg.freelancers && msg.freelancers.length > 0 && (
                <div className="space-y-3 mt-4">
                  {msg.freelancers.map((freelancer) => (
                    <Card
                      key={freelancer.id}
                      className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => handleViewFreelancer(freelancer.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={freelancer.avatar_url || undefined} />
                          <AvatarFallback>
                            <User className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{freelancer.full_name}</p>
                            {freelancer.is_expert && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Verified
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{freelancer.profession}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {freelancer.rating.toFixed(1)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              {freelancer.country}
                            </span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              ~${(freelancer.hourly_rate / 1600).toFixed(0)}/hr
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && !isComplete && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-2xl px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Finding freelancers...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input / Complete Actions */}
      <div className="bg-background border-t p-4 sticky bottom-0">
        <div className="max-w-2xl mx-auto">
          {isComplete ? (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => navigate('/experts')}
              >
                Browse All Freelancers
              </Button>
              <Button
                className="flex-1"
                onClick={handleCompleteOnboarding}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Complete Setup
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <BrandInput
                placeholder={HIRING_QUESTIONS[currentStep]?.placeholder || "Type your answer..."}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                disabled={loading}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={loading || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
