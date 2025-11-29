import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Image as ImageIcon, Sparkles, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BrandInput } from '@/components/ui/brand-input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  imageUrl?: string;
  timestamp: Date;
}

const AIChatInterface = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm NaijaLancers AI Assistant. I can help you with conversations, answer questions, and generate images! Try asking me to create an image or help with something.",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const detectImageRequest = (text: string): boolean => {
    const imageKeywords = [
      'generate', 'create', 'make', 'draw', 'design', 'show me',
      'image of', 'picture of', 'photo of', 'illustration of'
    ];
    const lowerText = text.toLowerCase();
    return imageKeywords.some(keyword => lowerText.includes(keyword)) &&
           (lowerText.includes('image') || lowerText.includes('picture') || 
            lowerText.includes('photo') || lowerText.includes('illustration') ||
            lowerText.includes('art') || lowerText.includes('visual'));
  };

  const streamChat = async (conversationMessages: Message[]) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
    
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: conversationMessages.map(m => ({
          role: m.role,
          content: m.content
        }))
      }),
    });

    if (resp.status === 429) {
      toast({
        title: "Rate Limit",
        description: "Too many requests. Please try again later.",
        variant: "destructive"
      });
      throw new Error("Rate limit exceeded");
    }

    if (resp.status === 402) {
      toast({
        title: "Credits Required",
        description: "Please add credits to continue using AI features.",
        variant: "destructive"
      });
      throw new Error("Payment required");
    }

    if (!resp.ok || !resp.body) {
      throw new Error('Failed to start stream');
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = '';
    let streamDone = false;
    let assistantMessage = '';

    // Add placeholder for streaming response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    while (!streamDone) {
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
        if (jsonStr === '[DONE]') {
          streamDone = true;
          break;
        }

        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantMessage += content;
            setMessages(prev => {
              const newMessages = [...prev];
              newMessages[newMessages.length - 1] = {
                role: 'assistant',
                content: assistantMessage,
                timestamp: new Date()
              };
              return newMessages;
            });
          }
        } catch {
          textBuffer = line + '\n' + textBuffer;
          break;
        }
      }
    }
  };

  const generateImage = async (prompt: string) => {
    const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
    
    const resp = await fetch(CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ 
        messages: [{ role: 'user', content: prompt }],
        action: 'generate_image'
      }),
    });

    if (resp.status === 429) {
      toast({
        title: "Rate Limit",
        description: "Too many requests. Please try again later.",
        variant: "destructive"
      });
      throw new Error("Rate limit exceeded");
    }

    if (resp.status === 402) {
      toast({
        title: "Credits Required",
        description: "Please add credits to continue using AI features.",
        variant: "destructive"
      });
      throw new Error("Payment required");
    }

    if (!resp.ok) {
      throw new Error('Failed to generate image');
    }

    const data = await resp.json();
    return data;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');

    // Check if this is an image generation request
    const isImageRequest = detectImageRequest(input);

    if (isImageRequest) {
      setIsGeneratingImage(true);
      try {
        const result = await generateImage(input);
        
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: result.content || "I've generated an image for you!",
          imageUrl: result.imageUrl,
          timestamp: new Date()
        }]);
      } catch (error) {
        console.error('Error generating image:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I couldn't generate that image. Please try again.",
          timestamp: new Date()
        }]);
      } finally {
        setIsGeneratingImage(false);
      }
    } else {
      setIsLoading(true);
      try {
        await streamChat([...messages, userMessage]);
      } catch (error) {
        console.error('Error in chat:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I encountered an error. Please try again.",
          timestamp: new Date()
        }]);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center gap-3">
        <Avatar className="h-12 w-12 bg-gradient-to-br from-primary to-primary/60">
          <AvatarFallback className="bg-transparent">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-lg font-semibold">AI Assistant</h1>
          <Badge variant="secondary" className="text-xs">
            Powered by Gemini
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60">
                <AvatarFallback className="bg-transparent">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <Card
              className={`max-w-[70%] p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {message.imageUrl && (
                <div className="mt-3 space-y-2">
                  <img
                    src={message.imageUrl}
                    alt="Generated"
                    className="rounded-lg max-w-full h-auto"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = message.imageUrl!;
                      link.download = 'ai-generated-image.png';
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Image
                  </Button>
                </div>
              )}
            </Card>

            {message.role === 'user' && (
              <Avatar className="h-8 w-8 bg-muted">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {(isLoading || isGeneratingImage) && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60">
              <AvatarFallback className="bg-transparent">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </AvatarFallback>
            </Avatar>
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">
                  {isGeneratingImage ? 'Generating image...' : 'Thinking...'}
                </span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex gap-2">
          <BrandInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything or request an image..."
            disabled={isLoading || isGeneratingImage}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading || isGeneratingImage}
            size="icon"
          >
            {isLoading || isGeneratingImage ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <ImageIcon className="h-3 w-3" />
          Try: "Generate an image of a sunset" or ask any question!
        </p>
      </div>
    </div>
  );
};

export default AIChatInterface;
