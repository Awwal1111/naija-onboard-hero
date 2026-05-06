# Dual-Wallet Withdrawal System

## Overview

The withdrawal system has been upgraded to prevent users from feeling scammed when the master wallet is low on funds but they have crypto in their personal wallets (from failed auto-sweeps).

## How It Works

### Two-Tier Withdrawal Priority

When a user requests a crypto withdrawal (CELO, cUSD, or USDT), the system now follows this priority:

1. **Personal Wallet First** (User's Own Funds)
   - System checks if the user has a personal Celo wallet
   - Decrypts the user's encrypted private key
   - Checks their personal wallet balance for the requested currency
   - If sufficient balance exists, withdraws directly from their wallet
   - ✅ **This ensures users can ALWAYS access their own funds**

2. **Master Wallet Fallback** (Admin's Pooled Funds)
   - If user has no personal wallet, or
   - If user's wallet has insufficient balance
   - System falls back to the master wallet (existing behavior)
   - Sends crypto from the pooled master wallet

### User Experience Improvements

#### Transparent Balance Display
- Users now see their personal wallet balances in the withdrawal dialog
- Green alert box shows:
  - CELO balance (if any)
  - cUSD balance (if any)
  - USDT balance (if any)
- Clear message: "The system will use your personal wallet funds first if sufficient!"

#### Source Indication
- Withdrawal notifications now indicate the source:
  - 🔑 "Source: Your Personal Wallet" (user's own funds)
  - 🏦 "Source: Master Wallet" (admin's pooled funds)

## Technical Implementation

### Backend Changes (`celo-withdrawal/index.ts`)

```typescript
// STEP 1: Check user's personal wallet
if (user has celo_wallet_address && encrypted_wallet) {
  decrypt user's private key
  check user's balance for requested currency
  
  if (user has sufficient balance) {
    use user's wallet to send crypto ✅
    walletSource = "user"
  }
}

// STEP 2: Fallback to master wallet if needed
if (walletSource !== "user") {
  use master wallet to send crypto 🏦
  walletSource = "master"
}
```

### Frontend Changes

1. **WithdrawalDialog.tsx**
   - Imports `useCeloWallet` hook
   - Displays user's personal wallet balances (CELO, cUSD, USDT)
   - Shows green alert if user has personal funds
   - Updated instructions to explain dual-wallet system

2. **useCeloWallet.tsx**
   - Added USDT balance tracking
   - Added USDT_ADDRESS constant
   - `updateBalances()` now fetches USDT balance with correct decimals

## Benefits

### For Users
✅ Can always withdraw their own funds even if sweep failed
✅ No more "insufficient balance" errors when they have crypto in their wallet
✅ Transparent view of where their funds are
✅ Prevents "scam" feelings when master wallet is low

### For Admins
✅ Reduced support tickets about "lost funds"
✅ Less pressure to maintain high master wallet balances
✅ Failed sweeps are no longer critical issues
✅ Clear logging of which wallet was used for each withdrawal

## Database Schema

### User Wallet Storage (profiles table)
```sql
celo_wallet_address: string | null  -- User's personal Celo wallet address
encrypted_wallet: string | null     -- AES-encrypted private key
```

### Transaction Recording (crypto_transactions table)
```sql
-- Existing fields remain the same
-- Response now includes "source" field:
{
  success: true,
  txHash: "0x...",
  cryptoAmount: 10.5,
  currency: "cUSD",
  source: "user" | "master"  // NEW: Indicates which wallet was used
}
```

## Security Considerations

### Encryption
- User private keys are encrypted using `WALLET_ENCRYPTION_SECRET` environment variable
- Same encryption standard as master wallet
- Decryption only happens server-side during withdrawal

### Access Control
- Only the authenticated user can trigger withdrawal from their wallet
- Master wallet fallback requires `system_settings` access (service role only)
- All withdrawals still deduct from user's NC balance first

## Logging & Debugging

### Console Logs to Watch For

```
[WITHDRAWAL] 🔍 User has personal wallet: 0x...
[WITHDRAWAL] 🔓 User wallet decrypted successfully
[WITHDRAWAL] 💰 User's cUSD balance: 15.5000
[WITHDRAWAL] 📊 Required: 10.0000 cUSD
[WITHDRAWAL] ✅ Has enough: true
[WITHDRAWAL] ✅ Using USER'S personal wallet for withdrawal
```

OR

```
[WITHDRAWAL] ℹ️ User has no personal wallet, using master wallet
[WITHDRAWAL] 🏦 Using MASTER wallet: 0x71C3E...
```

## Testing Scenarios

### Scenario 1: User Has Sufficient Personal Funds
1. User deposits 100 cUSD to their personal wallet
2. Auto-sweep fails (intentionally disabled for testing)
3. User requests withdrawal of 50 cUSD
4. ✅ **Expected**: Withdrawal succeeds using user's wallet
5. ✅ **Source**: "user"

### Scenario 2: User Has Insufficient Personal Funds
1. User has 5 cUSD in their personal wallet
2. User requests withdrawal of 50 cUSD
3. ✅ **Expected**: System falls back to master wallet
4. ✅ **Source**: "master"

### Scenario 3: User Has No Personal Wallet
1. New user who never created a Celo wallet
2. User requests withdrawal
3. ✅ **Expected**: System uses master wallet
4. ✅ **Source**: "master"

## Future Enhancements

### Possible Improvements
- [ ] Manual sweep button for users with stuck funds
- [ ] Dashboard showing split of funds (personal vs master)
- [ ] Automatic retry of failed sweeps
- [ ] Warning if master wallet is running low
- [ ] Admin view of users with high personal wallet balances

## Migration Notes

### No Migration Needed
- Existing users with personal wallets automatically benefit
- No database schema changes required
- No user action required
- Backwards compatible with existing withdrawal flow

## Summary

This dual-wallet system ensures **users can always access their funds**, even when:
- Auto-sweep fails
- Master wallet is low on funds
- Blockchain issues prevent sweeps

The system intelligently chooses the best source for each withdrawal, prioritizing the user's own funds first, then falling back to the pooled master wallet. This prevents user frustration and reduces admin burden while maintaining security and transparency.
