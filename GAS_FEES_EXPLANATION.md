# Gas Fees and Fund Recovery Explanation

## How the System Works

### When Users Deposit Crypto

1. **User sends crypto** (USDT, cUSD, CELO) to their personal wallet address
2. **Webhook detects deposit** and credits user's NC balance immediately
3. **Auto-sweep attempts** to transfer crypto from user wallet to master wallet
4. **If sweep fails** due to insufficient gas:
   - User is still credited NC (funds are safe!)
   - Crypto stays in user's personal wallet
   - A sweep reversal message appears in logs

### Why Sweeps Fail

- User wallets have **NO CELO for gas fees**
- Moving USDT or cUSD requires ~0.001-0.002 CELO for transaction fees
- If user only deposits USDT/cUSD without CELO, sweep cannot complete

## How Admin Recovers Funds

### Option 1: Manual Recovery (Current Method)
1. Admin can see which user wallets have unswept funds
2. Admin sends small amount of CELO (0.01) to user's wallet for gas
3. Trigger sweep again manually, or wait for next deposit
4. Funds transfer to master wallet successfully

### Option 2: Gas Station (Future Enhancement)
- System automatically sends gas to user wallets when needed
- Deducts gas cost from user's NC balance
- Auto-retries sweep after funding

### Option 3: CELO Deposits (Preferred)
- When users deposit CELO first, it can be used for gas
- Subsequent USDT/cUSD deposits will sweep successfully
- Recommend users deposit 0.01 CELO first

## Current Status

✅ **User funds are SAFE** - even if sweep fails, crypto stays in their wallet
✅ **User NC is credited** - they can use their balance immediately
⚠️ **Admin must manually recover** - send gas to user wallets when needed

## Viewing Unswept Funds

To see which wallets need manual recovery:

```sql
-- Check user wallets with balances
SELECT 
  p.user_id,
  p.full_name,
  p.celo_wallet_address,
  SUM(ct.crypto_amount) as total_deposited,
  ct.crypto_currency
FROM profiles p
JOIN crypto_transactions ct ON ct.user_id = p.user_id
WHERE ct.status = 'completed' 
  AND ct.transaction_type = 'deposit'
GROUP BY p.user_id, p.full_name, p.celo_wallet_address, ct.crypto_currency
```

Then check these addresses on Celo blockchain explorer to see actual balances.

## Best Practices

1. **Monitor deposits** - Check for failed sweeps regularly
2. **Fund master wallet** - Keep enough CELO for gas (minimum 0.5 CELO)
3. **Educate users** - Tell them to deposit small CELO first
4. **Track sweep failures** - Log which deposits need manual recovery

## Migration Results (0 Users)

The migration shows "0 users" because:
- It only creates wallets for users **without** `celo_wallet_address`
- Your existing users already have wallet addresses from previous system
- They may lack `encrypted_wallet` (private keys) but addresses exist

To fix old users without private keys, you'd need a different migration that:
1. Finds users with `celo_wallet_address` but NO `encrypted_wallet`
2. Generates NEW wallets for them (new addresses)
3. Notifies them of new addresses

**Note:** You cannot recover old wallet private keys if they were never encrypted and stored!
