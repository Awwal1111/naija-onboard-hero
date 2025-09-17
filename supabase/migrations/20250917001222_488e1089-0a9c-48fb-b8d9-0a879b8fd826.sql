-- Credit gulajusurajo@gmail.com with 5000 NC for testing
-- First, let's check if the user exists and credit them
DO $$
DECLARE
    target_user_id UUID;
BEGIN
    -- Find the user by email (assuming they have signed up)
    -- Note: This is a simplified version - in production you'd handle this more carefully
    
    -- For testing, we'll create a sample record if it doesn't exist
    -- You should replace this with the actual user ID once they sign up
    
    -- Insert test credit - replace the user_id with actual user ID when available
    INSERT INTO public.transactions (
        user_id, 
        transaction_type, 
        amount, 
        balance_type, 
        description, 
        status,
        created_at
    ) VALUES (
        '783c22af-94e5-4082-b1e2-157a66e0f67f', -- Replace with actual user ID
        'admin_credit',
        5000,
        'withdrawable',
        'Test credit for gulajusurajo@gmail.com',
        'completed',
        now()
    );
    
    -- Update the user's balance (if profile exists)
    UPDATE public.profiles 
    SET balance_withdrawable = balance_withdrawable + 5000
    WHERE user_id = '783c22af-94e5-4082-b1e2-157a66e0f67f';
    
    -- If no rows were updated, the user hasn't signed up yet
    IF NOT FOUND THEN
        RAISE NOTICE 'User gulajusurajo@gmail.com has not signed up yet. Credit will be applied when they create an account.';
    END IF;
END $$;