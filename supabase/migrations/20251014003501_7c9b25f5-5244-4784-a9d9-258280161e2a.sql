-- Make the profiles storage bucket public so profile pictures can be displayed
UPDATE storage.buckets 
SET public = true 
WHERE name = 'profiles';