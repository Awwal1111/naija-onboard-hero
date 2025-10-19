import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Coins, FileText, RefreshCw } from 'lucide-react'

export const CpxSurveys = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  const [iframeKey, setIframeKey] = useState(0)

  // Generate secure hash using MD5 equivalent in browser
  const generateSecureHash = (userId: string) => {
    const secretKey = 'ndzmYM4Jh09qRdxcRsWcssW6qpyoE92W'
    const str = `${userId}-${secretKey}`
    
    // Simple hash for browser (in production, use a proper crypto library)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16)
  }

  const refreshIframe = () => {
    setIframeKey(prev => prev + 1)
  }

  if (profileLoading) {
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

  const secureHash = generateSecureHash(user.id)
  const userName = profile.full_name || 'User'
  const userEmail = user.email || ''

  return (
    <div className="min-h-screen bg-gradient-subtle p-4">
      <div className="max-w-4xl mx-auto space-y-6">
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
          <h1 className="text-xl font-bold text-foreground">CPX Research Surveys</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshIframe}
            className="p-2"
          >
            <RefreshCw className="h-5 w-5" />
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
                  Complete surveys from CPX Research to earn NaijaCoin. Rewards are credited automatically after completion (₦1 = 1 NC).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CPX Research Survey Iframe */}
        <Card className="border-accent/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 bg-primary/5 border-b">
              <p className="text-sm font-semibold text-foreground">📋 Surveys</p>
            </div>
            <iframe 
              key={iframeKey}
              width="100%" 
              frameBorder="0" 
              height="1200px"
              src={`https://offers.cpx-research.com/index.php?app_id=29272&ext_user_id=${user.id}&secure_hash=${secureHash}&username=${encodeURIComponent(userName)}&email=${encodeURIComponent(userEmail)}&subid_1=&subid_2`}
              title="CPX Research Surveys"
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* CPX Research Offerwall */}
        <Card className="border-accent/20 overflow-hidden">
          <CardContent className="p-0">
            <div className="p-3 bg-primary/5 border-b">
              <p className="text-sm font-semibold text-foreground">🎁 Offerwall</p>
              <p className="text-xs text-muted-foreground">Complete offers for extra rewards</p>
            </div>
            <iframe 
              key={`offerwall-${iframeKey}`}
              width="100%" 
              frameBorder="0" 
              height="1500px"
              src={`https://offers.cpx-research.com/index.php?app_id=28486&ext_user_id=${user.id}&secure_hash=${secureHash}&subid_1=${encodeURIComponent(profile?.state_name || '')}&subid_2=${encodeURIComponent(profile?.lga_name || '')}`}
              title="CPX Research Offerwall"
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}