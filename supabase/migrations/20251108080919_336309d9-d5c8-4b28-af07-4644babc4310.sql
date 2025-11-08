-- Add is_demo flag to prevent users from purchasing example content
-- This protects users from losing funds on placeholder/demo items

ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

ALTER TABLE digital_products 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

ALTER TABLE fundraisings 
ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Add comments to explain the purpose
COMMENT ON COLUMN courses.is_demo IS 'Flag to mark example/demo courses that should not be purchasable';
COMMENT ON COLUMN digital_products.is_demo IS 'Flag to mark example/demo products that should not be purchasable';
COMMENT ON COLUMN fundraisings.is_demo IS 'Flag to mark example/demo campaigns that should not accept contributions';

-- Mark any existing content as demo by default (admin can unmark real ones later)
UPDATE courses SET is_demo = true WHERE created_at < NOW();
UPDATE digital_products SET is_demo = true WHERE created_at < NOW();
UPDATE fundraisings SET is_demo = true WHERE created_at < NOW();