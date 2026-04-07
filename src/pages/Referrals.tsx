import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  ArrowLeft, Users, Copy, Gift, UserPlus, CheckCircle, Clock, Sparkles, Trophy, Share2, Shield, Loader2
} from 'lucide-react'
import { toast } from 'sonner'
import { ReferralLeaderboard } from '@/components/ReferralLeaderboard'
import { ShareButtons } from '@/components/ShareButtons'

interface Referral {
  id: string
  referee_id: string
  points_earned: number
  status: string
  created_at: string
  completed_at: string | null
  referee: {
    full_name: string | null
    profile_picture_url: string | null
  } | null
}

export const Referrals = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (user) fetchReferrals()
  }, [user])

  const fetchReferrals = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('referrals')
        .select(`*, referee:profiles!referrals_referee_id_fkey (full_name, profile_picture_url)`)
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
    toast.success('Referral link copied!')
  }

  const submitReferralCode = async () => {
    if (!user || !referralCode.trim()) return
    setIsSubmitting(true)
    try {
      const { data, error } = await supabase.functions.invoke('validate-referral', {
        body: { referral_code: referralCode.trim() }
      })

      if (error) {
        toast.error('Failed to process referral')
        return
      }

      if (data?.error) {
        toast.error(data.error)
        return
      }

      toast.success(data?.message || 'Referral applied!')
      setReferralCode('')
      fetchReferrals()
    } catch (error) {
      console.error('Referral error:', error)
      toast.error('Failed to apply referral code')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!user || !profile) {
    return <div className="min-h-screen bg-gradient-subtle p-4 flex items-center justify-center">
      <div className="text-center">Loading...</div>
    </div>
  }

  const pendingReferrals = referrals.filter(r => r.status === 'pending').length
  const completedReferrals = referrals.filter(r => r.status === 'completed').length
  const totalEarned = referrals.filter(r => r.status === 'completed').length * 50

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 pb-24">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-8">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="p-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Referrals</h1>
          <div className="w-10" />
        </div>

        {/* Hero Card */}
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 overflow-hidden">
          <CardContent className="pt-6 space-y-4">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 mb-3">
                <Gift className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Earn ₦50 Per Referral</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Both you and your friend get ₦50 when they complete their profile
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="text-center p-3 bg-background/60 rounded-xl">
                <p className="text-xl font-bold text-primary">{completedReferrals}</p>
                <p className="text-[10px] text-muted-foreground">Completed</p>
              </div>
              <div className="text-center p-3 bg-background/60 rounded-xl">
                <p className="text-xl font-bold text-amber-600">{pendingReferrals}</p>
                <p className="text-[10px] text-muted-foreground">Pending</p>
              </div>
              <div className="text-center p-3 bg-background/60 rounded-xl">
                <p className="text-xl font-bold text-green-600">₦{totalEarned}</p>
                <p className="text-[10px] text-muted-foreground">Earned</p>
              </div>
            </div>

            {/* Share */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-2.5 bg-background/60 rounded-lg">
                <code className="flex-1 text-sm font-mono text-primary truncate">{profile.referral_code}</code>
                <Button variant="ghost" size="sm" onClick={copyReferralLink} className="p-1.5 h-auto">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <ShareButtons
                title="Join NaijaLancers"
                text={`🚀 Join NaijaLancers & get ₦50 instantly! Use my code: ${profile.referral_code}`}
                url={`/signup?ref=${profile.referral_code}`}
                className="justify-center"
                showLabels
              />
            </div>
          </CardContent>
        </Card>

        {/* Apply Code */}
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />
              Have a Referral Code?
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter code"
                value={referralCode}
                onChange={e => setReferralCode(e.target.value.toUpperCase())}
                className="flex-1"
                maxLength={10}
              />
              <Button onClick={submitReferralCode} disabled={!referralCode.trim() || isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Apply'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Anti-cheat info */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground">
          <Shield className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
          <p>Referrals are verified for authenticity. Accounts sharing the same IP or device will not receive rewards.</p>
        </div>

        {/* Leaderboard */}
        <ReferralLeaderboard />

        {/* Referral List */}
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-5 w-5 text-primary" />
              Your Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-4">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
              </div>
            ) : referrals.length === 0 ? (
              <div className="text-center py-6">
                <UserPlus className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No referrals yet. Share your code!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {referrals.map((referral) => (
                  <div key={referral.id} className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{referral.referee?.full_name || 'Anonymous'}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {referral.status === 'completed' ? (
                      <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" /> ₦50
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* How it Works */}
        <Card className="border-accent/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 text-sm text-muted-foreground">
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                <span className="text-xs text-primary font-bold">1</span>
              </div>
              <p>Share your referral code with friends</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                <span className="text-xs text-primary font-bold">2</span>
              </div>
              <p>They sign up and enter your code</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center shrink-0">
                <span className="text-xs text-primary font-bold">3</span>
              </div>
              <p>Once they complete their profile, <strong>both of you get ₦50 NC</strong></p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
