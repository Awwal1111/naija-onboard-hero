import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const EMOJI_OPTIONS = ['❤️', '😂', '👍', '😮', '😢', '🔥'];

interface Reaction {
  emoji: string;
  count: number;
  hasReacted: boolean;
}

interface MessageReactionsProps {
  messageId: string;
  isOwn: boolean;
}

export function MessageReactions({ messageId, isOwn }: MessageReactionsProps) {
  const { user } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  const fetchReactions = async () => {
    const { data } = await supabase
      .from('message_reactions' as any)
      .select('emoji, user_id')
      .eq('message_id', messageId);

    if (!data) return;

    const grouped: Record<string, { count: number; hasReacted: boolean }> = {};
    (data as any[]).forEach((r: any) => {
      if (!grouped[r.emoji]) grouped[r.emoji] = { count: 0, hasReacted: false };
      grouped[r.emoji].count++;
      if (r.user_id === user?.id) grouped[r.emoji].hasReacted = true;
    });

    setReactions(
      Object.entries(grouped).map(([emoji, info]) => ({ emoji, ...info }))
    );
  };

  useEffect(() => {
    fetchReactions();

    const channel = supabase
      .channel(`reactions-${messageId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'message_reactions',
        filter: `message_id=eq.${messageId}`
      }, () => {
        fetchReactions();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [messageId, user?.id]);

  const toggleReaction = async (emoji: string) => {
    if (!user) return;
    setShowPicker(false);

    const existing = reactions.find(r => r.emoji === emoji && r.hasReacted);
    if (existing) {
      await supabase
        .from('message_reactions' as any)
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id)
        .eq('emoji', emoji);
    } else {
      await supabase
        .from('message_reactions' as any)
        .insert({ message_id: messageId, user_id: user.id, emoji } as any);
    }
    fetchReactions();
  };

  return (
    <div className={`relative ${isOwn ? 'self-end' : 'self-start'}`}>
      {/* Existing reactions display */}
      {reactions.length > 0 && (
        <div className={`flex gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
          {reactions.map((r) => (
            <button
              key={r.emoji}
              onClick={() => toggleReaction(r.emoji)}
              className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                r.hasReacted
                  ? 'bg-primary/20 border-primary/40'
                  : 'bg-muted/60 border-border hover:bg-muted'
              }`}
            >
              <span>{r.emoji}</span>
              {r.count > 1 && <span className="text-muted-foreground">{r.count}</span>}
            </button>
          ))}
        </div>
      )}

      {/* Add reaction trigger - small + button */}
      <button
        onClick={() => setShowPicker(!showPicker)}
        className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-2 ${
          isOwn ? '-left-6' : '-right-6'
        } w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center text-xs hover:bg-accent`}
      >
        😊
      </button>

      {/* Emoji picker */}
      <AnimatePresence>
        {showPicker && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`absolute z-50 ${isOwn ? 'right-0' : 'left-0'} -top-10 bg-background border border-border rounded-full shadow-lg px-2 py-1 flex gap-1`}
          >
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => toggleReaction(emoji)}
                className="hover:scale-125 transition-transform text-lg p-0.5"
              >
                {emoji}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
