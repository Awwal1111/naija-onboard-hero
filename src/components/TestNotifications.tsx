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
    if (!('Notification' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Push notifications are not supported in this browser',
        variant: 'destructive',
      });
      return;
    }

    if (Notification.permission === 'denied') {
      toast({
        title: 'Permission Denied',
        description: 'Please enable notifications in Settings',
        variant: 'destructive',
      });
      return;
    }

    if (Notification.permission !== 'granted') {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
    }

    new Notification('Test Notification', {
      body: 'This is a test push notification from NaijaLancers',
      icon: '/logo.png',
      badge: '/logo.png',
    });

    toast({
      title: 'Push Sent!',
      description: 'You should see a browser notification',
    });
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
          className="w-full"
          variant="outline"
        >
          <Bell className="mr-2 h-4 w-4" />
          Test Push Notification
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
          <p><strong>Note:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Email requires RESEND_API_KEY to be configured</li>
            <li>Push notifications require browser permission</li>
            <li>In-app notifications appear in the bell icon</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
