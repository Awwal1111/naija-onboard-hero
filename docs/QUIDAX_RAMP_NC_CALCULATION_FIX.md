# Quidax Ramp NC Calculation Fix

## Problem
The Quidax Ramp webhook was crediting 0 NC to users because:
1. Using hardcoded exchange rate (1 USDT = 1600 NC)
2. Extracting amounts from wrong payload paths
3. Not handling edge cases properly

## Solution Applied

### 1. Correct Payload Extraction
Updated both webhook functions to extract amounts from the correct Quidax payload structure:

```javascript
// ✅ CORRECT - New implementation
const cryptoAmount = parseFloat(verifiedTransaction.data?.crypto_payout?.amount || '0')
const fiatAmount = parseFloat(verifiedTransaction.data?.fiat_deposit?.amount || '0')

// ❌ WRONG - Old implementation
const usdtAmount = parseFloat(verifiedTransaction.data?.crypto_amount || '0')
```

### 2. Dynamic NC Calculation
NC is now calculated based on the actual transaction rate, not a hardcoded value:

```javascript
// Calculate NC dynamically based on actual transaction rate
const ncPerUSDT = fiatAmount / cryptoAmount
const ncAmount = Math.floor(cryptoAmount * ncPerUSDT)
```

**Example:**
- User deposits ₦10,000
- Receives 6.25 USDT (at current market rate)
- NC rate: 10,000 / 6.25 = 1,600 NC per USDT
- User gets: 6.25 × 1,600 = 10,000 NC

### 3. Enhanced Error Handling
Added comprehensive validation and error handling:

```javascript
// Validate amounts before processing
if (fiatAmount <= 0 || cryptoAmount <= 0) {
  console.error('[QUIDAX_WEBHOOK] Invalid amounts:', { fiatAmount, cryptoAmount })
  throw new Error('Invalid fiat or crypto amount in Quidax payload')
}

// Safe profile updates with null checks
const previousWallet = profile.wallet_balance || 0
const previousWithdrawable = profile.balance_withdrawable || 0

const { error: updateError } = await supabase
  .from('profiles')
  .update({
    wallet_balance: previousWallet + ncAmount,
    balance_withdrawable: previousWithdrawable + ncAmount
  })
  .eq('user_id', user.id)

if (updateError) {
  console.error('[QUIDAX_RAMP] Balance update error:', updateError)
  throw new Error('Failed to update balance')
}
```

### 4. Comprehensive Logging
Added detailed logging for debugging:

```javascript
console.log('[QUIDAX_RAMP] NC Calculation:', {
  userId: user.id,
  cryptoAmount,
  fiatAmount,
  ncPerUSDT: ncPerUSDT.toFixed(2),
  updateAmount,
  previousWallet
})
```

## Files Updated

1. **`supabase/functions/quidax-webhook/index.ts`**
   - Fixed payload extraction for on-ramp transactions
   - Implemented dynamic NC calculation
   - Enhanced error handling and logging
   - Updated notification messages

2. **`supabase/functions/verify-quidax-ramp-transaction/index.ts`**
   - Fixed payload extraction for both buy and sell modes
   - Implemented dynamic NC calculation
   - Enhanced error handling and logging
   - Safe null checks for profile fields

## Testing

To verify the fix:

1. **Check Logs** - View edge function logs in Supabase:
   - Look for `[QUIDAX_WEBHOOK] NC Calculation:` entries
   - Verify `cryptoAmount`, `fiatAmount`, and `ncPerUSDT` are correct
   - Confirm `updateAmount` matches expected NC value

2. **Test Transaction Flow:**
   - User initiates Quidax Ramp deposit (e.g., ₦5,000)
   - Quidax completes transaction and sends webhook
   - Check user's wallet balance increases by correct NC amount
   - Verify `wallet_transactions` log shows correct amount and description

3. **Verify Database Records:**
   ```sql
   -- Check recent Quidax transactions
   SELECT * FROM quidax_transactions 
   ORDER BY created_at DESC 
   LIMIT 10;

   -- Check recent wallet transactions
   SELECT * FROM wallet_transactions 
   WHERE kind = 'quidax_deposit'
   ORDER BY created_at DESC 
   LIMIT 10;

   -- Check crypto transactions
   SELECT * FROM crypto_transactions 
   WHERE transaction_type = 'deposit'
   ORDER BY created_at DESC 
   LIMIT 10;
   ```

## Key Improvements

✅ **Dynamic Rate Calculation** - NC amount always matches what user actually paid  
✅ **Correct Payload Paths** - Extracts amounts from `data.crypto_payout.amount` and `data.fiat_deposit.amount`  
✅ **Error Handling** - Throws errors on invalid amounts instead of silently failing  
✅ **Safe Updates** - Uses null-safe operations for profile updates  
✅ **Detailed Logging** - Logs all critical values for debugging  
✅ **User Notifications** - Shows exact amounts in notification messages  

## Expected Behavior

**Before Fix:**
- User deposits ₦5,000
- Gets 0 NC (because payload extraction failed)

**After Fix:**
- User deposits ₦5,000
- Receives 3.125 USDT (example rate)
- Gets 5,000 NC (calculated dynamically)
- Sees notification: "Your deposit of ₦5,000.00 (3.1250 USDT) has been credited. You received 5000 NC!"
