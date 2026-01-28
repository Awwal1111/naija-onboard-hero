import { NotificationPermissionDialog } from './NotificationPermissionDialog'
import { usePushNotificationTriggers } from '@/hooks/usePushNotificationTriggers'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

/**
 * CRITICAL: In MiniPay, push notifications are disabled
 * The permission dialogs and realtime triggers cause flickering
 */
export const PushNotificationManager = () => {
  // CRITICAL: Skip entirely in MiniPay
  if (isMiniPayEnv) {
    return null;
  }

  // Initialize real-time push notification triggers (only in non-MiniPay)
  usePushNotificationTriggers()
  
  return <NotificationPermissionDialog />
}
