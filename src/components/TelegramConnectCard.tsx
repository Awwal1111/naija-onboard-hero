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
  const { profile } = useProfile()
  const [copied, setCopied] = useState(false)
  
  const isConnected = !!(profile as any)?.telegram_user_id
  const referralCode = profile?.referral_code || user?.email || ''
  const telegramLink = `https://t.me/NaijaLancersBot?start=${referralCode}`

  const handleConnectTelegram = () => {
    window.open(telegramLink, '_blank')
    toast.success('Opening Telegram bot...')
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode)
    setCopied(true)
    toast.success('Referral code copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-blue-900 dark:text-blue-100">Telegram Bot</span>
          </div>
          {isConnected && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 border-green-300 dark:border-green-700">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {isConnected 
            ? '✅ You\'re connected! Get instant notifications for jobs, tasks, and earnings.'
            : '🚀 Connect your Telegram to get real-time notifications and manage your account on-the-go!'}
        </p>

        {!isConnected && (
          <div className="bg-white dark:bg-blue-950 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-700 dark:text-blue-300 mb-2 font-medium">Your Connection Code:</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-blue-50 dark:bg-blue-900 text-blue-900 dark:text-blue-100 px-3 py-2 rounded text-sm font-mono">
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Send className="h-4 w-4 mr-2" />
            {isConnected ? 'Open Telegram Bot' : 'Connect to Telegram Bot'}
            <ExternalLink className="h-3 w-3 ml-2" />
          </Button>
          
          {!isConnected && (
            <p className="text-xs text-center text-blue-700 dark:text-blue-300">
              Click the button above and send <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">/start {referralCode}</code> to the bot
            </p>
          )}
        </div>

        {isConnected && (
          <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
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
