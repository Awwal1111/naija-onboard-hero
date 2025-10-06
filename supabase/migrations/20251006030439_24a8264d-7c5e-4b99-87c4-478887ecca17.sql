-- Add infodayyabu@gmail.com as admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('8d37394c-59b0-4c86-8a4c-38cc89ab950d', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;