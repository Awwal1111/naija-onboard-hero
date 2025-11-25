# Push Notifications Testing Guide

## ✅ Setup Complete

Your push notification system is now properly configured with:
- ✅ `send-push-notification` edge function (fixed and working)
- ✅ `save-push-subscription` edge function (for storing subscriptions)
- ✅ Service worker registered (`/service-worker.js`)
- ✅ VAPID keys configured (you've already added `VAPID_PRIVATE_KEY` as a secret)
- ✅ Frontend UI components (PushNotificationToggle)
- ✅ Test component updated (TestNotifications)

## 🧪 How to Test Push Notifications

### Step 1: Enable Push Notifications
1. Go to **Settings** page (`/settings`)
2. Scroll down to the **"Push Notifications"** card
3. Click the **"Enable Push Notifications"** button
4. Grant browser permission when prompted
5. You should see the button change to "Disable Push Notifications"

**What happens behind the scenes:**
- Browser requests notification permission
- Service worker is activated
- Push subscription is created
- Subscription is saved to your database via `save-push-subscription` edge function

### Step 2: Test the Push Notification
1. Stay on the **Settings** page
2. Scroll down to **"Test Notifications System"** card
3. Click **"Test Push Notification (Edge Function)"** button
4. You should see a browser notification pop up

**What happens behind the scenes:**
- Calls the `send-push-notification` edge function
- Edge function fetches your subscriptions from database
- Sends Web Push notification using VAPID keys
- Browser displays the notification

### Step 3: Verify Logs
After testing, check the edge function logs:
- **Supabase Dashboard** → Functions → `send-push-notification` → Logs
- You should see success messages like "Push notification sent successfully"

## 🔍 Troubleshooting

### "Not Subscribed" Error
**Problem:** You see "Please click 'Enable Push Notifications' in Settings first"
**Solution:** Go to Settings and click the "Enable Push Notifications" button

### "Permission Denied" Error
**Problem:** Browser notifications are blocked
**Solution:** 
1. Click the lock icon in your browser's address bar
2. Allow notifications for this site
3. Reload the page
4. Try enabling push notifications again

### "VAPID keys not configured" Error
**Problem:** The `VAPID_PRIVATE_KEY` secret is missing
**Solution:** You mentioned you've already added this secret, so this shouldn't be an issue. If you still see this error, verify the secret is correctly named `VAPID_PRIVATE_KEY` in Supabase Secrets.

### No Notification Appears
**Problem:** Test button says "success" but no notification shows
**Possible causes:**
1. **Browser Do Not Disturb mode is on** - Check your OS notification settings
2. **Browser notifications are minimized** - Check your browser's notification center
3. **Service worker not registered** - Open DevTools → Application → Service Workers and verify it's registered
4. **Subscription expired** - Try disabling and re-enabling push notifications

### Check Service Worker Registration
Open DevTools Console and run:
```javascript
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
  reg.pushManager.getSubscription().then(sub => {
    console.log('Push Subscription:', sub);
  });
});
```

## 📱 Real-World Usage

Push notifications will automatically be sent when:
- ✅ New message received
- ✅ Job post update
- ✅ Proposal accepted
- ✅ Withdrawal complete
- ✅ New survey available
- ✅ Airtime/data purchase
- ✅ Deposit confirmed
- ✅ Gig posted
- ✅ Expert application status change
- ✅ Course enrollment
- ✅ Fundraising contribution
- ✅ SafePay payment receipt

All these events use the `notification-helper.ts` which calls `send-push-notification`.

## 🔐 Security Notes

- **VAPID Private Key:** Keep this secret secure - never expose it in client-side code
- **Public Key:** The public key is safe to use in client-side code (it's in `useNotifications.tsx`)
- **Subscriptions:** Each device gets a unique subscription linked to the user's account
- **Expired Subscriptions:** Automatically removed when they return 410 status

## 📊 Monitoring

Check push notification activity:
1. **Database Table:** `push_subscriptions` - See all active subscriptions
2. **Edge Function Logs:** See which notifications were sent and to how many devices
3. **User Feedback:** Toast messages confirm when notifications are sent

## 🎯 Next Steps

1. Test enabling push notifications in Settings
2. Test sending a push notification using the test button
3. Check browser for the notification
4. Verify in edge function logs that it was sent successfully
5. Try triggering a real notification (e.g., send yourself a message from another account)

---

**Need Help?**
- Check the edge function logs for detailed error messages
- Verify VAPID_PRIVATE_KEY is set correctly in Supabase Secrets
- Ensure browser notifications are not blocked
- Try in an incognito window to rule out extension conflicts
