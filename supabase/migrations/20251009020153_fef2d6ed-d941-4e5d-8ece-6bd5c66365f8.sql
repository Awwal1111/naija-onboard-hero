-- Create function to send notifications for various events

-- 1. Notification for new messages
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
BEGIN
  -- Get recipient ID (the other user in the chat)
  SELECT CASE 
    WHEN user1_id = NEW.sender_id THEN user2_id
    ELSE user1_id
  END INTO recipient_id
  FROM chats WHERE id = NEW.chat_id;

  -- Get sender name
  SELECT full_name INTO sender_name
  FROM profiles WHERE user_id = NEW.sender_id;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    recipient_id,
    'message',
    'New Message',
    COALESCE(sender_name, 'Someone') || ' sent you a message',
    jsonb_build_object('chat_id', NEW.chat_id, 'message_id', NEW.id)
  );

  RETURN NEW;
END;
$$;

-- 2. Notification for connection requests
CREATE OR REPLACE FUNCTION notify_connection_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  requester_name TEXT;
BEGIN
  IF NEW.status = 'pending' AND (OLD IS NULL OR OLD.status != 'pending') THEN
    -- Get requester name
    SELECT full_name INTO requester_name
    FROM profiles WHERE user_id = NEW.requester_id;

    -- Insert notification
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.requested_id,
      'connection_request',
      'New Connection Request',
      COALESCE(requester_name, 'Someone') || ' wants to connect with you',
      jsonb_build_object('request_id', NEW.id, 'requester_id', NEW.requester_id)
    );
  ELSIF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
    -- Notify requester that their request was accepted
    SELECT full_name INTO requester_name
    FROM profiles WHERE user_id = NEW.requested_id;

    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.requester_id,
      'connection',
      'Connection Accepted',
      COALESCE(requester_name, 'Someone') || ' accepted your connection request',
      jsonb_build_object('user_id', NEW.requested_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Notification for post reactions
CREATE OR REPLACE FUNCTION notify_post_reaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  post_author_id UUID;
  reactor_name TEXT;
BEGIN
  -- Get post author
  SELECT user_id INTO post_author_id
  FROM posts WHERE id = NEW.post_id;

  -- Don't notify if reacting to own post
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get reactor name
  SELECT full_name INTO reactor_name
  FROM profiles WHERE user_id = NEW.user_id;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    post_author_id,
    'post_reaction',
    'New Reaction',
    COALESCE(reactor_name, 'Someone') || ' reacted to your post',
    jsonb_build_object('post_id', NEW.post_id, 'reactor_id', NEW.user_id, 'reaction_type', NEW.reaction_type)
  );

  RETURN NEW;
END;
$$;

-- 4. Notification for post comments
CREATE OR REPLACE FUNCTION notify_post_comment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  post_author_id UUID;
  commenter_name TEXT;
BEGIN
  -- Get post author
  SELECT user_id INTO post_author_id
  FROM posts WHERE id = NEW.post_id;

  -- Don't notify if commenting on own post
  IF post_author_id = NEW.user_id THEN
    RETURN NEW;
  END IF;

  -- Get commenter name
  SELECT full_name INTO commenter_name
  FROM profiles WHERE user_id = NEW.user_id;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    post_author_id,
    'post_comment',
    'New Comment',
    COALESCE(commenter_name, 'Someone') || ' commented on your post',
    jsonb_build_object('post_id', NEW.post_id, 'comment_id', NEW.id, 'commenter_id', NEW.user_id)
  );

  RETURN NEW;
END;
$$;

-- 5. Notification for expert ratings
CREATE OR REPLACE FUNCTION notify_expert_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  rater_name TEXT;
BEGIN
  -- Get rater name
  SELECT full_name INTO rater_name
  FROM profiles WHERE user_id = NEW.user_id;

  -- Insert notification
  INSERT INTO notifications (user_id, type, title, message, metadata)
  VALUES (
    NEW.expert_id,
    'expert_rating',
    'New Rating Received',
    COALESCE(rater_name, 'Someone') || ' rated you ' || NEW.rating || ' stars',
    jsonb_build_object('rating_id', NEW.id, 'rater_id', NEW.user_id, 'rating', NEW.rating)
  );

  RETURN NEW;
END;
$$;

-- 6. Notification for wallet transactions
CREATE OR REPLACE FUNCTION notify_wallet_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only notify for completed transactions
  IF NEW.status = 'completed' THEN
    INSERT INTO notifications (user_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      'transaction',
      'Wallet Update',
      CASE
        WHEN NEW.kind = 'deposit' THEN 'Deposit of ₦' || ABS(NEW.amount) || 'NC successful'
        WHEN NEW.kind = 'withdrawal' THEN 'Withdrawal of ₦' || ABS(NEW.amount) || 'NC processed'
        WHEN NEW.kind = 'transfer_in' THEN 'Received ₦' || ABS(NEW.amount) || 'NC transfer'
        WHEN NEW.kind = 'transfer_out' THEN 'Sent ₦' || ABS(NEW.amount) || 'NC transfer'
        WHEN NEW.kind LIKE '%_reward' THEN 'Earned ₦' || ABS(NEW.amount) || 'NC reward'
        ELSE 'Transaction of ₦' || ABS(NEW.amount) || 'NC'
      END,
      jsonb_build_object('transaction_id', NEW.id, 'amount', NEW.amount, 'kind', NEW.kind)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create triggers
DROP TRIGGER IF EXISTS trg_notify_new_message ON messages;
CREATE TRIGGER trg_notify_new_message
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION notify_new_message();

DROP TRIGGER IF EXISTS trg_notify_connection_request ON connection_requests;
CREATE TRIGGER trg_notify_connection_request
  AFTER INSERT OR UPDATE ON connection_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_connection_request();

DROP TRIGGER IF EXISTS trg_notify_post_reaction ON post_reactions;
CREATE TRIGGER trg_notify_post_reaction
  AFTER INSERT ON post_reactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_reaction();

DROP TRIGGER IF EXISTS trg_notify_post_comment ON post_comments;
CREATE TRIGGER trg_notify_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION notify_post_comment();

DROP TRIGGER IF EXISTS trg_notify_expert_rating ON expert_ratings;
CREATE TRIGGER trg_notify_expert_rating
  AFTER INSERT ON expert_ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_expert_rating();

DROP TRIGGER IF EXISTS trg_notify_wallet_transaction ON wallet_transactions;
CREATE TRIGGER trg_notify_wallet_transaction
  AFTER INSERT OR UPDATE ON wallet_transactions
  FOR EACH ROW
  EXECUTE FUNCTION notify_wallet_transaction();