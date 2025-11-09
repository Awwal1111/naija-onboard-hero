# WebRTC Voice & Video Calls Implementation

## Overview
This document explains the implementation of free voice and video calls in NaijaLancers using WebRTC and Supabase Realtime for signaling.

## Architecture

### Components

1. **useWebRTC Hook** (`src/hooks/useWebRTC.tsx`)
   - Manages WebRTC peer connections
   - Handles call state and media streams
   - Provides call control functions

2. **IncomingCallDialog** (`src/components/IncomingCallDialog.tsx`)
   - Displays incoming call notifications
   - Plays ringtone
   - Allows accept/reject actions

3. **ActiveCallInterface** (`src/components/ActiveCallInterface.tsx`)
   - Shows active call UI
   - Displays video streams (if video call)
   - Provides call controls (mute, video toggle, end call)

4. **CallControls** (`src/components/CallControls.tsx`)
   - Simple dropdown to initiate voice or video calls

### Database Schema

**call_history table:**
- `id` - UUID primary key
- `caller_id` - Reference to caller
- `receiver_id` - Reference to receiver
- `call_type` - 'voice' or 'video'
- `status` - Call status (initiated, ringing, accepted, rejected, missed, ended, failed)
- `started_at` - When call started
- `ended_at` - When call ended
- `duration_seconds` - Call duration
- `created_at` - Record creation time

## How It Works

### Signaling Flow

1. **Initiating a Call:**
   - User A clicks call button
   - WebRTC peer connection is created
   - Local media stream is acquired (audio + video if video call)
   - SDP offer is created
   - Offer is sent via Supabase Realtime channel to User B
   - Call record is created in database with status 'initiated'

2. **Receiving a Call:**
   - User B subscribes to incoming call events via Supabase Realtime
   - Incoming call dialog is displayed with caller information
   - Ringtone plays automatically
   - User B can accept or reject

3. **Accepting a Call:**
   - User B acquires local media stream
   - Sets remote description from User A's offer
   - Creates SDP answer
   - Sends answer back via Supabase Realtime
   - Both peers exchange ICE candidates
   - WebRTC connection is established

4. **During the Call:**
   - Audio/video streams are transmitted peer-to-peer
   - Users can mute/unmute microphone
   - Users can toggle video on/off (video calls only)
   - Users can switch to audio-only mode
   - Call duration is tracked

5. **Ending the Call:**
   - Either user clicks end call button
   - All media tracks are stopped
   - Peer connection is closed
   - Signaling channel is removed
   - Call record is updated with end time and duration

### STUN/TURN Configuration

Currently using public STUN servers:
```javascript
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun1.l.google.com:19302' },
  ]
}
```

**Note:** For production, consider adding TURN servers for users behind restrictive NATs/firewalls.

## Features

✅ **Voice Calls** - Audio-only calls with minimal bandwidth
✅ **Video Calls** - Full video calls with camera and audio
✅ **Call Controls** - Mute, video toggle, end call
✅ **Switch to Audio** - Convert video call to audio-only if network is weak
✅ **Call History** - All calls logged in database
✅ **Incoming Call UI** - Beautiful incoming call screen with ringtone
✅ **Active Call UI** - Full-screen call interface
✅ **Call Status** - Real-time connection status indicators
✅ **User Presence** - Only show call buttons to online/active users
✅ **Blocked Users** - No calls to/from blocked users

## Usage

### Starting a Call from Chat Page

```typescript
// In Chat.tsx
import { useWebRTC } from '@/hooks/useWebRTC'

const { startCall } = useWebRTC()

// Start voice call
startCall(userId, 'voice')

// Start video call
startCall(userId, 'video')
```

### Handling Incoming Calls

```typescript
// Automatically handled by IncomingCallDialog component
<IncomingCallDialog
  onAnswer={answerCall}
  onReject={rejectCall}
/>
```

## Browser Permissions

The app requires the following permissions:
- **Microphone** - For all calls
- **Camera** - For video calls only

Users will be prompted for these permissions when starting a call.

## Network Requirements

- **Minimum bandwidth:**
  - Voice calls: ~50 kbps
  - Video calls: ~500 kbps (can adapt based on network)

- **Recommended:**
  - Voice calls: 100+ kbps
  - Video calls: 1+ Mbps

## Testing

### Test Scenarios

1. **Basic Voice Call:**
   - User A calls User B (voice)
   - User B accepts
   - Both can hear each other
   - Either user ends call

2. **Basic Video Call:**
   - User A calls User B (video)
   - User B accepts
   - Both can see and hear each other
   - Either user ends call

3. **Call Controls:**
   - Mute/unmute during call
   - Toggle video on/off
   - Switch video call to audio-only

4. **Call Rejection:**
   - User A calls User B
   - User B rejects
   - User A sees rejection notification

5. **Poor Network:**
   - Start video call
   - Switch to audio-only
   - Verify audio continues smoothly

6. **Call History:**
   - Make several calls
   - Verify all calls logged in call_history table
   - Check duration accuracy

### Testing on Real Devices

**Important:** Test on actual mobile devices using mobile data (not just WiFi):
1. Two phones on different networks
2. One phone on WiFi, one on mobile data
3. Both phones on mobile data

## Future Enhancements

### Recommended for Production

1. **TURN Server:**
   - Deploy coturn or use a service like Twilio TURN
   - Essential for users behind strict firewalls
   - Improves connection success rate

2. **Call Quality Indicators:**
   - Display connection quality (good/fair/poor)
   - Show latency and packet loss
   - Adaptive bitrate based on network

3. **Push Notifications:**
   - Native push for incoming calls when app is closed
   - Requires Capacitor + FCM/APNs integration

4. **Group Calls:**
   - Multi-party video conferencing
   - Uses SFU (Selective Forwarding Unit) architecture

5. **Screen Sharing:**
   - Share screen during calls
   - Useful for consultations/demonstrations

6. **Call Recording:**
   - Optional recording with consent
   - Store recordings in Supabase storage

7. **Call Analytics:**
   - Track call quality metrics
   - Identify and resolve common issues
   - Monitor connection success rates

## Troubleshooting

### Common Issues

**Issue: Calls fail to connect**
- Check browser permissions (camera/mic)
- Verify STUN servers are accessible
- Consider adding TURN server
- Check if blocked by firewall

**Issue: One-way audio/video**
- Usually ICE candidate issue
- Check Supabase Realtime connection
- Verify both users have media permissions

**Issue: Poor video quality**
- Network bandwidth too low
- Use "Switch to Audio Only" feature
- Consider implementing adaptive bitrate

**Issue: Calls disconnect randomly**
- Network stability issue
- Add reconnection logic
- Consider TURN server for more reliable routing

## Security Considerations

1. **End-to-End Media:**
   - WebRTC media streams are encrypted by default (DTLS-SRTP)
   - Peer-to-peer connection means media doesn't go through server

2. **Signaling Security:**
   - Signaling via Supabase Realtime uses authenticated channels
   - Only authorized users can send/receive call signals

3. **Privacy:**
   - Call history respects RLS policies
   - Users can only see their own call records
   - Blocked users cannot call each other

## Cost Analysis

**Why WebRTC is Free:**
- No per-minute charges (unlike Twilio, Agora)
- Peer-to-peer connections (no server media processing)
- Only uses Supabase for signaling (minimal data transfer)

**Costs:**
- STUN servers: FREE (using public Google STUN)
- Supabase Realtime: FREE tier covers signaling
- Optional TURN server: ~$10-30/month (only if needed)

**Comparison with Paid SDKs:**
- Twilio Video: ~$0.004/min = $2.40/hour
- Agora: ~$0.99-$3.99 per 1000 minutes
- WebRTC: $0 (+ optional TURN server cost)

## Support

For issues or questions:
1. Check console logs for WebRTC errors
2. Verify Supabase Realtime connection
3. Test on multiple devices/networks
4. Review browser console for permission errors
