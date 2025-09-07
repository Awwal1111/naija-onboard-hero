import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { 
  ArrowLeft,
  FileText,
  Clock,
  Coins,
  ExternalLink,
  RefreshCw
} from 'lucide-react'
import { toast } from 'sonner'

interface BitLabsOffer {
  id: string
  name: string
  description: string
  reward: number
  duration: number
  category: string
  url: string
}

export const Surveys = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [offers, setOffers] = useState<BitLabsOffer[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchOffers()
  }, [])

  const fetchOffers = async () => {
    if (!user) return
    
    try {
      setLoading(true)
      const { data, error } = await supabase.functions.invoke('bitlabs-offers', {
        body: { user_id: user.id }
      })

      if (error) {
        console.error('BitLabs API error:', error)
        throw error
      }
      setOffers(data?.offers || [])
    } catch (error) {
      console.error('Error fetching offers:', error)
      toast.error('Failed to load surveys. Showing sample surveys.')
      // Set mock data for development/fallback
      setOffers([
        {
          id: '1',
          name: 'Consumer Survey',
          description: 'Share your shopping habits and preferences',
          reward: 50,
          duration: 5,
          category: 'Consumer',
          url: '#'
        },
        {
          id: '2', 
          name: 'Technology Survey',
          description: 'Tell us about your tech preferences and usage',
          reward: 75,
          duration: 8,
          category: 'Technology',
          url: '#'
        },
        {
          id: '3',
          name: 'Entertainment Survey', 
          description: 'Share your entertainment and media preferences',
          reward: 60,
          duration: 6,
          category: 'Entertainment',
          url: '#'
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const refreshOffers = async () => {
    setRefreshing(true)
    await fetchOffers()
    setRefreshing(false)
  }

  const handleOfferClick = async (offer: BitLabsOffer) => {
    if (!user) return

    try {
      // Check if user already started this survey
      const { data: existingCompletion } = await supabase
        .from('survey_completions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)
        .maybeSingle()

      if (existingCompletion && existingCompletion.status === 'completed') {
        toast.error('You have already completed this survey')
        return
      }

      // Track survey start if not already tracked
      if (!existingCompletion) {
        const { error } = await supabase
          .from('survey_completions')
          .insert([{
            user_id: user.id,
            bitlabs_user_id: user.id,
            offer_id: offer.id,
            status: 'pending'
          }])

        if (error) {
          console.error('Error tracking survey start:', error)
          // Don't block survey access if tracking fails
        }
      }

      // Open survey in new tab or embedded view
      if (offer.url && offer.url !== '#') {
        // In production, this would open the actual BitLabs survey URL
        window.open(offer.url, '_blank', 'noopener,noreferrer')
        toast.success('Survey opened! Complete it to earn rewards.')
      } else {
        // For demo purposes, simulate survey completion
        toast.success(`Survey "${offer.name}" completed! You earned ₦${offer.reward}`)
        
        // Simulate adding reward to wallet (in production, this would be handled by BitLabs callback)
        setTimeout(() => {
          toast.success(`₦${offer.reward} has been added to your wallet!`)
        }, 1500)
      }
      
    } catch (error) {
      console.error('Error starting survey:', error)
      toast.error('Failed to start survey')
    }
  }

  if (loading || profileLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    )
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
          <h1 className="text-xl font-bold text-foreground">Surveys</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshOffers}
            disabled={refreshing}
            className="p-2"
          >
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Balance */}
        <div className="bg-primary/10 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Current Balance</p>
              <p className="text-2xl font-bold text-primary">
                ₦{profile?.wallet_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <Coins className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-accent/20">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <FileText className="h-5 w-5 text-primary mt-1" />
              <div className="space-y-1">
                <p className="text-sm font-medium">How it works</p>
                <p className="text-xs text-muted-foreground">
                  Complete surveys to earn naira. Rewards are credited automatically after verification.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offers List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Available Surveys</h2>
            <Badge variant="secondary">
              {offers.length} available
            </Badge>
          </div>

          {loading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="border-accent/20">
                <CardHeader className="pb-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : offers.length === 0 ? (
            <Card className="border-accent/20">
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No surveys available right now</p>
                <p className="text-sm text-muted-foreground mt-1">Check back later for new opportunities</p>
              </CardContent>
            </Card>
          ) : (
            offers.map((offer) => (
              <Card 
                key={offer.id} 
                className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer"
                onClick={() => handleOfferClick(offer)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base">{offer.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {offer.description}
                      </CardDescription>
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        ₦{offer.reward}
                      </Badge>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-xs">{offer.duration} min</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {offer.category}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  )
}