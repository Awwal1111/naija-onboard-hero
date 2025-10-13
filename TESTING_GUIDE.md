# Testing Guide - Admin Features

## Step 1: Create Admin Account

### Option A: Sign Up with Gmail
1. Go to `/signup` page
2. Use your Gmail address (e.g., `youremail@gmail.com`)
3. Create a strong password
4. Complete onboarding

### Option B: Use SQL to Assign Admin Role

After creating your account, run this SQL in Supabase SQL Editor:

```sql
-- Replace 'youremail@gmail.com' with your actual email
DO $$
DECLARE
  target_user_id UUID;
BEGIN
  -- Get user ID from email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = 'youremail@gmail.com';
  
  IF target_user_id IS NOT NULL THEN
    -- Assign admin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (target_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;
    
    -- Give test balance for purchasing
    UPDATE public.profiles
    SET 
      wallet_balance = 100000,
      balance_withdrawable = 100000
    WHERE user_id = target_user_id;
    
    RAISE NOTICE 'Admin role assigned to user: %', target_user_id;
  ELSE
    RAISE NOTICE 'User not found with email: youremail@gmail.com';
  END IF;
END $$;
```

## Step 2: Test All Features

### 1. Jobs Feature (`/jobs-enhanced`)
**As Job Poster:**
- [ ] Click "Post a Job"
- [ ] Fill in comprehensive job details (company, requirements, benefits)
- [ ] Submit job posting
- [ ] View your posted job at `/jobs/:id`

**As Job Seeker:**
- [ ] Browse jobs
- [ ] Click on a job to view details
- [ ] Click "Apply Now"
- [ ] Fill application form with cover letter, resume URL, expected salary
- [ ] Submit application
- [ ] Check application status

**Test Checklist:**
- Job posting creation works
- Job detail page displays correctly
- Application form submission works
- Applications count increments
- Applicant can see their application status

---

### 2. Digital Products Feature (`/digital-products`)
**As Seller:**
- [ ] Click "Create Product"
- [ ] Fill comprehensive product details:
  - Basic info (title, price, category)
  - Features list
  - Technical details (file format, size, version)
  - Demo URL
  - License type
- [ ] Submit product

**As Buyer:**
- [ ] Browse products
- [ ] View product detail at `/products/:id`
- [ ] Click "Purchase Now"
- [ ] Confirm payment (₦NC deducted from wallet)
- [ ] After purchase, see "Download Now" button
- [ ] Click to download product
- [ ] Leave a review with rating

**Test Checklist:**
- Product creation works
- Product detail page shows all info
- Purchase flow completes
- Wallet balance deducted correctly
- Seller receives payment
- Download access granted after purchase
- Reviews display correctly
- Average rating updates

---

### 3. Courses Feature (`/courses`)
**As Instructor:**
- [ ] Click "Create Course"
- [ ] Fill comprehensive course details:
  - Basic info (title, description, price)
  - Curriculum sections
  - Learning objectives
  - Prerequisites
  - Instructor info
  - Duration and level
- [ ] Submit course

**As Student:**
- [ ] Browse courses
- [ ] View course detail at `/courses/:id`
- [ ] Click "Enroll Now"
- [ ] Confirm enrollment payment
- [ ] After enrollment, see "Continue Learning" button
- [ ] View progress bar
- [ ] Leave a review with rating

**Test Checklist:**
- Course creation works
- Curriculum displays correctly
- Enrollment process completes
- Payment processed correctly
- Progress tracking works
- Reviews and ratings work
- Instructor receives payment

---

### 4. Fundraising Feature (`/fundraising`)
**As Campaign Creator:**
- [ ] Click "Create Campaign"
- [ ] Fill comprehensive campaign details:
  - Basic info (title, goal, category)
  - Detailed story
  - Beneficiary information
  - Fund usage breakdown
  - Supporting documents
  - Campaign image
  - Deadline
- [ ] Submit campaign

**As Contributor:**
- [ ] Browse campaigns
- [ ] View campaign detail at `/fundraising/:id`
- [ ] Click "Contribute Now"
- [ ] Enter contribution amount (min ₦10NC)
- [ ] Confirm contribution
- [ ] See your contribution in recent contributors
- [ ] Watch progress bar update

**Test Checklist:**
- Campaign creation works
- All campaign details display
- Progress bar shows correctly
- Contribution flow works
- Wallet deduction happens
- Campaign raised amount updates
- Backer count increments
- Days left calculates correctly

---

## Step 3: Admin Dashboard Testing (`/admin/dashboard`)

**Admin Features:**
- [ ] View all statistics (users, jobs, products, courses, fundraising)
- [ ] Approve/reject fundraising campaigns
- [ ] Verify products and courses
- [ ] View expert applications
- [ ] Manage withdrawals
- [ ] View transaction history

---

## Step 4: Wallet Testing

**Initial Balance:**
After running the SQL script, you should have ₦100,000NC

**Test Transactions:**
1. **Purchase Product**: ₦5,000NC
2. **Enroll in Course**: ₦10,000NC
3. **Contribute to Fundraising**: ₦1,000NC
4. **Create Job Post**: Free
5. **Check wallet history**: Should see all transactions

**Verify:**
- [ ] Balance updates correctly after each transaction
- [ ] Transaction history shows all activities
- [ ] Sellers/instructors receive payments
- [ ] Campaign creators receive contributions

---

## Step 5: End-to-End Flow Testing

### Complete User Journey:
1. Sign up with Gmail
2. Complete onboarding
3. Get admin role (SQL script)
4. Post a job
5. Create a product
6. Create a course
7. Start a fundraising campaign
8. Switch to different user (sign out, sign up again)
9. Apply to job
10. Purchase product
11. Enroll in course
12. Contribute to campaign
13. Check all notifications
14. Verify all payments processed

---

## Common Issues & Solutions

### Issue: "Insufficient balance"
**Solution**: Run the SQL script to add test balance

### Issue: Can't see admin features
**Solution**: Ensure admin role is assigned via SQL script

### Issue: Purchase fails
**Solution**: Check wallet balance and RLS policies

### Issue: Download not working
**Solution**: Verify product_downloads table has entry after purchase

### Issue: Course access denied
**Solution**: Check course_enrollments table for enrollment record

---

## Quick SQL Queries for Verification

```sql
-- Check user role
SELECT u.email, ur.role
FROM auth.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'youremail@gmail.com';

-- Check wallet balance
SELECT u.email, p.wallet_balance, p.balance_withdrawable
FROM auth.users u
JOIN public.profiles p ON u.id = p.user_id
WHERE u.email = 'youremail@gmail.com';

-- Check all purchases
SELECT 
  u.email,
  dp.title as product,
  dpp.amount,
  dpp.created_at
FROM digital_product_purchases dpp
JOIN auth.users u ON dpp.buyer_id = u.id
JOIN digital_products dp ON dpp.product_id = dp.id
ORDER BY dpp.created_at DESC;

-- Check all enrollments
SELECT 
  u.email,
  c.title as course,
  ce.amount,
  ce.created_at
FROM course_enrollments ce
JOIN auth.users u ON ce.student_id = u.id
JOIN courses c ON ce.course_id = c.id
ORDER BY ce.created_at DESC;

-- Check all contributions
SELECT 
  u.email,
  f.title as campaign,
  fc.amount,
  fc.created_at
FROM fundraising_contributions fc
JOIN auth.users u ON fc.contributor_id = u.id
JOIN fundraisings f ON fc.fundraising_id = f.id
ORDER BY fc.created_at DESC;

-- Check all job applications
SELECT 
  u.email,
  jp.title as job,
  jpa.status,
  jpa.created_at
FROM job_post_applications jpa
JOIN auth.users u ON jpa.applicant_id = u.id
JOIN job_posts jp ON jpa.job_post_id = jp.id
ORDER BY jpa.created_at DESC;
```

---

## Expected Results After Testing

✅ All features create records in database
✅ All payments process correctly
✅ Wallet balances update accurately
✅ Detail pages display complete information
✅ Purchase/enrollment grants access
✅ Reviews and ratings work
✅ Application tracking works
✅ Progress tracking functions
✅ All transactions logged properly

---

## Need Help?

If any feature doesn't work as expected:
1. Check browser console for errors
2. Verify RLS policies in Supabase
3. Check database records were created
4. Verify wallet balance is sufficient
5. Ensure user is authenticated properly
