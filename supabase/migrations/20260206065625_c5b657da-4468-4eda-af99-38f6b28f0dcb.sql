-- Delete spam stories from user: Ajuwon kolawole (keep only the most recent one)
DELETE FROM stories 
WHERE user_id = 'ecf96973-d3b9-4adb-9fb0-3e6fb42e5ae8' 
  AND expires_at > NOW()
  AND id != (
    SELECT id FROM stories 
    WHERE user_id = 'ecf96973-d3b9-4adb-9fb0-3e6fb42e5ae8' 
      AND expires_at > NOW()
    ORDER BY created_at DESC 
    LIMIT 1
  );