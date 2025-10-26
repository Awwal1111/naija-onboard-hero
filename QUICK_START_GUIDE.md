# 🚀 Quick Start Guide - Master Wallet Setup

## ✅ What's Been Fixed

1. **User Wallets**: Each user now has their own permanent Celo wallet
2. **Auto-Sweep**: Deposits automatically transfer to master wallet
3. **Imports Fixed**: Added missing ethers and CryptoJS imports to webhook
4. **Master Wallet System**: Created secure master wallet generation

---

## 📋 Your Next Steps (Do This Now)

### Step 1: Create Master Wallet (2 minutes)
1. Open your app
2. Go to **Admin Dashboard** → **Wallet Management** tab
3. Click **"Create Master Wallet"** button
4. **Copy the wallet address** that appears
5. Keep this address safe - you'll need it!

### Step 2: Fund Master Wallet (5 minutes)
You need to send CELO for gas fees:

**Option A - Buy CELO:**
1. Use Binance/OKX/other exchange
2. Buy at least **0.1 CELO** (around $0.05 USD)
3. Withdraw to the master wallet address you copied
4. **Important**: Use **Celo Network** (not ERC-20, not BEP-20)

**Option B - Swap for CELO:**
If you have cUSD/USDT on Celo already:
1. Go to https://app.ubeswap.org/
2. Connect wallet with your master wallet address
3. Swap some cUSD for CELO (0.1 CELO is enough)

### Step 3: Test Deposit (10 minutes)
1. Go to your user profile deposit dialog
2. Copy your user wallet address
3. Send a **small test amount** (like $1 worth of cUSD)
4. Wait 2-5 minutes
5. Check if:
   - Your NC balance increased ✓
   - Webhook logs show successful sweep ✓
   - Master wallet received the funds ✓

---

## 🔍 How to Verify It's Working

### Check Webhook Logs:
```
Look for these messages in Supabase Edge Function logs:
✅ [CREDIT] Credited X NC to user...
✅ [SWEEP] Successfully swept X cUSD to master wallet
```

### Check Master Wallet:
1. Go to Admin Dashboard → Wallet Management
2. Click "Refresh Balances"
3. You should see:
   - CELO balance (for gas)
   - cUSD balance (deposited funds)

### Check Your NC Balance:
1. Your user NC balance should increase
2. Transaction history should show the deposit

---

## 🐛 Troubleshooting

### "Master wallet not initialized"
→ Complete Step 1 above

### "Sweep failed - insufficient gas"
→ Master wallet needs more CELO (do Step 2)

### "No user found with wallet address"
→ User needs a wallet. Run "User Wallet Migration" from Admin Dashboard

### Deposit credited but not swept
→ Check webhook logs for error details
→ Verify `WALLET_ENCRYPTION_SECRET` is set in Supabase

---

## 💡 Important Notes

1. **Master Wallet = Bank Vault**: All user funds will be stored here
2. **Gas Fees**: Always keep 0.05+ CELO in master wallet
3. **One-Time Setup**: Master wallet can only be created once
4. **Backup**: The encrypted private key is in your database `system_settings` table
5. **Never Share**: Keep your master wallet address private (only for funding)

---

## 📊 What You'll See

### In Admin Dashboard:
- Master wallet address
- Master wallet balances (CELO, cUSD, USDT)
- Total user NC balances
- Recent transactions

### When Users Deposit:
1. User sends crypto → Their wallet
2. Webhook detects → Credits NC
3. Auto-sweep → Moves to master wallet
4. User sees NC balance update

### When Users Withdraw:
1. User requests withdrawal
2. Master wallet sends crypto
3. User NC balance decreases
4. Blockchain transaction completed

---

## 🎯 Your Checklist

- [ ] Create master wallet (Admin Dashboard)
- [ ] Copy master wallet address
- [ ] Send 0.1 CELO to master wallet
- [ ] Wait for confirmation (~30 seconds)
- [ ] Test deposit with small amount
- [ ] Verify NC credited and swept
- [ ] Check master wallet balance increased
- [ ] System is ready! 🎉

---

## 📞 Need Help?

If something isn't working:
1. Check Supabase Edge Function logs for errors
2. Verify master wallet has CELO for gas
3. Check `system_settings` table has master wallet entries
4. Review `crypto_transactions` table for failed deposits

---

**You're all set!** Once you complete the checklist, your platform will:
- Accept deposits automatically
- Credit users instantly
- Sweep funds to master wallet
- Process withdrawals from master wallet

The master wallet address you're about to generate is where you'll fund the system with CELO for gas fees. Users will each have their own unique addresses for receiving deposits.
