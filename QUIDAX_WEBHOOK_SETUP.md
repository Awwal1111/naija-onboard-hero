# Quidax Ramp Webhook Setup Guide

## Overview
The Quidax Ramp system uses webhooks to notify your application when transactions are completed, failed, or cancelled. This ensures real-time balance updates for users.

## Webhook URL Configuration

### Your Webhook Endpoint
```
https://your-project-ref.supabase.co/functions/v1/quidax-webhook
```

### Setup Steps in Quidax Dashboard

1. **Login to Quidax Merchant Dashboard**
   - Go to [Quidax Merchant Dashboard](https://merchant.quidax.com)
   - Login with your merchant credentials

2. **Navigate to Developer Settings**
   - Click on your username in the navigation bar
   - Select "My Account"
   - Scroll down to "Developer Settings" section
   - Click the "Manage" button

3. **Configure Webhook URL**
   - Enter webhook URL: `https://your-project-ref.supabase.co/functions/v1/quidax-webhook`
   - Click "Save Changes"

## How the Webhook Works

### Webhook Events
The webhook receives the following transaction events:
- `completed` / `success` - Transaction was successful
- `failed` - Transaction failed
- `cancelled` - Transaction was cancelled by user

### For On-Ramp (Buy) Transactions
When webhook receives a `completed` status:
1. Calculates NC amount (1 USDT = 1600 NC)
2. Credits user's `wallet_balance` and `balance_withdrawable`
3. Logs transaction in `wallet_transactions` table
4. Logs crypto transaction in `crypto_transactions` table
5. Sends success notification to user

When webhook receives `failed` or `cancelled`:
1. Sends failure notification to user
2. No balance changes (since user wasn't charged)

### For Off-Ramp (Sell) Transactions
When webhook receives a `completed` status:
1. Updates wallet transaction to completed
2. Sends success notification with bank transfer info

When webhook receives `failed` or `cancelled`:
1. Refunds user's NC balance (returns deducted amount)
2. Updates wallet transaction to failed
3. Logs refund transaction
4. Sends failure notification

## Webhook Retry Logic
According to Quidax documentation, webhooks are retried:
- **1st attempt**: Immediate
- **2nd attempt**: After 1 minute
- **3rd attempt**: After 30 minutes
- **4th attempt**: After 1 hour
- **5th attempt**: After 24 hours
- After 5 attempts, webhooks stop

## Security Features

### Response Requirements
- Your endpoint MUST respond with HTTP 200 status
- Any other response (including 3xx) is considered a failure
- Response body and headers are ignored

### Idempotency
The webhook handler is idempotent - processing the same webhook multiple times produces the same result. This prevents:
- Double-crediting user balances
- Multiple notifications for the same transaction

### Transaction Re-verification
The webhook handler:
1. Receives webhook data from Quidax
2. Finds transaction in database by reference
3. Updates transaction status
4. Only processes balance updates once per transaction

## Testing Webhooks

### Manual Testing
You can test the webhook by sending a POST request:

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/quidax-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "reference": "test-ref-123",
    "status": "completed",
    "transaction_type": "on_ramp",
    "token_amount": "10",
    "fiat_amount": "20000"
  }'
```

### Monitoring Webhook Logs
View webhook logs in Supabase dashboard:
- [Quidax Webhook Logs](https://supabase.com/dashboard/project/your-project-id/functions/quidax-webhook/logs)

## Troubleshooting

### Webhook Not Firing
1. Verify webhook URL is configured in Quidax dashboard
2. Check that URL is exactly: `https://your-project.supabase.co/functions/v1/quidax-webhook`
3. Ensure no typos or extra spaces
4. Check webhook logs for any incoming requests

### Balance Not Updating
1. Check webhook logs to see if webhook was received
2. Verify transaction reference exists in `quidax_transactions` table
3. Check for any error messages in logs
4. Ensure user profile exists with correct `user_id`

### Duplicate Credits
This should not happen due to idempotency, but if it does:
1. Check logs for duplicate webhook calls
2. Verify transaction reference is unique
3. Contact Quidax support if issue persists

## Database Tables

### quidax_transactions
Stores all Quidax ramp transactions:
```sql
- user_id: UUID
- reference: TEXT (unique)
- transaction_type: 'on_ramp' | 'off_ramp'
- status: TEXT
- fiat_amount: NUMERIC
- fiat_currency: TEXT
- token: TEXT
- wallet_address: TEXT
- quidax_data: JSONB
```

### wallet_transactions
Logs all balance changes:
```sql
- user_id: UUID
- kind: 'quidax_deposit' | 'quidax_withdrawal' | 'refund'
- amount: NUMERIC
- status: 'completed' | 'pending' | 'failed'
- reference: TEXT
- description: TEXT
```

## Important Notes

1. **Always Re-query**: After receiving webhook, the system verifies transaction status with Quidax API
2. **Exchange Rate**: Currently set at 1 USDT = 1600 NC (may need adjustment based on market rates)
3. **Network**: Only Celo network (USDT-Celo) is supported
4. **Minimum Amounts**: Check Quidax purchase limits before initiating transactions

## Support

If you encounter issues:
1. Check [Quidax Documentation](https://docs.quidax.io)
2. Review webhook logs in Supabase dashboard
3. Contact Quidax merchant support
4. Check NaijaLancers admin dashboard for transaction status
