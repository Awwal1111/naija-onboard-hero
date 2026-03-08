-- Make task-related storage buckets public so images load directly
UPDATE storage.buckets SET public = true WHERE id IN ('social-media-tasks', 'article-submissions', 'referral-tasks');