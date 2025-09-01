import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft,
  Share,
  Users,
  Copy,
  Gift,
  UserPlus,
  Coins,
  CheckCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

interface Referral {
  id: string
  referee_id: string
  points_earned: number
  status: string
  created_at: string
  completed_at: string | null
  profiles: {
    full_name: string | null
    profile_picture_url: string | null
  }
}

export const Referrals = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState('')

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    fetchReferrals()
  }, [user, navigate])

  const fetchReferrals = async () => {
    if (!user) return

    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`
          *,
          profiles!referrals_referee_id_fkey (
            full_name,
            profile_picture_url
          )
        `)
        .eq('referrer_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReferrals(data || [])
    } catch (error) {
      console.error('Error fetching referrals:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyReferralLink = () => {
    const referralLink = `${window.location.origin}/signup?ref=${profile?.referral_code}`
    navigator.clipboard.writeText(referralLink)
    toast.success('Referral link copied to clipboard!')
  }

  const shareReferralCode = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Join NaijaLancers',
        text: `Join me on NaijaLancers! Use my referral code: ${profile?.referral_code}`,
        url: `${window.location.origin}/signup?ref=${profile?.referral_code}`
      })
    } else {
      copyReferralLink()
    }
  }

  const submitReferralCode = async () => {
    if (!user || !referralCode.trim()) return

    try {
      // Find the referrer by referral code
      const { data: referrerData, error: referrerError } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('referral_code', referralCode.trim().toUpperCase())
        .single()

      if (referrerError || !referrerData) {
        toast.error('Invalid referral code')
        return
      }

      if (referrerData.user_id === user.id) {
        toast.error('You cannot refer yourself')
        return
      }

      // Create referral record
      const { error: referralError } = await supabase
        .from('referrals')
        .insert([{
          referrer_id: referrerData.user_id,
          referee_id: user.id,
          status: 'pending'
        }])

      if (referralError) {
        if (referralError.code === '23505') {
          toast.error('Referral code already used')
        } else {
          throw referralError
        }
        return
      }

      toast.success('Referral code applied! You and your referrer will earn rewards when you reach ₦1000.')
      setReferralCode('')
    } catch (error) {
      console.error('Error applying referral code:', error)
      toast.error('Failed to apply referral code')
    }
  }

  if (!user || !profile) {
    return <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>
  }

  const pendingReferrals = referrals.filter(r => r.status === 'pending').length
  const completedReferrals = referrals.filter(r => r.status === 'completed').length
  const totalEarned = referrals.reduce((sum, r) => sum + r.points_earned, 0)

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pt-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/tap-earn')}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Referrals</h1>
          <div className="w-10" />
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="border-accent/20">
            <CardContent className="p-3 text-center">
              <Users className="h-6 w-6 text-primary mx-auto mb-1" />
              <p className="text-lg font-bold text-primary">{referrals.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="border-accent/20">
            <CardContent className="p-3 text-center">
              <Clock className="h-6 w-6 text-orange-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-orange-500">{pendingReferrals}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card className="border-accent/20">
            <CardContent className="p-3 text-center">
              <Coins className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-lg font-bold text-green-500">₦{totalEarned}</p>
              <p className="text-xs text-muted-foreground">Earned</p>
            </CardContent>
          </Card>
        </div>

        {/* Your Referral Code */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Share className="h-5 w-5 text-primary" />
              <span>Your Referral Code</span>
            </CardTitle>
            <CardDescription>
              Share this code with friends to earn ₦100 when they reach ₦1000
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <p className="text-2xl font-mono font-bold text-primary">
                {profile.referral_code}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={copyReferralLink} variant="outline" className="flex-1">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={shareReferralCode} className="flex-1">
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Apply Referral Code */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Gift className="h-5 w-5 text-primary" />
              <span>Have a Referral Code?</span>
            </CardTitle>
            <CardDescription>
              Enter a friend's referral code to get started
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter referral code"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                className="flex-1"
              />
              <Button 
                onClick={submitReferralCode}
                disabled={!referralCode.trim()}
              >
                Apply
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral List */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-primary" />
              <span>Your Referrals</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-6">
                <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No referrals yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Share your code to start earning!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.map((referral, index) => (
                  <div key={referral.id}>
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {referral.profiles?.full_name || 'Anonymous User'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(referral.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {referral.status === 'completed' ? (
                          <>
                            <Badge variant="secondary" className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              ₦{referral.points_earned}
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <Clock className="h-3 w-3 mr-1" />
                            Pending
                          </Badge>
                        )}
                      </div>
                    </div>
                    {index < referrals.length - 1 && <Separator />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="border-accent/20">
          <CardHeader>
            <CardTitle className="text-lg">How Referrals Work</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                <span className="text-xs text-primary font-bold">1</span>
              </div>
              <p>Share your referral code with friends</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                <span className="text-xs text-primary font-bold">2</span>
              </div>
              <p>They sign up using your code</p>
            </div>
            <div className="flex items-start space-x-3">
              <div className="bg-primary/10 rounded-full p-1 mt-0.5">
                <span className="text-xs text-primary font-bold">3</span>
              </div>
              <p>When they earn ₦1000, you both get ₦100!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}