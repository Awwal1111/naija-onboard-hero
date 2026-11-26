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
  // Always call hooks in a stable order; the hook itself skips MiniPay subscriptions.
  usePushNotificationTriggers()

  // CRITICAL: Skip the permission dialog entirely in MiniPay
  if (isMiniPayEnv) return null
  
  return <NotificationPermissionDialog />
}
