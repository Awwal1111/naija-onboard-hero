import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Send, Copy, CheckCircle2, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { toast } from 'sonner'

const TelegramConnectCard = () => {
  const { user } = useAuth()
  const { profile, refetch } = useProfile()
  const [copied, setCopied] = useState(false)
  const [checking, setChecking] = useState(false)
  
  const isConnected = !!profile?.telegram_user_id
  const referralCode = profile?.referral_code || user?.email || ''
  const telegramLink = `https://t.me/NaijaLancersBot?start=${referralCode}`

  const handleConnectTelegram = () => {
    // Open Telegram with deep link
    window.open(telegramLink, '_blank')
    toast.success('Opening Telegram bot... After you send /start, click "Check Connection" below.')
  }

  const handleCheckConnection = async () => {
    setChecking(true)
    
    // Wait a moment then refetch profile
    await new Promise(resolve => setTimeout(resolve, 1000))
    await refetch()
    
    setChecking(false)
    
    if ((profile as any)?.telegram_user_id) {
      toast.success('✅ Successfully connected to Telegram!')
    } else {
      toast.error('Not connected yet. Make sure you sent /start to @NaijaLancersBot')
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    toast.success('Referral code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-gradient-to-br from-accent to-muted border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            <span>Telegram Bot</span>
          </div>
          {isConnected && (
            <Badge className="bg-primary/10 text-primary border-primary/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isConnected 
            ? '✅ You\'re connected! Get instant notifications for jobs, tasks, and earnings.'
            : '🚀 Connect your Telegram to get real-time notifications and manage your account on-the-go!'}
        </p>

        {!isConnected && (
          <div className="bg-card rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Your Connection Code:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-muted text-foreground px-3 py-2 rounded text-sm font-mono">
                {referralCode}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyCode}
                className="shrink-0"
              >
                {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Button
            onClick={handleConnectTelegram}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Send className="h-4 w-4 mr-2" />
            {isConnected ? 'Open Telegram Bot' : 'Connect to Telegram Bot'}
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
          
          {!isConnected && (
            <>
              <p className="text-xs text-center text-muted-foreground">
                After opening Telegram, the bot will automatically send you instructions
              </p>
              <Button
                onClick={handleCheckConnection}
                disabled={checking}
                variant="outline"
                className="w-full"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {checking ? 'Checking...' : 'Check Connection Status'}
              </Button>
            </>
          )}
        </div>

        {isConnected && (
          <div className="text-xs text-muted-foreground space-y-1">
            <p>💬 <strong>Features:</strong></p>
            <ul className="ml-4 space-y-1">
              <li>• Check balance & transactions</li>
              <li>• Make deposits & withdrawals</li>
              <li>• Get job & task alerts</li>
              <li>• Quick support access</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TelegramConnectCard
