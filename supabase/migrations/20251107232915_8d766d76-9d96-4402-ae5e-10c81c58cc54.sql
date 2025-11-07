-- Add check constraint to prevent self-connections
ALTER TABLE connections 
ADD CONSTRAINT no_self_connections 
CHECK (user1_id <> user2_id);

-- Add check constraint to prevent self-connection requests
ALTER TABLE connection_requests 
ADD CONSTRAINT no_self_requests 
CHECK (requester_id <> requested_id);

-- Delete any existing self-connections (if any)
DELETE FROM connections 
WHERE user1_id = user2_id;

-- Delete any existing self-requests (if any)
DELETE FROM connection_requests 
WHERE requester_id = requested_id;