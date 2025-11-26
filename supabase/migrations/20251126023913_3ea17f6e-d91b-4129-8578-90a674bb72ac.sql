-- Add all missing columns to push_subscriptions table
ALTER TABLE public.push_subscriptions 
ADD COLUMN IF NOT EXISTS endpoint TEXT,
ADD COLUMN IF NOT EXISTS p256dh TEXT,
ADD COLUMN IF NOT EXISTS auth TEXT,
ADD COLUMN IF NOT EXISTS expiration_time TIMESTAMP WITH TIME ZONE;

-- Extract data from subscription JSONB to populate new columns for existing records
UPDATE public.push_subscriptions 
SET 
  endpoint = subscription->>'endpoint',
  p256dh = subscription->'keys'->>'p256dh',
  auth = subscription->'keys'->>'auth',
  expiration_time = CASE 
    WHEN subscription->>'expirationTime' IS NOT NULL 
    THEN to_timestamp((subscription->>'expirationTime')::bigint / 1000.0)
    ELSE NULL 
  END
WHERE endpoint IS NULL;

-- Make endpoint required after populating data
ALTER TABLE public.push_subscriptions 
ALTER COLUMN endpoint SET NOT NULL;

-- Add comments for clarity
COMMENT ON COLUMN public.push_subscriptions.endpoint IS 'Push subscription endpoint URL';
COMMENT ON COLUMN public.push_subscriptions.p256dh IS 'P256DH key from push subscription - required for Web Push API';
COMMENT ON COLUMN public.push_subscriptions.auth IS 'Auth key from push subscription - required for Web Push API';
COMMENT ON COLUMN public.push_subscriptions.expiration_time IS 'Optional expiration time for the subscription';

-- Create index on endpoint for faster duplicate checking
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_endpoint ON public.push_subscriptions(endpoint);

-- Create unique constraint to prevent duplicate subscriptions per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_push_subscriptions_user_endpoint 
ON public.push_subscriptions(user_id, endpoint);