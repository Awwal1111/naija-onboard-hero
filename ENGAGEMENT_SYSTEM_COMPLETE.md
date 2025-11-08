# Expert & User Engagement System

## Overview

Comprehensive engagement system implemented to keep users and experts active through welcome messages, weekly check-ins, and instant message notifications via Telegram.

## Features Implemented

### 1. Welcome Messages on Sign-In
**Edge Function:** `send-welcome-notification`

Sends personalized welcome messages when users sign into the platform.

#### Features:
- **Role-Based Messages**: Different messages for experts vs regular users
- **Personalized Content**: Uses user's name and role
- **Telegram Delivery**: Sent via Telegram for instant notification

#### Expert Welcome Message:
```
🎉 Welcome back, [Name]!

👨‍💼 Expert Dashboard

As an expert on NaijaLancers, you have access to:

✅ Premium job opportunities
✅ Direct client messaging
✅ Verified expert badge
✅ Priority support

💡 Tip: Keep your profile updated and respond to messages quickly to get more clients!

📊 Check your dashboard for new job opportunities and messages.
```

#### Regular User Welcome Message:
```
🎉 Welcome back, [Name]!

🚀 Getting Started

Here's what you can do today:

💰 Complete tasks and earn NC
📝 Post jobs and find experts
🎯 Claim your daily sign-in bonus
🤝 Connect with professionals

💡 Tip: Complete your profile to unlock more features!
```

#### Usage:
Called automatically after successful sign-in (integrated with `useAuth` hook).

---

### 2. Weekly "We Miss You" Check-In
**Edge Function:** `weekly-inactive-users-check`
**Scheduled:** Every 7 days

Identifies inactive users (no sign-in for 7+ days) and sends encouraging messages.

#### Features:
- **Inactivity Detection**: Checks `daily_signins` table for last sign-in
- **Role-Based Messaging**: Different content for experts vs users
- **Opportunity Alerts**: Mentions available jobs/tasks
- **Batch Processing**: Handles all inactive users with rate limiting

#### Expert "We Miss You" Message:
```
😔 We miss you, [Name]!

It's been a while since we've seen you. We hope you're doing well! 🙏

👨‍💼 As an expert, you're missing out on:

💼 New job opportunities from clients
💰 Potential earnings waiting for you
📩 Messages from interested clients
⭐ Building your reputation and ratings

🔥 Come back and check your dashboard!

Your expertise is valuable - don't let opportunities slip away! 🚀
```

#### Regular User "We Miss You" Message:
```
😔 We miss you, [Name]!

It's been a while since we've seen you. We hope you're doing well! 🙏

🎁 What's waiting for you:

💰 Daily sign-in bonuses (you're missing out!)
📋 New tasks to earn NC
🤝 Growing community of experts
🎯 New features and improvements

🔥 Come back and claim your rewards!

We've got exciting opportunities waiting for you! 🚀
```

#### Setup Required:
To activate the weekly check-in, you need to set up a cron job in Supabase:

```sql
-- Enable pg_cron and pg_net extensions first (if not already enabled)
-- Then schedule the weekly check:

SELECT cron.schedule(
  'weekly-inactive-users-check',
  '0 9 * * 1', -- Every Monday at 9:00 AM
  $$
  SELECT net.http_post(
    url:='https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/weekly-inactive-users-check',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4eWJxbXF1eW14a3Z4eHBpdWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NTg2NTAsImV4cCI6MjA3MjEzNDY1MH0.muLG6PAzyEllY7WHbz_SnUCvwhISPqqaQn0L-kP0VdA"}'::jsonb,
    body:=concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);
```

**Customize the schedule:**
- `0 9 * * 1` = Every Monday at 9:00 AM
- `0 9 * * 0` = Every Sunday at 9:00 AM
- `0 10 * * 1,4` = Every Monday and Thursday at 10:00 AM

---

### 3. Instant Message Notifications
**Edge Function:** `notify-message-received`

Sends instant Telegram notifications when users receive new chat messages.

#### Features:
- **Real-Time Alerts**: Triggered automatically when messages are sent
- **Smart Detection**: Only sends if recipient is inactive (last 5 minutes)
- **Rich Preview**: Shows sender name, role, and message preview
- **Media Support**: Handles images, videos, audio files

#### Notification Format:
```
💬 New Message!

From: John Doe (🌟 Expert)

"Hi, I'm interested in your job posting..."

🔔 Open the app to reply!
```

For media:
```
💬 New Message!

From: Jane Smith (User)

📷 Sent a file

🔔 Open the app to reply!
```

#### How It Works:
1. User A sends message to User B
2. System checks if User B is online (last 5 minutes)
3. If User B is offline, send Telegram notification
4. If User B is online, skip (they'll see it in the app)

#### Integration:
Automatically integrated in `useChat.tsx` hook - triggered after every message insert.

---

## Technical Implementation

### Database Requirements

#### user_presence table (for activity tracking):
```sql
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(user_id),
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
```

### Environment Variables Required
All edge functions use:
- `TELEGRAM_BOT_TOKEN` (already configured)
- `SUPABASE_URL` (auto-provided)
- `SUPABASE_SERVICE_ROLE_KEY` (auto-provided)

---

## Benefits

### For Experts
✅ Never miss a job opportunity
✅ Get notified about client messages immediately
✅ Reminded to check dashboard for new clients
✅ Encouraged to stay active and build reputation

### For Users
✅ Daily sign-in bonus reminders
✅ Task availability notifications
✅ "We miss you" encouragement messages
✅ Instant chat notifications

### For Platform
✅ Increased user retention
✅ Higher engagement rates
✅ Better expert-client communication
✅ Reduced inactive accounts

---

## Monitoring & Logs

### Check Function Logs

1. **Welcome Notifications:**
```
[WELCOME] Sending welcome notification to user: <user_id>
[WELCOME] Welcome notification sent successfully to <name>
```

2. **Weekly Check-In:**
```
[WEEKLY_CHECK] Running weekly inactive users check...
[WEEKLY_CHECK] ✅ Sent "we miss you" to <name>
[WEEKLY_CHECK] Summary: { totalUsers: X, missedYouSent: Y }
```

3. **Message Notifications:**
```
[MSG_NOTIFY] Notifying <recipient_id> about message from <sender_id>
[MSG_NOTIFY] ✅ Notification sent to <name>
[MSG_NOTIFY] User <user_id> is currently active, skipping notification
```

---

## Customization

### Adjust Welcome Message Timing
Currently sends immediately on sign-in. To add delay:
```typescript
// In useAuth.tsx, after sign-in:
setTimeout(() => {
  supabase.functions.invoke('send-welcome-notification')
}, 3000) // 3 second delay
```

### Adjust Weekly Check Schedule
Modify the cron schedule in the SQL above:
- Frequency: Change `* * 1` (every Monday) to desired day
- Time: Change `0 9` (9:00 AM) to desired hour

### Adjust Message Notification Threshold
Currently skips if user active in last 5 minutes. To change:
```typescript
// In notify-message-received/index.ts:
const fiveMinutesAgo = new Date();
fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 10); // 10 minutes instead
```

---

## Testing

### Test Welcome Message
1. Sign into your account
2. Check your Telegram for welcome message
3. Verify correct role-based content

### Test Weekly Check-In
```bash
# Manually invoke the function:
curl -X POST \
  'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/weekly-inactive-users-check' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json'
```

### Test Message Notification
1. Have two users with Telegram linked
2. User A sends message to User B
3. Ensure User B is inactive (close app)
4. Check User B's Telegram for notification

---

## Future Enhancements

### Possible Improvements
- [ ] Daily digest of unread messages
- [ ] Milestone congratulations (e.g., "100 tasks completed!")
- [ ] Birthday wishes
- [ ] Job application status updates
- [ ] Payment received notifications
- [ ] Referral reward notifications
- [ ] Achievement unlocked notifications
- [ ] Monthly activity summary

---

## Summary

The engagement system keeps users and experts active through:
1. **Immediate feedback** (welcome messages on sign-in)
2. **Re-engagement** (weekly check-ins for inactive users)
3. **Real-time communication** (instant message notifications)

All notifications are sent via Telegram for maximum reach, with role-based personalization to ensure relevance and value for each user type.
