# Push Notifications Testing Checklist

## Pre-Testing Verification

### ✅ 1. Database Schema
```sql
-- Verify all columns exist
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'push_subscriptions';
```
Expected columns:
- id
- user_id
- endpoint ✅ (FIXED)
- p256dh ✅ (FIXED)
- auth ✅ (FIXED)
- expiration_time ✅ (FIXED)
- subscription
- created_at
- updated_at

### ✅ 2. Supabase Secrets
Navigate to Supabase Dashboard → Project Settings → Edge Functions
Verify these secrets exist:
- ✅ VAPID_PRIVATE_KEY (CONFIGURED)
- ✅ VAPID_PUBLIC_KEY (Optional - hardcoded in code)

### ✅ 3. Edge Functions Deployed
Check Supabase Dashboard → Edge Functions
Verify these functions are deployed:
- ✅ save-push-subscription
- ✅ send-push-notification

### ✅ 4. Service Worker
Verify `/service-worker.js` is accessible:
- Open browser DevTools → Application → Service Workers
- Should see service worker registered

## Testing Steps

### Step 1: Enable Push Notifications
1. Navigate to Settings → Notifications
2. Click "Enable Push Notifications"
3. **Expected:** Browser permission prompt appears
4. Click "Allow"
5. **Expected:** Success toast: "Push notifications enabled successfully!"

#### Troubleshooting Step 1:
- **If permission blocked:** Clear site settings and try again
- **If service worker fails:** Check browser console for errors
- **If subscription fails:** Check Network tab for edge function errors

### Step 2: Verify Subscription Saved
1. Open browser DevTools → Network tab
2. Filter for "save-push-subscription"
3. **Expected:** Status 200, response: `{"success": true, "action": "created"}`

#### Check Database:
```sql
SELECT * FROM push_subscriptions WHERE user_id = 'your-user-id';
```
**Expected:** One record with all fields populated

#### Troubleshooting Step 2:
- **If 400 error:** Check edge function logs
- **If auth column error:** Run migration again
- **If no record:** Check RLS policies

### Step 3: Send Test Push Notification
1. Go to Settings → Notifications → Test Notifications section
2. Click "Test Push Notification"
3. **Expected:** Toast: "Push Sent! Sent to 1 device(s)"
4. **Expected:** Browser notification appears with:
   - Title: "Test Push Notification"
   - Body: "This is a test push notification from NaijaLancers!"
   - Icon: NaijaLancers logo

#### Troubleshooting Step 3:
- **If "No subscriptions found":** Repeat Step 1
- **If VAPID error:** Check VAPID_PRIVATE_KEY in secrets
- **If notification doesn't appear:** Check browser notification settings
- **If 410 Gone error:** Old subscription - system will auto-remove it

### Step 4: Test In-App Notification
1. Click "Test In-App Notification"
2. **Expected:** New notification in notification bell
3. **Expected:** Unread count increases
4. Click notification bell
5. **Expected:** See test notification in list

### Step 5: Test on Multiple Devices
1. Enable push on Desktop browser
2. Enable push on Mobile browser
3. Send test notification
4. **Expected:** Both devices receive notification

### Step 6: Test Notification Click
1. Send test push notification
2. Click on the browser notification
3. **Expected:** Opens NaijaLancers app
4. **Expected:** Notification marked as read

## Monitoring & Debugging

### Check Edge Function Logs
1. Supabase Dashboard → Edge Functions
2. Click on function name
3. View logs in real-time
4. Look for:
   - "Saving push subscription for user"
   - "Push subscription saved successfully"
   - "Sending push notification to user"
   - "Push notification sent"

### Check Browser Console
Look for these logs:
```
Starting push notification setup...
Service Worker registered and ready
Notification permission result: granted
Creating new push subscription...
Push subscription created: {...}
Saving subscription to backend...
Push subscription saved successfully
```

### Check Network Tab
Monitor these requests:
1. `POST /functions/v1/save-push-subscription`
   - Status: 200
   - Response: `{"success": true, "action": "created"}`

2. `POST /functions/v1/send-push-notification`
   - Status: 200
   - Response: `{"success": true, "sent": 1, "total": 1}`

## Common Issues & Fixes

### Issue: "Column 'auth' does not exist"
✅ **Fixed:** Migration added auth column

### Issue: "No push subscriptions found"
**Cause:** User hasn't enabled push notifications
**Fix:** Click "Enable Push Notifications" in Settings

### Issue: "VAPID keys not configured"
✅ **Fixed:** VAPID_PRIVATE_KEY added to secrets

### Issue: "Permission denied"
**Cause:** User blocked notifications
**Fix:** 
1. Browser Settings → Site Settings → Notifications
2. Allow for your domain
3. Reload page and try again

### Issue: "Service Worker not found"
**Cause:** Service worker not registered
**Fix:** 
1. Check `/service-worker.js` is accessible
2. Refresh page
3. Check browser console for errors

### Issue: "Subscription endpoint invalid"
**Cause:** Old/expired subscription
**Fix:** System automatically removes it - just create new subscription

## Success Criteria

- ✅ Database has all required columns
- ✅ VAPID keys configured
- ✅ Subscription saved successfully
- ✅ Test notification sends without errors
- ✅ Browser displays notification
- ✅ Multiple devices receive notifications
- ✅ Notifications marked as read when clicked
- ✅ Invalid subscriptions auto-removed
- ✅ Detailed logging working
- ✅ Error messages clear and helpful

## Performance Checks

### Database Performance
```sql
-- Check subscription count
SELECT COUNT(*) FROM push_subscriptions;

-- Check for duplicates
SELECT user_id, endpoint, COUNT(*) 
FROM push_subscriptions 
GROUP BY user_id, endpoint 
HAVING COUNT(*) > 1;

-- Check active subscriptions
SELECT COUNT(*) FROM push_subscriptions 
WHERE expiration_time IS NULL OR expiration_time > NOW();
```

### Edge Function Performance
- Response time < 1 second
- No 500 errors
- Proper error handling

## Security Checks

1. **RLS Policies:**
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'push_subscriptions';
   ```
   - Users can only see their own subscriptions ✅

2. **VAPID Keys:**
   - Private key not exposed in client code ✅
   - Public key embedded in client (safe) ✅

3. **HTTPS:**
   - Service Workers require HTTPS ✅
   - Production domain uses HTTPS ✅

## Final Verification

Run this complete test:
```
1. Fresh browser (incognito)
2. Sign up new account
3. Enable push notifications
4. Send test notification
5. Verify notification received
6. Click notification
7. Verify app opens
8. Check database for subscription record
9. Log out
10. Log in different device
11. Enable push notifications
12. Send test notification
13. Verify both devices receive notification
```

If all steps pass ✅, system is fully functional!
