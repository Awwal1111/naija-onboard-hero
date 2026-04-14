import { Bell, BellOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOneSignalPush } from "@/hooks/useOneSignalPush"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export const PushNotificationToggle = () => {
  const { pushEnabled, loading, requestPushPermission, disablePushNotifications } = useOneSignalPush()

  const handleToggle = async () => {
    if (pushEnabled) {
      await disablePushNotifications()
    } else {
      await requestPushPermission()
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {pushEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Push Notifications
        </CardTitle>
        <CardDescription>
          {pushEnabled
            ? "You're receiving push notifications on this device"
            : "Enable push notifications to stay updated even when the app is closed"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleToggle}
          variant={pushEnabled ? "outline" : "default"}
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Setting up...
            </>
          ) : pushEnabled ? (
            <>
              <BellOff className="mr-2 h-4 w-4" />
              Disable Push Notifications
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Enable Push Notifications
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
