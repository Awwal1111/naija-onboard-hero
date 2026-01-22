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
}

interface HiringContext {
  service_needed?: string
  budget?: string
  urgency?: string
  location_preference?: string
}

const HIRING_QUESTIONS = [
  {
    id: 'service',
    question: "What type of work do you need done?",
    placeholder: "e.g., Logo design, Website, Writing, Video editing...",
    options: ['Logo & Branding', 'Website/App', 'Writing & Content', 'Video & Animation', 'Marketing', 'Virtual Assistant', 'Other']
  },
  {
    id: 'budget',
    question: "What's your approximate budget?",
    options: ['Under $50 (~NC 80,000)', '$50 - $100 (~NC 160,000)', '$100 - $300 (~NC 480,000)', 'Over $300', 'Flexible']
  },
  {
    id: 'urgency',
    question: "When do you need this completed?",
    options: ['Within 3 days', 'Within a week', 'Within 2 weeks', 'Flexible timeline']
  }
]

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
    const contextKey = ['service_needed', 'budget', 'urgency'][currentStep]
    const newContext = { ...hiringContext, [contextKey]: response }
    setHiringContext(newContext)
    
    // Move to next step
    const nextStep = currentStep + 1
    setCurrentStep(nextStep)

    if (nextStep < HIRING_QUESTIONS.length) {
      // Ask next question
      const nextQuestion = HIRING_QUESTIONS[nextStep]
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: nextQuestion.question,
        options: nextQuestion.options
      }
      setMessages(prev => [...prev, assistantMsg])
    } else {
      // All questions answered - find freelancers
      await findMatchingFreelancers(newContext)
    }
  }

  const findMatchingFreelancers = async (context: HiringContext) => {
    setLoading(true)
    
    // Show searching message
    const searchingMsg: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: "Perfect! 🔍 Let me find the best freelancers and service packages for you..."
    }
    setMessages(prev => [...prev, searchingMsg])

    try {
      // Query freelancers - use existing columns only
      const { data: freelancers, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, is_expert, wallet_balance, state_name')
        .not('profession', 'is', null)
        .order('wallet_balance', { ascending: false })
        .limit(10)

      if (error) throw error

      // Also query matching gigs (service packages)
      const { data: gigs, error: gigsError } = await supabase
        .from('jobs_services')
        .select(`
          id, title, description, price, delivery_days, average_rating, photo_urls,
          user_id
        `)
        .eq('status', 'active')
        .order('boost_amount', { ascending: false })
        .limit(10)

      // Filter freelancers by profession/service if provided
      let filteredFreelancers = freelancers || []
      let filteredGigs = gigs || []
      
      if (context.service_needed) {
        const searchTerm = context.service_needed.toLowerCase()
        const searchWords = searchTerm.split(' ').filter(w => w.length > 2)
        
        filteredFreelancers = filteredFreelancers.filter(f => 
          searchWords.some(word => f.profession?.toLowerCase().includes(word))
        )
        
        filteredGigs = filteredGigs.filter(g => 
          searchWords.some(word => 
            g.title?.toLowerCase().includes(word) || 
            g.description?.toLowerCase().includes(word)
          )
        )
      }

      // Take top 5 of each
      filteredFreelancers = filteredFreelancers.slice(0, 5)
      filteredGigs = filteredGigs.slice(0, 5)

      // Get seller info for gigs
      const sellerIds = filteredGigs.map(g => g.user_id).filter(Boolean)
      let sellersMap: Record<string, { name: string; picture: string | null }> = {}
      
      if (sellerIds.length > 0) {
        const { data: sellers } = await supabase
          .from('profiles')
          .select('user_id, full_name, profile_picture_url')
          .in('user_id', sellerIds)
        
        sellers?.forEach(s => {
          sellersMap[s.user_id] = {
            name: s.full_name || 'Seller',
            picture: s.profile_picture_url
          }
        })
      }

      // Get ratings for matched freelancers
      const freelancerIds = filteredFreelancers.map(f => f.user_id)
      let ratingsMap: Record<string, number> = {}
      
      if (freelancerIds.length > 0) {
        const { data: ratings } = await supabase
          .from('expert_ratings')
          .select('expert_id, rating')
          .in('expert_id', freelancerIds)

        if (ratings) {
          const ratingCounts: Record<string, { sum: number; count: number }> = {}
          ratings.forEach(r => {
            if (!ratingCounts[r.expert_id]) {
              ratingCounts[r.expert_id] = { sum: 0, count: 0 }
            }
            ratingCounts[r.expert_id].sum += r.rating
            ratingCounts[r.expert_id].count += 1
          })
          
          Object.entries(ratingCounts).forEach(([id, { sum, count }]) => {
            ratingsMap[id] = sum / count
          })
        }
      }

      const formattedFreelancers: Freelancer[] = filteredFreelancers.map(f => ({
        id: f.user_id,
        full_name: f.full_name || 'Freelancer',
        profession: f.profession || 'Professional',
        avatar_url: f.profile_picture_url,
        rating: ratingsMap[f.user_id] || 4.5,
        trust_score: 80,
        country: f.state_name || 'Nigeria',
        hourly_rate: 5000,
        is_expert: f.is_expert || false
      }))

      const formattedGigs: Gig[] = filteredGigs.map(g => ({
        id: g.id,
        title: g.title,
        description: g.description,
        price: g.price,
        delivery_days: g.delivery_days || 7,
        seller_name: sellersMap[g.user_id]?.name || 'Seller',
        seller_picture: sellersMap[g.user_id]?.picture || null,
        average_rating: g.average_rating || 0,
        photo_url: g.photo_urls?.[0] || null
      }))

      setMatchedFreelancers(formattedFreelancers)

      // Show gigs first if available
      if (formattedGigs.length > 0) {
        const gigsMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `📦 I found ${formattedGigs.length} ready-to-order service packages that match your needs:`,
          gigs: formattedGigs
        }
        setMessages(prev => [...prev, gigsMsg])
      }

      // Then show freelancers
      const resultsMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: formattedFreelancers.length > 0 
          ? `👨‍💻 ${formattedFreelancers.length} talented freelancers for custom work:`
          : formattedGigs.length === 0 
            ? "I couldn't find exact matches. Try browsing all experts or gigs."
            : "You can also reach out to these freelancers for custom work:",
        freelancers: formattedFreelancers
      }
      setMessages(prev => [...prev, resultsMsg])
      setIsComplete(true)

    } catch (error) {
      console.error('Error finding freelancers:', error)
      toast({
        title: 'Error',
        description: 'Failed to find freelancers',
        variant: 'destructive'
      })
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
