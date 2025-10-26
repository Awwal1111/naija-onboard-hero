# 💰 Complete Money Flow Explanation

## Overview
This document explains **exactly** where money comes from and goes to in the NaijaLancers app.

NaijaLancers uses a **semi-custodial wallet system**:
- Each user has their own permanent Celo wallet address
- Deposits are automatically swept to the admin's master wallet
- Withdrawals are sent from the master wallet

---

## 🔄 DEPOSIT FLOW (When Users Send Real Money)

### Step 1: User Sends Crypto
- User sends **USDT, cUSD, or CELO** to their personal wallet address shown in the app
- This address is stored in `profiles.celo_wallet_address`
- Each user has a **permanent, unique** Celo wallet created during signup
- **The crypto goes directly to the USER'S wallet** first

### Step 2: Alchemy Detects Transaction
- Alchemy webhook monitors blockchain for incoming transactions
- When crypto arrives at user's address, Alchemy calls: `celo-deposit-webhook`

### Step 3: Backend Credits User & Auto-Sweeps
The `celo-deposit-webhook` function:
1. Finds user by matching transaction `toAddress` with `profiles.celo_wallet_address`
2. Converts crypto amount to NC (Naira Credits) based on current exchange rates
3. Credits user's balance in database:
   - `profiles.wallet_balance` (total balance)
   - `profiles.balance_withdrawable` (can withdraw this)
4. Creates transaction records:
   - `crypto_transactions` table (crypto deposit details)
   - `wallet_transactions` table (NC credit record)
5. **AUTO-SWEEP**: Immediately transfers crypto from user's wallet to master wallet:
   - Decrypts user's wallet private key
   - Sends all deposited crypto to admin's master wallet
   - This ensures funds are safely pooled and ready for withdrawals

### Summary:
```
User's External Wallet → User's Celo Wallet → NC Credited → Auto-Swept to Master Wallet
```

**Why Auto-Sweep?**
- Centralizes all funds for security
- Ensures liquidity for user withdrawals
- Prevents users from withdrawing crypto directly from their wallet
- Master wallet pays gas fees for all sweeps

---

## 💸 WITHDRAWAL FLOW (When Users Want Money Out)

### Option 1: Crypto Withdrawal (Automatic - Instant)

#### User Requests Withdrawal:
- User enters: NC amount, recipient wallet address, currency (cUSD/CELO)
- Minimum: NC 3,000

#### Backend Processes:
The `celo-withdrawal` function:
1. Validates user has sufficient `balance_withdrawable`
2. Deducts NC from user's database balance:
   - `profiles.wallet_balance` -= amount
   - `profiles.balance_withdrawable` -= amount
3. Converts NC to crypto using current exchange rates
4. **Sends crypto from MASTER WALLET** (admin-controlled wallet with private key)
5. Records transaction with blockchain hash

#### Important:
- **Money comes FROM**: Admin's master wallet (not user's wallet)
- **User's NC balance**: Deducted from database
- **Crypto sent**: From admin wallet to user's specified address

### Option 2: Bank Withdrawal (Manual - Slower)

#### User Requests:
- Enters: NC amount, bank details
- Minimum: NC 3,000

#### Backend Creates Payout Request:
- Deducts from user's `balance_withdrawable`
- Creates record in `payouts` table with status "pending"
- Admin manually processes and sends bank transfer
- Updates status to "completed" or "failed"

### Summary:
```
User's NC Balance (Database) → Admin Master Wallet → User's External Wallet/Bank
```

---

## 🎯 TASK COMPLETION FLOW (Earning Money)

### When User Completes Tasks:

#### Social Media Tasks:
1. User submits proof (screenshot/explanation)
2. Record created in `social_tasks_progress` with status "pending"
3. **No money credited yet** - just transaction record showing "pending"

#### Referral Tasks:
1. User submits proof
2. Record created in `referral_submissions` with status "pending"
3. **No money credited yet** - just transaction record showing "pending"

### When Admin Approves:

#### Admin Clicks "Approve & Pay":
1. Updates submission status to "completed"/"approved"
2. Credits user's balance:
   ```javascript
   wallet_balance += reward_amount
   balance_withdrawable += reward_amount  // Can withdraw these earnings!
   ```
3. Creates completed transaction in `wallet_transactions`

#### Why Tasks Show in History But No Balance?
- **Before Approval**: Transaction shows as "pending" in history
- **After Approval**: Balance updates AND transaction status changes to "completed"
- **Solution**: Admin must approve the task for balance to update

### Summary:
```
Task Submitted → Pending (Shows in History) → Admin Approves → Balance Updated
```

---

## 🔑 KEY TAKEAWAYS

### 1. **Deposits** (Money Coming IN)
- Crypto sent to → User's personal Celo wallet
- Alchemy webhook → Detects and credits NC balance
- User's crypto stays in their wallet, NC balance increases

### 2. **Withdrawals** (Money Going OUT)
- NC balance deducted from database
- Crypto sent from → **Admin's master wallet** (NOT user's wallet)
- User receives crypto at their specified address

### 3. **Task Earnings** (Pending vs Completed)
- Submission creates "pending" transaction (shows in history)
- No balance update until admin approves
- After approval: Balance increases, transaction marked "completed"

---

## 🛠️ Technical Implementation

### Database Tables:
- `profiles`: Stores `wallet_balance`, `balance_withdrawable`, `celo_wallet_address`
- `crypto_transactions`: Records all crypto deposits/withdrawals
- `wallet_transactions`: Records all NC balance changes
- `social_tasks_progress`: Social media task submissions
- `referral_submissions`: Referral task submissions

### Edge Functions:
- `celo-deposit-webhook`: Processes incoming crypto deposits
- `celo-withdrawal`: Processes outgoing crypto withdrawals
- Admin approval functions update balances directly in database

### Wallets:
- **User Wallet**: Each user has their own permanent Celo wallet
  - Address stored in `profiles.celo_wallet_address`
  - Encrypted private key stored in `profiles.encrypted_wallet`
  - Used only for receiving deposits (funds immediately swept out)
- **Master Wallet**: Admin-controlled wallet that holds all pooled funds
  - Created once via `initialize-master-wallet` function
  - Encrypted private key stored in `system_settings` table
  - Address stored in `system_settings.master_wallet_address`
  - Used for sending withdrawals and paying gas fees
  - Must always have CELO for gas (minimum 0.1 CELO recommended)

### Security:
- All private keys encrypted with `WALLET_ENCRYPTION_SECRET`
- Users never see their private keys
- Only backend can decrypt for sweep/withdrawal operations
- Master wallet private key never exposed to frontend

---

## 🔧 Master Wallet Setup (Admin Only - One Time)

### How to Initialize:
1. Go to **Admin Dashboard** → **Wallet Management** tab
2. Click **"Create Master Wallet"** button
3. System generates a secure Celo wallet and stores encrypted private key
4. Copy the master wallet address
5. **CRITICAL**: Send at least **0.1 CELO** to this address for gas fees

### Why You Need This:
- Without master wallet, auto-sweep won't work
- Without gas (CELO), transactions will fail
- This is the wallet that holds all user funds
- This is the wallet that sends withdrawals

### Monitoring:
- Check master wallet balances regularly in Admin Dashboard
- Keep CELO balance above 0.05 at all times
- Master wallet cUSD/USDT should roughly match total user NC balances
