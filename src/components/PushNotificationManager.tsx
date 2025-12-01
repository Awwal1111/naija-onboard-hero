import { NotificationPermissionDialog } from './NotificationPermissionDialog'
import { usePushNotificationTriggers } from '@/hooks/usePushNotificationTriggers'

export const PushNotificationManager = () => {
  // Initialize real-time push notification triggers
  usePushNotificationTriggers()
  
  return <NotificationPermissionDialog />
}
