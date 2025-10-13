-- Add comprehensive fields to fundraisings table
ALTER TABLE fundraisings
ADD COLUMN IF NOT EXISTS category text CHECK (category IN ('medical', 'education', 'emergency', 'business', 'community', 'personal', 'other')),
ADD COLUMN IF NOT EXISTS beneficiary_name text,
ADD COLUMN IF NOT EXISTS beneficiary_relationship text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS detailed_story text,
ADD COLUMN IF NOT EXISTS fund_usage_breakdown jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS risks_challenges text,
ADD COLUMN IF NOT EXISTS supporting_documents jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS minimum_contribution numeric DEFAULT 10,
ADD COLUMN IF NOT EXISTS featured_image_url text;