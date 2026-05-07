# NaijaLancers Developer API - Complete Guide

## 🚀 Getting Started

### Step 1: Become a Developer

1. Go to **Settings** → **Account Type**
2. Switch to **Developer Account**
3. Your `account_type` will change in the database

### Step 2: Generate API Key

1. Go to `/developer` (Developer Portal)
2. Click **"Generate API Key"**
3. **Save it securely** - you won't see it again
4. API keys are stored in `user_secrets` table (NOT visible in profiles)

### Step 3: Start Making Requests

```bash
curl -X POST https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/developer-api/wallet/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY_HERE" \
  -d '{"external_user_id": "user_123"}'
```

---

## 🔐 Authentication: How It Works

### API Key Validation Flow

```
Your Request with x-api-key header
              ↓
    Check user_secrets table for matching key
              ↓
    Check profiles table for account_type = 'developer'
              ↓
    Check wallet_balance (for paid endpoints)
              ↓
    Process request OR return 401/402 error
```

### Common Authentication Errors

| Error | Cause | Fix |
|-------|-------|-----|
| `401 - Invalid API key` | Key doesn't exist in `user_secrets` | Generate new key in `/developer` |
| `401 - Not a developer account` | `account_type` ≠ 'developer' | Go to Settings → Switch to Developer |
| `402 - Insufficient NC balance` | Wallet balance < endpoint cost | Top up wallet in Settings → Wallet |
| `429 - Rate limit exceeded` | Too many requests | See Rate Limits section |

### How to Fix "API key not working"

**Checklist:**
- ✅ Is your account type set to "Developer"? (Check `/settings`)
- ✅ Did you copy the FULL API key? (It's long!)
- ✅ Are you using the header name correctly? Use `x-api-key` (all lowercase)
- ✅ Is your wallet balance > 0 for paid endpoints?
- ✅ Are you hitting rate limits? (Check stats in `/developer`)

---

## 💳 Pricing & Credits Model

### How Costs Work

1. **Free endpoints** cost 0 NC: wallet balance, video rooms, webhooks
2. **Paid endpoints** deduct NC from your wallet
3. Check endpoint cost in API Reference before calling
4. Insufficient balance → 402 error

### Pricing Table

```
WALLET OPERATIONS:
  POST /wallet/create ........... FREE
  GET /wallet/balance ........... FREE
  POST /wallet/transfer ......... 5 NC per call

VIDEO:
  POST /video/create-room ....... 50 NC
  POST /video/join-room ......... FREE

NOTIFICATIONS:
  POST /notifications/email ..... 5 NC
  POST /notifications/sms ....... 3 NC
  POST /notifications/push ...... 1 NC

PAYMENTS:
  POST /payments/escrow/create .. 20 NC
  POST /payments/escrow/release . FREE

SMART CONTRACTS (Celo):
  POST /contracts/deploy ........ 50 NC + gas fees
  POST /contracts/call .......... 5 NC + gas fees
  POST /contracts/read .......... FREE
```

### Top Up Your Wallet

Go to **Settings** → **Wallet** → **Add NC Credits**
- Buy with your card
- Or earn through platform activities

---

## 📝 Complete Examples

### Example 1: Create a Wallet

```javascript
// Node.js / JavaScript
const apiKey = 'your_api_key_here';
const baseUrl = 'https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/developer-api';

const response = await fetch(`${baseUrl}/wallet/create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    external_user_id: 'user_from_your_app_123'
  })
});

const { address, network, external_user_id } = await response.json();
console.log('Wallet created:', {
  address,        // 0x...
  network,        // 'celo-mainnet'
  external_user_id // 'user_from_your_app_123'
});
```

### Example 2: Check Wallet Balance

```javascript
const response = await fetch(
  `${baseUrl}/wallet/balance?external_user_id=user_123`,
  {
    headers: { 'x-api-key': apiKey }
  }
);

const { balances } = await response.json();
console.log('Wallet balances:', {
  CELO: '1.5',      // Native token
  cUSD: '100.00',   // Stablecoin
  USDT: '50.00'     // USDT on Celo
});
```

### Example 3: Create Escrow Payment

```javascript
const response = await fetch(`${baseUrl}/payments/escrow/create`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    payer_id: 'freelancer_user_id',
    payee_id: 'client_user_id',
    amount: 50000,           // 50,000 NGN
    description: 'Web design project',
    milestone: 'Design mockups',
    release_condition: 'client_approval'
  })
});

const { escrow_id, status, release_url } = await response.json();
console.log('Escrow created:', { escrow_id, status });
```

### Example 4: Send Email Notification

```javascript
// Costs 5 NC
const response = await fetch(`${baseUrl}/notifications/email`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    to: 'user@example.com',
    subject: 'Project approved!',
    message: '<h1>Your project has been approved</h1><p>Click here to proceed...</p>',
    template: 'notification'  // Optional: use predefined template
  })
});

const { message_id, status } = await response.json();
console.log('Email sent:', { message_id, status });
```

### Example 5: Create Video Room

```javascript
// Costs 50 NC
const response = await fetch(`${baseUrl}/video/create-room`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    room_name: 'client-meeting-2024-05',
    max_participants: 5,
    features: {
      screen_sharing: true,
      recording: true,
      chat: true
    },
    expires_in_hours: 24
  })
});

const { room_id, join_url, embed_code } = await response.json();
console.log('Video room created:', {
  room_id,
  join_url,      // https://...
  embed_code     // <iframe src="...">
});
```

---

## ⚡ Rate Limits

Each endpoint has a rate limit. Exceeding it returns **429 Too Many Requests**.

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/wallet/*` | 100 calls | per minute |
| `/video/*` | 20 calls | per minute |
| `/notifications/*` | 200 calls | per minute |
| `/payments/*` | 50 calls | per minute |
| `/contracts/*` | 10 calls | per minute |
| `/escrow/*` | 10 calls | per minute |

### Check Your Current Usage

1. Go to `/developer`
2. Click **"Stats"** tab
3. See API calls used this month
4. View endpoint breakdown

---

## 🔔 Webhooks: Receive Events

Webhooks let you know when important things happen.

### Register Webhook

```javascript
const response = await fetch(`${baseUrl}/webhooks`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey
  },
  body: JSON.stringify({
    webhook_url: 'https://your-server.com/webhooks/naijalancers',
    events: [
      'wallet.created',
      'wallet.transfer',
      'escrow.released',
      'video.room.ended'
    ],
    secret: 'your_webhook_secret'  // For signature verification
  })
});

const { webhook_id, status } = await response.json();
```

### Handle Webhook Events

```javascript
// Your webhook endpoint (https://your-server.com/webhooks/naijalancers)
app.post('/webhooks/naijalancers', (req, res) => {
  const event = req.body;

  switch(event.type) {
    case 'wallet.created':
      console.log('New wallet:', event.data.address);
      break;
    
    case 'escrow.released':
      console.log('Payment released:', event.data.escrow_id);
      // Trigger fulfillment in your system
      break;
    
    case 'video.room.ended':
      console.log('Call ended:', event.data.duration_minutes);
      break;
  }

  res.json({ ok: true });
});
```

### Webhook Events Reference

| Event | Data | When |
|-------|------|------|
| `wallet.created` | `{ address, external_user_id }` | New wallet created |
| `wallet.transfer` | `{ tx_hash, from, to, amount }` | Transfer completed |
| `escrow.created` | `{ escrow_id, amount }` | Escrow initiated |
| `escrow.released` | `{ escrow_id, txn_hash }` | Funds released |
| `escrow.refunded` | `{ escrow_id, reason }` | Escrow cancelled |
| `video.room.ended` | `{ room_id, duration_minutes }` | Video call ended |
| `notification.sent` | `{ message_id, channel }` | Email/SMS sent |

---

## ❌ Error Codes & Solutions

### 400 Bad Request
**Cause:** Invalid parameters or missing required fields

```json
{
  "error": "Invalid request",
  "message": "Missing required field: external_user_id",
  "hints": ["Check endpoint documentation for required fields"]
}
```

**Fix:** Review endpoint params in API Reference

---

### 401 Unauthorized
**Cause:** API key missing, invalid, or user not a developer

```json
{
  "error": "Invalid API key or not a developer account",
  "hints": [
    "1. Generate API key at /developer",
    "2. Switch account type to 'Developer' in Settings",
    "3. Use 'x-api-key' header (lowercase)"
  ]
}
```

**Fix:** Follow checklist above

---

### 402 Payment Required
**Cause:** Insufficient NC balance for paid endpoint

```json
{
  "error": "Insufficient NC balance",
  "required": 50,
  "current_balance": 10,
  "topup_url": "https://naijalancers.name.ng/settings/wallet"
}
```

**Fix:** Top up wallet → Add Credits

---

### 429 Rate Limit Exceeded
**Cause:** Too many requests to this endpoint

```json
{
  "error": "Rate limit exceeded",
  "retry_after": 60,
  "limit": 100,
  "window": "per minute",
  "current": 105
}
```

**Fix:** 
- Wait `retry_after` seconds before retrying
- Implement exponential backoff in production
- Consider batching requests

---

### 500 Internal Server Error
**Cause:** Server error (rare)

```json
{
  "error": "Internal server error",
  "request_id": "req_12345...",
  "support_email": "support@naijalancers.name.ng"
}
```

**Fix:** Contact support with `request_id`

---

## 🧪 Test It Out

### In Browser

1. Go to `/developer-docs`
2. Scroll to **"API Playground"**
3. Paste your API key
4. Select endpoint
5. Click **"Send Request"**
6. See response instantly

### With cURL

```bash
# Create wallet
curl -X POST https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/developer-api/wallet/create \
  -H "Content-Type: application/json" \
  -H "x-api-key: sk_live_abc123..." \
  -d '{"external_user_id": "test_user"}'

# Check balance
curl -X GET "https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/developer-api/wallet/balance?external_user_id=test_user" \
  -H "x-api-key: sk_live_abc123..."
```

### With Postman

1. Create new collection "NaijaLancers API"
2. Add environment variable: `api_key = YOUR_API_KEY`
3. Create requests with `{{api_key}}` in headers
4. Test each endpoint

---

## 🛡️ Security Best Practices

### DO ✅

- **Store API keys in environment variables**, not in code
  ```javascript
  const apiKey = process.env.NAIJALANCERS_API_KEY;
  ```

- **Use HTTPS only** for all API calls
- **Rotate keys regularly** (generate new one monthly)
- **Disable unused keys** in `/developer`
- **Monitor usage** in Stats tab

### DON'T ❌

- **Don't share API keys** publicly or in GitHub
- **Don't hardcode keys** in frontend code
- **Don't expose keys in logs**
- **Don't use same key for multiple apps**

### Key Rotation

1. Go to `/developer` → **"Generate New Key"**
2. Wait 5 minutes for systems to sync
3. Update your app with new key
4. Delete old key

---

## 📚 Additional Resources

- **API Reference:** `/developer` → API Reference tab
- **Code Examples:** `/developer-docs` → Code Examples
- **Escrow Guide:** `/developer` → Escrow tab
- **Status Page:** Check Supabase dashboard for service status
- **Support:** Email support@naijalancers.name.ng

---

## ✨ What's Ready for Market

✅ Wallet creation & transfers (tested)  
✅ Video room creation (tested)  
✅ Escrow payments (in beta, use with caution)  
✅ Email/SMS notifications (tested)  
✅ Webhook system (tested)  
✅ Rate limiting (deployed)  
✅ Balance checking (tested)  

⚠️ Smart contracts (beta - use testnet first)  
⚠️ Advanced AI features (limited capacity)  

---

## 🚨 Known Issues & Workarounds

### Issue: "API key validation timeout"
**Workaround:** Retry request after 5 seconds

### Issue: "Video room creation slow"
**Workaround:** Pre-create rooms during off-peak hours

### Issue: "Escrow release requires manual approval"
**Workaround:** Use webhooks to trigger automation

---

Last Updated: May 7, 2026
