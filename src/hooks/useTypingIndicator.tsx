import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface TypingUser {
  user_id: string;
  full_name: string;
  is_typing: boolean;
  last_typed: string;
}

export function useTypingIndicator(chatId: string | null, otherUserId: string) {
  const { user } = useAuth();
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSentRef = useRef<number>(0);

  // Listen for typing events from other user
  useEffect(() => {
    if (!chatId || !user) return;

    const channel = supabase.channel(`typing-${chatId}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const otherUserState = Object.values(state)
          .flat()
          .find((p: any) => p.user_id === otherUserId && p.is_typing);
        
        setIsOtherTyping(!!otherUserState);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [chatId, user, otherUserId]);

  // Broadcast typing status (throttled)
  const setTyping = useCallback(async (isTyping: boolean) => {
    if (!chatId || !user) return;

    const now = Date.now();
    // Throttle to once per 2 seconds for 'typing' events
    if (isTyping && now - lastSentRef.current < 2000) return;
    lastSentRef.current = now;

    try {
      const channel = supabase.channel(`typing-${chatId}`);
      
      await channel.track({
        user_id: user.id,
        is_typing: isTyping,
        last_typed: new Date().toISOString()
      });

      // Auto-clear typing after 3 seconds
      if (isTyping) {
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
          setTyping(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error setting typing status:', error);
    }
  }, [chatId, user]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return { isOtherTyping, setTyping };
}
