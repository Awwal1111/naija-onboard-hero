import React, { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useNotifications } from '@/hooks/useNotifications'
import { useAuth } from '@/hooks/useAuth'

export const NotificationPermissionDialog = () => {
  const { user } = useAuth()
  const { pushEnabled, requestPushPermission } = useNotifications()
  const [open, setOpen] = useState(false)
  const [hasShown, setHasShown] = useState(false)

  useEffect(() => {
    // Re-prompt every 3 days if still not enabled (was once-per-session — too easy to miss).
    // Skip on browsers without Notification API (e.g. some WebViews) so the dialog
    // doesn't ask for a permission the browser can't grant.
    if (!user || pushEnabled || hasShown) return
    if (typeof window === 'undefined' || !('Notification' in window) || !('PushManager' in window)) return
    if (Notification.permission === 'denied') return

    const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000
    const lastShown = Number(localStorage.getItem('notification-prompt-last') || 0)
    if (Date.now() - lastShown < COOLDOWN_MS) return

    const timer = setTimeout(() => {
      setOpen(true)
      setHasShown(true)
      localStorage.setItem('notification-prompt-last', String(Date.now()))
    }, 2000)
    return () => clearTimeout(timer)
  }, [user, pushEnabled, hasShown])

  const handleEnable = async () => {
    const success = await requestPushPermission()
    if (success) {
      setOpen(false)
    }
  }

  const handleDismiss = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogTitle className="text-xl">Stay Updated with NaijaLancers</DialogTitle>
          <DialogDescription className="text-base">
            Enable notifications to get instant updates about:
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>New messages and connections</li>
              <li>Job applications and opportunities</li>
              <li>Wallet transactions and payments</li>
              <li>Comments and engagement on your posts</li>
            </ul>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-col gap-2">
          <Button onClick={handleEnable} className="w-full">
            <Bell className="mr-2 h-4 w-4" />
            Enable Notifications
          </Button>
          <Button variant="ghost" onClick={handleDismiss} className="w-full">
            Not Now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
