# WebRTC Voice & Video Calls - Testing Guide

## Quick Start Testing

### 1. Prepare Two Test Accounts

You'll need two user accounts to test calls. You can either:
- Use two different browsers (Chrome + Firefox)
- Use one normal window and one incognito window
- Use two different devices

**Test Users:**
- User A (Caller)
- User B (Receiver)

### 2. Basic Voice Call Test

**Steps:**
1. Log in as User A in Browser 1
2. Log in as User B in Browser 2
3. User A navigates to chat with User B (`/chat/:userId`)
4. User A clicks the phone icon → Select "Voice Call"
5. User B should see incoming call dialog with User A's name
6. User B clicks green phone button to accept
7. ✅ Both users should hear each other
8. Test mute button on both sides
9. Either user can click red phone button to end call
10. ✅ Call should end gracefully for both users

**Expected Results:**
- User A sees "Calling..." status
- User B's device plays ringtone
- After accept: Status changes to "Connected"
- Call duration timer starts
- Mute button works (microphone icon turns red when muted)
- End call button terminates the call for both users

### 3. Basic Video Call Test

**Steps:**
1. Follow steps 1-3 from Voice Call Test
2. User A clicks phone icon → Select "Video Call"
3. User B accepts the incoming video call
4. ✅ Both users should see and hear each other
5. Test video toggle button (camera icon)
6. Test "Switch to Audio Only" button
7. End the call

**Expected Results:**
- Both users see each other's video
- Local video preview appears in corner for video caller
- Video toggle button works (turns off/on camera)
- "Switch to Audio Only" converts call to audio-only
- Call continues smoothly after switching to audio

### 4. Call Rejection Test

**Steps:**
1. User A calls User B
2. User B clicks red phone button (reject)
3. ✅ User A should see "Call Rejected" notification
4. ✅ Call should end immediately

### 5. Incoming Call from Different Pages

**Test that calls work from anywhere in the app:**

**Steps:**
1. User A is on chat page with User B
2. User B is on feed page (`/feed`) or any other page
3. User A starts a call
4. ✅ User B should see incoming call dialog overlay on whatever page they're on
5. User B accepts
6. ✅ ActiveCallInterface should appear full-screen

**Expected Results:**
- Incoming call dialog appears globally (on any page)
- After accepting, user sees full-screen call interface
- After ending call, user returns to the page they were on

### 6. Call Controls Test

**During an active call, test all controls:**

**Voice Call Controls:**
- ✅ Mute/Unmute button
- ✅ End call button

**Video Call Controls:**
- ✅ Mute/Unmute microphone
- ✅ Toggle video on/off
- ✅ Switch to Audio Only
- ✅ End call button

### 7. Call History Test

**After making several calls:**

**Steps:**
1. Open Supabase dashboard
2. Navigate to call_history table
3. ✅ Verify all calls are logged with:
   - Correct caller_id and receiver_id
   - Correct call_type (voice/video)
   - Correct status (accepted, rejected, ended)
   - Duration in seconds (for completed calls)

**SQL Query to check:**
```sql
SELECT 
  caller_id,
  receiver_id,
  call_type,
  status,
  duration_seconds,
  created_at
FROM call_history
ORDER BY created_at DESC
LIMIT 10;
```

### 8. Network Quality Test

**Test calls under different network conditions:**

**Steps:**
1. Start a video call on good WiFi
2. ✅ Video should be smooth
3. Simulate poor network (Chrome DevTools → Network → Fast 3G)
4. Click "Switch to Audio Only"
5. ✅ Audio should continue working
6. Return to good network
7. Video quality should improve

### 9. Blocked Users Test

**Verify blocked users cannot call each other:**

**Steps:**
1. User A blocks User B
2. User A should NOT see call buttons on User B's chat
3. User B should NOT see call buttons on User A's chat
4. ✅ Calls should be impossible between blocked users

### 10. Browser Permissions Test

**First-time call (no permissions granted yet):**

**Steps:**
1. Fresh browser (clear site data) or incognito
2. User A tries to start a call
3. ✅ Browser prompts for microphone permission
4. Grant permission
5. ✅ Call proceeds normally
6. For video calls, camera permission is also requested

## Common Issues & Solutions

### Issue: "Cannot read properties of null (reading 'createOffer')"
**Solution:** Browser doesn't support WebRTC or permissions denied
- Use Chrome, Firefox, or Edge (latest versions)
- Check browser permissions for microphone/camera
- Ensure HTTPS or localhost (WebRTC requires secure context)

### Issue: Incoming call dialog doesn't appear
**Solution:** Check Supabase Realtime connection
- Verify user is logged in
- Check browser console for subscription errors
- Ensure GlobalCallManager is mounted in App.tsx

### Issue: One-way audio/video
**Solution:** ICE candidate exchange failed
- Check browser console for WebRTC errors
- Verify both users have stable network
- Consider adding TURN server for better connectivity

### Issue: Video is black screen
**Solution:** Camera permissions or access issues
- Check camera is not used by another app
- Grant camera permissions in browser
- Try refreshing the page
- Check if camera works in system settings

### Issue: No audio on either side
**Solution:** Microphone permissions or setup
- Check microphone permissions granted
- Verify microphone works (test in system settings)
- Check if mute is accidentally enabled
- Try different browser

### Issue: Call disconnects immediately
**Solution:** Network or signaling issue
- Check internet connection stability
- Verify Supabase Realtime is working
- Check browser console for errors
- Ensure both users are on compatible browsers

## Production Testing Checklist

Before deploying to production, test:

- [ ] Voice calls work on desktop browsers
- [ ] Video calls work on desktop browsers  
- [ ] Voice calls work on mobile browsers
- [ ] Video calls work on mobile browsers
- [ ] Calls work across different browsers (Chrome-Firefox, etc.)
- [ ] Calls work on mobile data (not just WiFi)
- [ ] Incoming calls work from any page in the app
- [ ] Call rejection works properly
- [ ] Call history is logged correctly
- [ ] Mute/unmute works consistently
- [ ] Video toggle works properly
- [ ] Switch to audio-only works
- [ ] Blocked users cannot call each other
- [ ] Call duration is tracked accurately
- [ ] Calls work behind corporate firewalls (may need TURN)
- [ ] Multiple simultaneous calls don't interfere (if applicable)

## Performance Metrics to Monitor

**Good Call Quality Indicators:**
- Connection time: < 3 seconds
- Audio latency: < 300ms
- Video latency: < 500ms
- Packet loss: < 2%
- Connection success rate: > 90%

**Monitor in Production:**
- Call completion rate
- Average call duration
- Call rejection rate
- Failed connection attempts
- Browser/device compatibility issues

## Next Steps

After successful testing:

1. **Add TURN Server** (for production)
   - Improves connection success rate
   - Essential for users behind strict firewalls
   - Recommended: coturn or Twilio TURN

2. **Add Call Quality Monitoring**
   - Track connection metrics
   - Alert on high failure rates
   - Monitor bandwidth usage

3. **Add Push Notifications**
   - Notify users of incoming calls when app is closed
   - Requires Capacitor + FCM/APNs

4. **Add Call Recording** (optional)
   - Store call recordings in Supabase Storage
   - Requires explicit user consent
   - Useful for support/consultation services

## Support & Troubleshooting

For issues during testing:

1. Check browser console for errors
2. Verify Supabase Realtime connection
3. Test with different browsers
4. Review call_history table for failed calls
5. Check network stability
6. Ensure latest browser versions

Happy testing! 🎉
