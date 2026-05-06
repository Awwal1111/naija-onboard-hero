# Telegram Notifications Setup Complete! 🎉

## What's Been Implemented

### 1. **Real-Time Notifications** ✅
Automated Telegram alerts are now triggered for:

- **Connection Requests**: When someone sends you a connection request
- **Connection Accepted**: When your connection request is accepted
- **New Messages**: When you receive a new chat message
- **Withdrawal Updates**: Status changes (approved, rejected, completed)
- **Job Alerts**: New jobs matching your skills
- **Job Applications**: When someone applies to your job posting
- **Task Posted**: When new social/referral tasks are available
- **Task Approval**: When your task submission is approved/rejected

### 2. **Daily Reminders** 📅
Two edge functions created:
- `send-telegram-notification`: Reusable function for sending Telegram messages
- `daily-telegram-reminders`: Sends daily reminders at 9 AM for:
  - Users who haven't signed in today (daily signin reminder)
  - Available tasks waiting to be completed

### 3. **Database Triggers** 🔔
All triggers are set up and active:
- `on_connection_request` - New connection requests
- `on_connection_accepted` - Connection accepted
- `on_new_message` - New chat messages
- `on_withdrawal_status_change` - Withdrawal updates
- `on_new_job_posting` - Job alerts (skill matching)
- `on_new_social_task` - New social tasks
- `on_new_referral_task` - New referral tasks
- `on_task_approval` - Task completion status
- `on_job_application` - New job applications

## ⚠️ Action Required: Set Up Daily Cron Job

To enable daily reminders, you need to schedule the cron job. Follow these steps:

### Step 1: Enable pg_cron Extension
Run this SQL in your Supabase SQL Editor:

```sql
-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### Step 2: Schedule Daily Reminders (9 AM UTC)
Run this SQL to schedule daily reminders:

```sql
SELECT cron.schedule(
  'daily-telegram-reminders-9am',
  '0 9 * * *', -- Every day at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
        url := 'https://your-project.supabase.co/functions/v1/daily-telegram-reminders',
        headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_SERVICE_ROLE_KEY_OR_SECURE_TOKEN"}'::jsonb,
        body := concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);
```

### Step 3: Verify Cron Job (Optional)
Check if the cron job was created successfully:

```sql
SELECT * FROM cron.job;
```

### Step 4: Test Manually (Optional)
You can manually trigger the reminders to test:

```sql
SELECT
  net.http_post(
      url := 'https://your-project-ref.supabase.co/functions/v1/daily-telegram-reminders',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SUPABASE_ANON_KEY"}'::jsonb,
      body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
```

## How It Works

### Real-Time Notifications
1. User performs an action (sends connection request, posts job, etc.)
2. Database trigger fires automatically
3. Trigger calls `notify_telegram()` function
4. Function makes HTTP request to `send-telegram-notification` edge function
5. Edge function looks up user's Telegram ID
6. Message is sent via Telegram Bot API

### Daily Reminders
1. Cron job runs at 9 AM UTC every day
2. Calls `daily-telegram-reminders` edge function
3. Function queries users who:
   - Have Telegram linked
   - Haven't signed in today
   - Have available tasks to complete
4. Sends personalized reminders via Telegram

## Notification Examples

### Connection Request
```
👥 New Connection Request!

John Doe wants to connect with you!

Open the app to accept or decline.
```

### Job Alert (Skill Match)
```
🔔 New Job Alert!

*Web Developer Needed*
Budget: ₦50000

This job matches your skills! Apply now to secure it. 🚀

Open the app to view details.
```

### Daily Signin Reminder
```
🌅 Good morning Alice!

Don't forget to claim your daily signin bonus today! 💰

Visit the app and get your reward. Streak bonuses available! 🔥
```

### Task Approval
```
✅ Task Approved!

Your submission for *Follow us on Twitter* has been approved!

Reward: ₦20 NC credited to your account! 💰

Keep completing tasks to earn more! 🚀
```

## Monitoring & Debugging

### Check Edge Function Logs
- View `send-telegram-notification` logs in Supabase dashboard
- View `daily-telegram-reminders` logs in Supabase dashboard

### Check Cron Job Status
```sql
-- View all cron jobs
SELECT * FROM cron.job;

-- View cron job execution history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

### Disable a Cron Job (if needed)
```sql
SELECT cron.unschedule('daily-telegram-reminders-9am');
```

## Customization

### Change Reminder Time
To send reminders at a different time, modify the cron schedule:
- `0 8 * * *` = 8 AM UTC
- `0 12 * * *` = 12 PM UTC
- `0 18 * * *` = 6 PM UTC

### Add More Notifications
To add more automated notifications:
1. Create trigger function similar to existing ones
2. Create trigger on relevant table
3. Use `notify_telegram()` function to send message

## Notes
- All notifications respect Telegram linking (only users with `telegram_user_id` receive notifications)
- Notifications are non-blocking (won't slow down app operations)
- Failed notifications are logged but don't affect app functionality
- Users can unlink Telegram anytime to stop notifications

## Support
If notifications aren't working:
1. Check Telegram bot token is configured
2. Verify user has linked Telegram account
3. Check edge function logs for errors
4. Ensure pg_net extension is enabled
5. Verify cron job is scheduled correctly
