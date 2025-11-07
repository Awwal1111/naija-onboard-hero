import { useState, useEffect } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Bell, Mail, MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotificationSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    telegram_notifications: true,
    push_notifications: true,
    connection_requests: true,
    messages: true,
    job_alerts: true,
    task_notifications: true,
    withdrawal_updates: true,
    marketing_emails: false,
    daily_digest: true,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPreferences();
  }, [user]);

  const fetchPreferences = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code === "PGRST116") {
        // No preferences found, create default
        const { data: newPrefs, error: insertError } = await supabase
          .from("notification_preferences")
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        data = newPrefs;
      } else if (error) {
        throw error;
      }

      if (data) {
        setPreferences({
          email_notifications: data.email_notifications,
          telegram_notifications: data.telegram_notifications,
          push_notifications: data.push_notifications,
          connection_requests: data.connection_requests,
          messages: data.messages,
          job_alerts: data.job_alerts,
          task_notifications: data.task_notifications,
          withdrawal_updates: data.withdrawal_updates,
          marketing_emails: data.marketing_emails,
          daily_digest: data.daily_digest,
        });
      }
    } catch (error) {
      console.error("Error fetching preferences:", error);
      toast({
        title: "Error",
        description: "Failed to load notification preferences",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = async (key: string, value: boolean) => {
    if (!user) return;

    const newPreferences = { ...preferences, [key]: value };
    setPreferences(newPreferences);

    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update({ [key]: value })
        .eq("user_id", user.id);

      if (error) throw error;
    } catch (error) {
      console.error("Error updating preference:", error);
      // Revert on error
      setPreferences(preferences);
      toast({
        title: "Error",
        description: "Failed to update preference",
        variant: "destructive",
      });
    }
  };

  const saveAllPreferences = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("notification_preferences")
        .update(preferences)
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Notification preferences updated successfully",
      });
    } catch (error) {
      console.error("Error saving preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save preferences",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const SettingRow = ({
    label,
    description,
    checked,
    onCheckedChange,
    icon: Icon,
  }: {
    label: string;
    description: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    icon: any;
  }) => (
    <div className="flex items-center justify-between py-4">
      <div className="flex items-start gap-3 flex-1">
        <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
        <div>
          <Label htmlFor={label} className="cursor-pointer font-medium">
            {label}
          </Label>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <Switch
        id={label}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={loading}
      />
    </div>
  );

  return (
    <ResponsiveLayout>
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Notification Settings
          </h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Notification Channels</CardTitle>
            <CardDescription>
              Choose how you want to receive notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SettingRow
              label="Email Notifications"
              description="Receive notifications via email"
              checked={preferences.email_notifications}
              onCheckedChange={(val) => togglePreference("email_notifications", val)}
              icon={Mail}
            />
            <Separator />
            <SettingRow
              label="Telegram Notifications"
              description="Get instant notifications on Telegram"
              checked={preferences.telegram_notifications}
              onCheckedChange={(val) => togglePreference("telegram_notifications", val)}
              icon={Send}
            />
            <Separator />
            <SettingRow
              label="Push Notifications"
              description="Browser push notifications"
              checked={preferences.push_notifications}
              onCheckedChange={(val) => togglePreference("push_notifications", val)}
              icon={Bell}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Notifications</CardTitle>
            <CardDescription>
              Control what activities trigger notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <SettingRow
              label="Connection Requests"
              description="When someone sends you a connection request"
              checked={preferences.connection_requests}
              onCheckedChange={(val) => togglePreference("connection_requests", val)}
              icon={MessageSquare}
            />
            <Separator />
            <SettingRow
              label="New Messages"
              description="When you receive a new message"
              checked={preferences.messages}
              onCheckedChange={(val) => togglePreference("messages", val)}
              icon={MessageSquare}
            />
            <Separator />
            <SettingRow
              label="Job Alerts"
              description="When new jobs match your skills"
              checked={preferences.job_alerts}
              onCheckedChange={(val) => togglePreference("job_alerts", val)}
              icon={Bell}
            />
            <Separator />
            <SettingRow
              label="Task Notifications"
              description="Updates about new tasks and task completions"
              checked={preferences.task_notifications}
              onCheckedChange={(val) => togglePreference("task_notifications", val)}
              icon={Bell}
            />
            <Separator />
            <SettingRow
              label="Withdrawal Updates"
              description="Status changes on your withdrawal requests"
              checked={preferences.withdrawal_updates}
              onCheckedChange={(val) => togglePreference("withdrawal_updates", val)}
              icon={Bell}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Other Preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <SettingRow
              label="Marketing Emails"
              description="Promotional content and special offers"
              checked={preferences.marketing_emails}
              onCheckedChange={(val) => togglePreference("marketing_emails", val)}
              icon={Mail}
            />
            <Separator />
            <SettingRow
              label="Daily Digest"
              description="Daily summary of your activity"
              checked={preferences.daily_digest}
              onCheckedChange={(val) => togglePreference("daily_digest", val)}
              icon={Mail}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button onClick={saveAllPreferences} disabled={saving}>
            {saving ? "Saving..." : "Save All Changes"}
          </Button>
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default NotificationSettings;
