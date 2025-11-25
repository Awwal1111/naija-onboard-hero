import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Mail, FileText, Bell } from 'lucide-react';

export const TestNotifications = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const testEmailWithPDF = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: user.id,
          type: 'transaction',
          title: 'Test Transaction Receipt',
          message: 'This is a test transaction notification with PDF receipt',
          sendEmail: true,
          emailTemplate: 'transaction',
          attachPDF: true,
          transactionData: {
            transactionType: 'Deposit',
            amount: '₦5,000',
            reference: 'TEST-' + Date.now(),
            date: new Date().toLocaleDateString(),
            status: 'Completed',
            description: 'Test deposit transaction'
          }
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Email Sent!',
        description: 'Check your email for the PDF receipt',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testPushNotification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Check browser support
      if (!('Notification' in window)) {
        throw new Error('Push notifications not supported in this browser');
      }

      console.log('Current notification permission:', Notification.permission);

      // Check permission
      if (Notification.permission !== 'granted') {
        toast({
          title: 'Permission Required',
          description: 'Click "Enable Push Notifications" in Settings to grant permission first',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if service worker is registered
      const registration = await navigator.serviceWorker.getRegistration();
      console.log('Service worker registration:', registration);
      
      if (!registration) {
        toast({
          title: 'Setup Required',
          description: 'Service worker not found. Please refresh the page and enable push notifications in Settings.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Check if user has a push subscription
      const subscription = await registration.pushManager.getSubscription();
      console.log('Current push subscription:', subscription);
      
      if (!subscription) {
        toast({
          title: 'Subscription Required',
          description: 'No active subscription found. Please click "Enable Push Notifications" in Settings to subscribe.',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      console.log('Sending push notification via edge function...');

      // Call the edge function to send push notification
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId: user.id,
          title: 'Test Push Notification',
          body: 'This is a test push notification from NaijaLancers!',
          icon: '/logo.png',
          badge: '/logo.png',
          url: '/',
          data: {
            test: true,
            timestamp: new Date().toISOString()
          }
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw error;
      }

      console.log('Push notification sent:', data);

      toast({
        title: 'Push Sent!',
        description: `Sent to ${data?.sent || 0} device(s). Check your browser for the notification.`,
      });
    } catch (error: any) {
      console.error('Push notification test error:', error);
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testInAppNotification = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase.functions.invoke('send-notification', {
        body: {
          userId: user.id,
          type: 'system',
          title: 'Test In-App Notification',
          message: 'This is a test in-app notification',
          sendEmail: false,
        }
      });

      if (error) throw error;
      
      toast({
        title: 'Notification Sent!',
        description: 'Check the notification bell icon',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Notifications System</CardTitle>
        <CardDescription>
          Test email notifications with PDF, push notifications, and in-app notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button
          onClick={testEmailWithPDF}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          <Mail className="mr-2 h-4 w-4" />
          Test Email + PDF Receipt
        </Button>
        
        <Button
          onClick={testPushNotification}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          <Bell className="mr-2 h-4 w-4" />
          Test Push Notification (Edge Function)
        </Button>
        
        <Button
          onClick={testInAppNotification}
          disabled={loading}
          className="w-full"
          variant="outline"
        >
          <FileText className="mr-2 h-4 w-4" />
          Test In-App Notification
        </Button>

        <div className="text-xs text-muted-foreground mt-4 space-y-2">
          <p><strong>Troubleshooting Steps:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>First, go to Settings and click "Enable Push Notifications"</li>
            <li>Check browser console for detailed logs during setup</li>
            <li>If already enabled, try disabling and re-enabling to create a fresh subscription</li>
            <li>Push notifications require VAPID_PRIVATE_KEY secret to be configured</li>
            <li>After enabling, use the "Test Push Notification" button above</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
