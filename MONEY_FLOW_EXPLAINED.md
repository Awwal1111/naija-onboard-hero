# 💰 Complete Money Flow Explanation

## Overview
This document explains **exactly** where money comes from and goes to in the NaijaLancers app.

---

## 🔄 DEPOSIT FLOW (When Users Send Real Money)

### Step 1: User Sends Crypto
- User sends **USDT, cUSD, or CELO** to their personal wallet address shown in the app
- This address is stored in `profiles.celo_wallet_address`
- **The crypto goes directly to the USER'S wallet** (not admin wallet)

### Step 2: Alchemy Detects Transaction
- Alchemy webhook monitors blockchain for incoming transactions
- When crypto arrives at user's address, Alchemy calls: `celo-deposit-webhook`

### Step 3: Backend Credits User
The `celo-deposit-webhook` function:
1. Finds user by matching transaction `toAddress` with `profiles.celo_wallet_address`
2. Converts crypto amount to NC (Naira Credits) based on current exchange rates
3. Credits user's balance in database:
   - `profiles.wallet_balance` (total balance)
   - `profiles.balance_withdrawable` (can withdraw this)
4. Creates transaction records:
   - `crypto_transactions` table (crypto deposit details)
   - `wallet_transactions` table (NC credit record)

### Summary:
```
User's External Wallet → User's Celo Wallet Address → Database Balance Updated
```

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
- **User Wallet**: Each user has own Celo wallet (for receiving deposits)
- **Master Wallet**: Admin-controlled wallet (for sending withdrawals)
- Private keys stored securely in environment variables
