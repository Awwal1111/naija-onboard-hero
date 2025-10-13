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
    if (!user) {
      console.error('No user found when fetching offers')
      return
    }
    
    try {
      setLoading(true)
      console.log('Fetching BitLabs surveys for user:', user.id)
      toast.loading('Loading available surveys...')
      
      // Call BitLabs offers API through our edge function
      const { data, error } = await supabase.functions.invoke('bitlabs-offers', {
        body: { user_id: user.id }
      })

      console.log('BitLabs edge function response:', { data, error })

      if (error) {
        console.error('Edge function error:', error)
        throw error
      }

      if (data?.offers) {
        console.log(`Received ${data.offers.length} surveys:`, data.offers)
        setOffers(data.offers)
        toast.dismiss()
        
        if (data.offers.length === 0) {
          toast.info('No surveys available at the moment. Check back later!')
        } else {
          toast.success(`Found ${data.offers.length} available surveys`)
        }
      } else {
        console.warn('No offers in response data:', data)
        setOffers([])
        toast.dismiss()
        toast.info('No surveys available at the moment')
      }
      
    } catch (error: any) {
      console.error('Error fetching offers:', error)
      toast.dismiss()
      toast.error(error.message || 'Failed to load surveys. Please try again.')
      setOffers([])
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
    if (!user) {
      console.error('No user found when clicking offer')
      return
    }

    console.log('Opening survey:', offer)

    try {
      // Check if user already completed this survey
      const { data: existingCompletion } = await supabase
        .from('survey_completions')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('offer_id', offer.id)
        .maybeSingle()

      console.log('Existing completion check:', existingCompletion)

      if (existingCompletion && existingCompletion.status === 'completed') {
        toast.error('You have already completed this survey')
        return
      }

      // Create a pending survey completion record
      const { error: insertError } = await supabase
        .from('survey_completions')
        .insert([{
          user_id: user.id,
          bitlabs_user_id: user.id,
          offer_id: offer.id,
          status: 'pending'
        }])

      if (insertError && !insertError.message.includes('duplicate key')) {
        console.error('Error creating survey record:', insertError)
      }

      // Check if this is a real BitLabs survey with click_url
      if (offer.url && offer.url !== '#' && offer.url !== '') {
        console.log('Opening BitLabs survey URL:', offer.url)
        
        // Open BitLabs survey in new tab
        const surveyWindow = window.open(offer.url, '_blank', 'noopener,noreferrer')
        
        if (surveyWindow) {
          toast.success('Survey opened in new tab! Complete it to earn ₦' + offer.reward)
          console.log('Survey window opened successfully')
        } else {
          toast.error('Please allow popups to open surveys')
          console.error('Failed to open survey window - popup may be blocked')
        }
        
        // Note: Actual completion will be handled by BitLabs callback
      } else {
        console.warn('Mock survey detected (no valid URL):', offer)

        // For demo surveys, simulate completion
        toast.loading('Starting survey...')
        
        setTimeout(async () => {
          try {
            // Update survey completion status
            const { error: updateError } = await supabase
              .from('survey_completions')
              .update({
                status: 'completed',
                points_earned: offer.reward,
                completed_at: new Date().toISOString()
              })
              .eq('user_id', user.id)
              .eq('offer_id', offer.id)

            if (updateError) {
              throw updateError
            }

            // Update wallet balance
            const { error: walletError } = await supabase
              .from('profiles')
              .update({ 
                wallet_balance: (profile?.wallet_balance || 0) + offer.reward 
              })
              .eq('user_id', user.id)

            if (walletError) {
              throw walletError
            }

            // Success messages
            toast.dismiss()
            toast.success(`Survey "${offer.name}" completed successfully!`)
            
            setTimeout(() => {
              toast.success(`₦${offer.reward} has been added to your wallet!`)
            }, 1000)

            // Refresh offers
            setTimeout(() => {
              fetchOffers()
            }, 2000)

          } catch (error) {
            console.error('Error completing survey:', error)
            toast.dismiss()
            toast.error('Survey completed but there was an error processing rewards')
          }
        }, 2000)
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
    <div className="min-h-screen bg-gradient-subtle p-2 sm:p-4 pb-20">
      <div className="max-w-md mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-subtle/95 backdrop-blur-sm py-4 -mx-2 px-2 sm:-mx-4 sm:px-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/earn')}
              className="p-1.5 sm:p-2"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            <h1 className="text-lg sm:text-xl font-bold text-foreground">BitLabs Surveys</h1>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={refreshOffers}
              disabled={refreshing}
              className="p-1.5 sm:p-2"
            >
              <RefreshCw className={`h-4 w-4 sm:h-5 sm:w-5 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Balance */}
        <div className="bg-primary/10 rounded-lg p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-muted-foreground">Current Balance</p>
              <p className="text-xl sm:text-2xl font-bold text-primary">
                ₦{profile?.wallet_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <Coins className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
          </div>
        </div>

        {/* Info Card */}
        <Card className="border-accent/20">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-start space-x-2 sm:space-x-3">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium">How it works</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-relaxed">
                  Click surveys to open them in new tab. Complete surveys honestly to earn rewards. Payment credited automatically.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Offers List */}
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-semibold">Available Surveys</h2>
            <Badge variant="secondary" className="text-xs">
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
                className="border-accent/20 hover:border-primary/40 transition-colors cursor-pointer active:scale-[0.98]"
                onClick={() => handleOfferClick(offer)}
              >
                <CardHeader className="pb-2 sm:pb-3 p-3 sm:p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 sm:space-y-1 flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-base line-clamp-2">{offer.name}</CardTitle>
                      <CardDescription className="text-xs sm:text-sm line-clamp-2">
                        {offer.description}
                      </CardDescription>
                    </div>
                    <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent className="pt-0 p-3 sm:p-6 sm:pt-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4">
                      <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                        ₦{offer.reward}
                      </Badge>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span className="text-[10px] sm:text-xs">{offer.duration}min</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[10px] sm:text-xs">
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