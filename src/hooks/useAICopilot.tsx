import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { useToast } from '@/hooks/use-toast';

export interface CopilotSettings {
  id: string;
  user_id: string;
  copilot_name: string;
  expertise: 'designer' | 'writer' | 'developer' | 'marketer' | 'all-rounder';
  tone: 'casual' | 'professional' | 'formal' | 'creative';
  is_visible: boolean;
  client_mode: boolean;
  memory_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface CopilotMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  message_type: string;
  media_url?: string;
  metadata: Record<string, any>;
  is_saved: boolean;
  created_at: string;
}

export interface SavedOutput {
  id: string;
  user_id: string;
  message_id?: string;
  title: string;
  content: string;
  output_type: string;
  media_url?: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Detect if message requires a specific action (non-streaming)
function detectAction(message: string): { action: string; prompt: string } | null {
  const lowerMsg = message.toLowerCase();
  
  // Image generation
  if (lowerMsg.includes('generate image:') || lowerMsg.includes('create image:') ||
      lowerMsg.includes('make an image') || lowerMsg.includes('create a logo') ||
      lowerMsg.includes('design a logo') || lowerMsg.includes('make a logo') ||
      lowerMsg.includes('generate a logo') || lowerMsg.includes('create a banner') ||
      lowerMsg.includes('design a banner') || lowerMsg.includes('make a banner') ||
      lowerMsg.includes('create a poster') || lowerMsg.includes('design a poster') ||
      lowerMsg.includes('create a graphic') || lowerMsg.includes('design a graphic') ||
      lowerMsg.startsWith('draw ') || lowerMsg.includes('generate an image') ||
      lowerMsg.includes('create an image') || lowerMsg.includes('make me an image') ||
      lowerMsg.includes('generate a picture') || lowerMsg.includes('create a picture')) {
    const prompt = message.replace(/generate image:|create image:/i, '').trim();
    return { action: 'generate_image', prompt: prompt || message };
  }
  
  // Web search
  if (lowerMsg.startsWith('search:') || lowerMsg.startsWith('search ')) {
    const prompt = message.replace(/^search:?\s*/i, '').trim();
    return { action: 'web_search', prompt };
  }
  
  // Website scraping
  if (lowerMsg.startsWith('scrape:') || lowerMsg.startsWith('scrape ')) {
    const prompt = message.replace(/^scrape:?\s*/i, '').trim();
    return { action: 'scrape_website', prompt };
  }
  
  // Text to speech
  if (lowerMsg.startsWith('tts:') || lowerMsg.includes('read aloud') ||
      lowerMsg.includes('read this out') || lowerMsg.includes('speak this')) {
    const prompt = message.replace(/tts:|read aloud|read this out|speak this/gi, '').trim();
    return { action: 'text_to_speech', prompt: prompt || message };
  }
  
  return null;
}

export const useAICopilot = () => {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [settings, setSettings] = useState<CopilotSettings | null>(null);
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [savedOutputs, setSavedOutputs] = useState<SavedOutput[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  // Initialize or fetch settings
  useEffect(() => {
    if (user) {
      fetchSettings();
      fetchMessages();
      fetchSavedOutputs();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_copilot_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching AI settings:', error);
      return;
    }

    if (data) {
      setSettings(data as unknown as CopilotSettings);
    } else {
      // Create default settings
      const { data: newSettings, error: createError } = await supabase
        .from('ai_copilot_settings')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (!createError && newSettings) {
        setSettings(newSettings as unknown as CopilotSettings);
      }
    }
  };

  const fetchMessages = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_copilot_messages')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .limit(100);

    if (!error && data) {
      setMessages(data as unknown as CopilotMessage[]);
    }
  };

  const fetchSavedOutputs = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('ai_copilot_saved')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedOutputs(data as unknown as SavedOutput[]);
    }
  };

  const updateSettings = async (updates: Partial<CopilotSettings>) => {
    if (!user || !settings) return;

    const { error } = await supabase
      .from('ai_copilot_settings')
      .update(updates)
      .eq('user_id', user.id);

    if (!error) {
      setSettings({ ...settings, ...updates });
      toast({
        title: "Settings updated",
        description: "Your Copilot settings have been saved."
      });
    }
  };

  const sendMessage = async (content: string, attachments?: { type: string; url: string }[]) => {
    if (!user || !content.trim()) return;

    // Check if this is an action-based request (non-streaming)
    const detectedAction = detectAction(content);
    const hasImageAttachment = attachments?.some(a => a.type?.startsWith('image'));

    // Add user message to DB and state
    const userMessageData = {
      user_id: user.id,
      role: 'user' as const,
      content,
      message_type: attachments?.length ? 'mixed' : 'text',
      metadata: attachments ? { attachments } : {}
    };

    const { data: savedUserMsg } = await supabase
      .from('ai_copilot_messages')
      .insert([userMessageData])
      .select()
      .single();

    if (savedUserMsg) {
      setMessages(prev => [...prev, savedUserMsg as unknown as CopilotMessage]);
    }

    // Build context for AI
    const userContext = {
      name: profile?.full_name || 'User',
      profession: profile?.profession || 'Freelancer',
      skills: [],
      location: profile?.state_name || '',
      isExpert: profile?.is_expert || false
    };

    // Get recent messages for context (last 20)
    const contextMessages = messages.slice(-20).map(m => ({
      role: m.role,
      content: m.content
    }));

    try {
      // Handle action-based requests (non-streaming JSON response)
      if (detectedAction || hasImageAttachment) {
        setIsLoading(true);
        
        // Add placeholder message with loading state
        const loadingMsg: CopilotMessage = {
          id: 'loading',
          user_id: user.id,
          role: 'assistant',
          content: detectedAction?.action === 'generate_image' 
            ? '🎨 Generating your image...' 
            : detectedAction?.action === 'web_search'
            ? '🔍 Searching the web...'
            : detectedAction?.action === 'scrape_website'
            ? '🌐 Scraping website...'
            : hasImageAttachment
            ? '📸 Analyzing your image...'
            : '⏳ Processing...',
          message_type: 'text',
          metadata: {},
          is_saved: false,
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, loadingMsg]);

        const requestBody: Record<string, any> = {
          context: {
            user: userContext,
            settings: {
              expertise: settings?.expertise || 'all-rounder',
              tone: settings?.tone || 'professional',
              clientMode: settings?.client_mode || false
            }
          }
        };

        if (hasImageAttachment) {
          requestBody.action = 'analyze_image';
          requestBody.prompt = content;
          requestBody.attachments = attachments;
        } else if (detectedAction) {
          requestBody.action = detectedAction.action;
          requestBody.prompt = detectedAction.prompt;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify(requestBody)
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Request failed');
        }

        const result = await response.json();
        
        // Create assistant message with result
        const assistantMsgData = {
          user_id: user.id,
          role: 'assistant' as const,
          content: result.content || result.error || 'Done!',
          message_type: result.type || detectedAction?.action || 'text',
          media_url: result.mediaUrl || null,
          metadata: {
            isSearchResult: result.isSearchResult,
            isScrapeResult: result.isScrapeResult,
            searchProvider: result.searchProvider,
            audioUrl: result.audioUrl
          }
        };

        const { data: savedAssistantMsg } = await supabase
          .from('ai_copilot_messages')
          .insert([assistantMsgData])
          .select()
          .single();

        if (savedAssistantMsg) {
          setMessages(prev => {
            const updated = prev.filter(m => m.id !== 'loading');
            return [...updated, savedAssistantMsg as unknown as CopilotMessage];
          });
        }

        setIsLoading(false);
        return;
      }

      // Regular streaming chat
      setIsStreaming(true);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            message: content,
            context: {
              user: userContext,
              settings: {
                expertise: settings?.expertise || 'all-rounder',
                tone: settings?.tone || 'professional',
                clientMode: settings?.client_mode || false
              },
              conversationHistory: settings?.memory_enabled ? contextMessages : []
            },
            attachments
          })
        }
      );

      if (response.status === 429) {
        toast({
          title: "Rate Limit",
          description: "Too many requests. Please try again later.",
          variant: "destructive"
        });
        setIsStreaming(false);
        return;
      }

      if (response.status === 402) {
        toast({
          title: "Credits Required",
          description: "Please add credits to continue using AI features.",
          variant: "destructive"
        });
        setIsStreaming(false);
        return;
      }

      if (!response.ok || !response.body) {
        throw new Error('Failed to get response');
      }

      // Check content type - if JSON, handle as action response
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        const result = await response.json();
        
        const assistantMsgData = {
          user_id: user.id,
          role: 'assistant' as const,
          content: result.content || 'Done!',
          message_type: result.type || 'text',
          media_url: result.mediaUrl || null,
          metadata: {
            isSearchResult: result.isSearchResult,
            isScrapeResult: result.isScrapeResult,
            searchProvider: result.searchProvider,
            audioUrl: result.audioUrl
          }
        };

        const { data: savedAssistantMsg } = await supabase
          .from('ai_copilot_messages')
          .insert([assistantMsgData])
          .select()
          .single();

        if (savedAssistantMsg) {
          setMessages(prev => [...prev, savedAssistantMsg as unknown as CopilotMessage]);
        }

        setIsStreaming(false);
        return;
      }

      // Stream response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let assistantContent = '';

      // Add placeholder message
      const placeholderMsg: CopilotMessage = {
        id: 'streaming',
        user_id: user.id,
        role: 'assistant',
        content: '',
        message_type: 'text',
        metadata: {},
        is_saved: false,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, placeholderMsg]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  content: assistantContent
                };
                return updated;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Save assistant message to DB
      const { data: savedAssistantMsg } = await supabase
        .from('ai_copilot_messages')
        .insert({
          user_id: user.id,
          role: 'assistant',
          content: assistantContent,
          message_type: 'text',
          metadata: {}
        })
        .select()
        .single();

      if (savedAssistantMsg) {
        setMessages(prev => {
          const updated = [...prev];
          updated[updated.length - 1] = savedAssistantMsg as unknown as CopilotMessage;
          return updated;
        });
      }

    } catch (error) {
      console.error('Error sending message:', error);
      // Remove loading message if present
      setMessages(prev => prev.filter(m => m.id !== 'loading' && m.id !== 'streaming'));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  };

  const generateContent = async (
    type: 'image' | 'document' | 'code' | 'content',
    prompt: string
  ) => {
    if (!user) return null;

    setIsLoading(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-copilot`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            action: `generate_${type}`,
            prompt,
            context: {
              user: {
                name: profile?.full_name || 'User',
                profession: profile?.profession || 'Freelancer'
              },
              settings: {
                expertise: settings?.expertise || 'all-rounder',
                tone: settings?.tone || 'professional'
              }
            }
          })
        }
      );

      if (!response.ok) {
        throw new Error('Generation failed');
      }

      const result = await response.json();
      
      // Save the generation as a message
      await supabase
        .from('ai_copilot_messages')
        .insert({
          user_id: user.id,
          role: 'assistant',
          content: result.content || `Generated ${type}`,
          message_type: type,
          media_url: result.mediaUrl,
          metadata: { type, prompt }
        });

      await fetchMessages();
      return result;

    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Could not generate content. Please try again.",
        variant: "destructive"
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const saveOutput = async (
    messageId: string,
    title: string,
    outputType: string
  ) => {
    if (!user) return;

    const message = messages.find(m => m.id === messageId);
    if (!message) return;

    const { data, error } = await supabase
      .from('ai_copilot_saved')
      .insert({
        user_id: user.id,
        message_id: messageId,
        title,
        content: message.content,
        output_type: outputType,
        media_url: message.media_url,
        metadata: message.metadata
      })
      .select()
      .single();

    if (!error && data) {
      setSavedOutputs(prev => [data as unknown as SavedOutput, ...prev]);
      
      // Mark message as saved
      await supabase
        .from('ai_copilot_messages')
        .update({ is_saved: true })
        .eq('id', messageId);

      toast({
        title: "Saved!",
        description: "Output saved to your library."
      });
    }
  };

  const deleteSavedOutput = async (id: string) => {
    const { error } = await supabase
      .from('ai_copilot_saved')
      .delete()
      .eq('id', id);

    if (!error) {
      setSavedOutputs(prev => prev.filter(o => o.id !== id));
    }
  };

  const clearHistory = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('ai_copilot_messages')
      .delete()
      .eq('user_id', user.id)
      .eq('is_saved', false);

    if (!error) {
      setMessages([]);
      toast({
        title: "History Cleared",
        description: "Your conversation history has been cleared."
      });
    }
  };

  return {
    settings,
    messages,
    savedOutputs,
    isLoading,
    isStreaming,
    updateSettings,
    sendMessage,
    generateContent,
    saveOutput,
    deleteSavedOutput,
    clearHistory,
    refreshMessages: fetchMessages
  };
};
