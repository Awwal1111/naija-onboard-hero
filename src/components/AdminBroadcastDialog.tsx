import React, { useState } from 'react'
import { Send, Users, MessageCircle, Bell } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { BrandInput } from '@/components/ui/brand-input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'

interface AdminBroadcastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AdminBroadcastDialog: React.FC<AdminBroadcastDialogProps> = ({ open, onOpenChange }) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [targetAudience, setTargetAudience] = useState<'all' | 'experts' | 'active'>('all')
  const [channels, setChannels] = useState({
    inApp: true,
    push: true,
    email: false,
    telegram: false
  })
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast({ title: 'Error', description: 'Please enter a message', variant: 'destructive' })
      return
    }

    setSending(true)
    
    try {
      // Get target users based on audience
      let query = supabase.from('profiles').select('user_id, full_name')
      
      if (targetAudience === 'experts') {
        query = query.eq('is_expert', true)
      } else if (targetAudience === 'active') {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        query = query.gte('updated_at', thirtyDaysAgo.toISOString())
      }

      const { data: users, error: usersError } = await query
      
      if (usersError) throw usersError
      
      if (!users || users.length === 0) {
        toast({ title: 'No Users', description: 'No users match the selected criteria', variant: 'destructive' })
        setSending(false)
        return
      }

      let successCount = 0
      let failCount = 0

      // Send notifications to each user
      for (const targetUser of users) {
        try {
          // Create in-app notification
          if (channels.inApp) {
            await supabase.from('notifications').insert({
              user_id: targetUser.user_id,
              type: 'admin_broadcast',
              title: title || 'Message from NaijaLancers',
              message: message,
              data: { from: 'admin', broadcast: true }
            })
          }

          // Send push notification
          if (channels.push) {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                user_id: targetUser.user_id,
                title: title || 'NaijaLancers',
                body: message.substring(0, 200),
                data: { type: 'admin_broadcast' }
              }
            })
          }

          // Send telegram notification
          if (channels.telegram) {
            await supabase.functions.invoke('send-telegram-notification', {
              body: {
                user_id: targetUser.user_id,
                message: `📢 *${title || 'Admin Message'}*\n\n${message}`
              }
            })
          }

          successCount++
        } catch (err) {
          console.error(`Failed to send to user ${targetUser.user_id}:`, err)
          failCount++
        }
      }

      toast({
        title: 'Broadcast Sent',
        description: `Successfully sent to ${successCount} users${failCount > 0 ? `, ${failCount} failed` : ''}`
      })
      
      // Reset form
      setTitle('')
      setMessage('')
      onOpenChange(false)
      
    } catch (error: any) {
      console.error('Broadcast error:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to send broadcast',
        variant: 'destructive'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Broadcast Message
          </DialogTitle>
          <DialogDescription>
            Send a message to multiple users at once
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (Optional)</Label>
            <BrandInput
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Notification title..."
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Target Audience */}
          <div className="space-y-2">
            <Label>Target Audience</Label>
            <RadioGroup value={targetAudience} onValueChange={(v) => setTargetAudience(v as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                  <Users className="h-4 w-4" />
                  All Users
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="experts" id="experts" />
                <Label htmlFor="experts" className="flex items-center gap-2 cursor-pointer">
                  ⭐ Experts Only
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="active" id="active" />
                <Label htmlFor="active" className="flex items-center gap-2 cursor-pointer">
                  🟢 Active Users (last 30 days)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Channels */}
          <div className="space-y-2">
            <Label>Notification Channels</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="inApp"
                  checked={channels.inApp}
                  onCheckedChange={(c) => setChannels({ ...channels, inApp: !!c })}
                />
                <Label htmlFor="inApp" className="flex items-center gap-2 cursor-pointer">
                  <Bell className="h-4 w-4" />
                  In-App
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="push"
                  checked={channels.push}
                  onCheckedChange={(c) => setChannels({ ...channels, push: !!c })}
                />
                <Label htmlFor="push" className="flex items-center gap-2 cursor-pointer">
                  📱 Push
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="telegram"
                  checked={channels.telegram}
                  onCheckedChange={(c) => setChannels({ ...channels, telegram: !!c })}
                />
                <Label htmlFor="telegram" className="flex items-center gap-2 cursor-pointer">
                  ✈️ Telegram
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="email"
                  checked={channels.email}
                  onCheckedChange={(c) => setChannels({ ...channels, email: !!c })}
                  disabled
                />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer text-muted-foreground">
                  📧 Email (coming soon)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending || !message.trim()}>
            {sending ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Broadcast
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}