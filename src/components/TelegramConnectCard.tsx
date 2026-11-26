import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, CheckCircle2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

const TelegramConnectCard = () => {
  const { user } = useAuth()
  const { profile, refetch } = useProfile()
   const [checking, setChecking] = useState(false)
  
  const isConnected = !!profile?.telegram_user_id
  const telegramLink = 'https://t.me/NaijaLancersBot'

  const handleConnectTelegram = () => {
    // Open Telegram with deep link
    window.open(telegramLink, '_blank')
    toast.success('In Telegram, send /login followed by your account email. Verify using the code sent to your email.')
  }

  const handleCheckConnection = async () => {
    setChecking(true)
    
    // Wait a moment then refetch profile
    await new Promise(resolve => setTimeout(resolve, 1000))
    await refetch()
    const { data: refreshedProfile } = await supabase.from('profiles').select('telegram_user_id').eq('user_id', user?.id || '').maybeSingle()
    setChecking(false)
    
    if (refreshedProfile?.telegram_user_id) {
      toast.success('✅ Successfully connected to Telegram!')
    } else {
      toast.error('Not connected yet. Complete /login and /verify in the Telegram bot first.')
    }
  }



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-lg">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-500" />
            <span>Telegram Notifications</span>
          </div>
          {isConnected && (
            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
            <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">
              ✅ Successfully Connected
            </p>
            <p className="text-xs text-muted-foreground">
              You'll receive instant notifications for deposits, withdrawals, jobs, and tasks via Telegram.
            </p>
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Connect to receive real-time notifications about your account activity, new opportunities, and important updates directly in Telegram.
            </p>
          </div>
        )}

        <Button
          onClick={handleConnectTelegram}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white"
          size="lg"
        >
          <Send className="h-4 w-4 mr-2" />
          {isConnected ? 'Open Telegram Bot' : 'Connect Telegram Bot'}
          <ExternalLink className="h-3 w-3 ml-2" />
        </Button>
        
        {!isConnected && (
          <div className="space-y-2">
            <p className="text-xs text-center text-muted-foreground">
              Click the button, send /login your@email.com in the bot, then enter the code emailed to you. Check status below.
            </p>
            <Button
              onClick={handleCheckConnection}
              disabled={checking}
              variant="outline"
              className="w-full"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {checking ? 'Checking...' : 'Check Connection'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TelegramConnectCard
