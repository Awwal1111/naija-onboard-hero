import React, { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Image as ImageIcon, Sparkles, Download, Search, Upload, X, Globe, Volume2, VolumeX, Link } from 'lucide-react';
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
  userImage?: string;
  timestamp: Date;
  isSearchResult?: boolean;
  isWebScrape?: boolean;
  audioUrl?: string;
}

const AIChatInterface = () => {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm NaijaLancers AI Assistant powered by advanced AI. I can:\n\n🔍 **Search the web** for current information (Perplexity-powered)\n🖼️ **Generate images** from your descriptions\n📷 **Analyze images** you share with me\n🌐 **Scrape websites** - just share a URL!\n🔊 **Read responses aloud** - click the speaker icon\n💬 **Chat** about anything\n\nTry asking about current events, share an image, generate art, or give me a website to analyze!",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<number | null>(null);
  const [loadingAudioId, setLoadingAudioId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            lowerText.includes('art') || lowerText.includes('visual') ||
            lowerText.includes('logo') || lowerText.includes('design'));
  };

  const detectSearchRequest = (text: string): boolean => {
    const searchKeywords = [
      'search', 'find', 'look up', 'google', 'what is the latest',
      'current', 'today', 'news', 'recent', 'price of', 'weather',
      'search for', 'search online', 'find out'
    ];
    const lowerText = text.toLowerCase();
    return searchKeywords.some(keyword => lowerText.includes(keyword));
  };

  const detectScrapeRequest = (text: string): string | null => {
    const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|org|net|io|dev|co|ng|app)[^\s]*)/gi;
    const match = text.match(urlPattern);
    if (match && (text.toLowerCase().includes('scrape') || text.toLowerCase().includes('read') || 
        text.toLowerCase().includes('what') || text.toLowerCase().includes('get'))) {
      return match[0];
    }
    return null;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive"
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSelectedImage(base64);
        setImagePreview(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleTextToSpeech = async (text: string, messageIndex: number) => {
    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // If clicking on the same message that's playing, just stop
    if (playingAudioId === messageIndex) {
      setPlayingAudioId(null);
      return;
    }

    setLoadingAudioId(messageIndex);
    
    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [{ role: 'assistant', content: text }],
          action: 'text_to_speech'
        }),
      });

      if (!resp.ok) {
        throw new Error('Failed to generate speech');
      }

      const data = await resp.json();
      
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audioRef.current = audio;
        
        audio.onended = () => {
          setPlayingAudioId(null);
        };
        
        audio.onerror = () => {
          toast({
            title: "Audio Error",
            description: "Failed to play audio",
            variant: "destructive"
          });
          setPlayingAudioId(null);
        };
        
        await audio.play();
        setPlayingAudioId(messageIndex);
      } else {
        throw new Error('No audio URL received');
      }
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: "Speech Error",
        description: "Could not generate speech. ElevenLabs may not be configured.",
        variant: "destructive"
      });
    } finally {
      setLoadingAudioId(null);
    }
  };

  const streamChat = async (conversationMessages: Message[], action?: string, imageAttachment?: string, searchQuery?: string) => {
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
        })),
        action,
        imageAttachment,
        searchQuery
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
      timestamp: new Date(),
      isSearchResult: action === 'web_search',
      isWebScrape: action === 'scrape_website'
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
                timestamp: new Date(),
                isSearchResult: action === 'web_search',
                isWebScrape: action === 'scrape_website'
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
    if ((!input.trim() && !selectedImage) || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input || (selectedImage ? "What's in this image?" : ''),
      userImage: selectedImage || undefined,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = input;
    setInput('');
    const currentImage = selectedImage;
    removeSelectedImage();

    // If user attached an image, analyze it
    if (currentImage) {
      setIsLoading(true);
      try {
        await streamChat([...messages, userMessage], 'analyze_image', currentImage);
      } catch (error) {
        console.error('Error analyzing image:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I couldn't analyze that image. Please try again.",
          timestamp: new Date()
        }]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Check if this is an image generation request
    const isImageRequest = detectImageRequest(currentInput);
    const isSearchRequest = detectSearchRequest(currentInput);
    const urlToScrape = detectScrapeRequest(currentInput);

    if (isImageRequest) {
      setIsGeneratingImage(true);
      try {
        const result = await generateImage(currentInput);
        
        // Check if we got an image URL
        if (result.imageUrl) {
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.content || "I've generated an image for you!",
            imageUrl: result.imageUrl,
            timestamp: new Date()
          }]);
        } else {
          // No image URL returned, show error
          setMessages(prev => [...prev, {
            role: 'assistant',
            content: result.content || "I tried to generate an image but didn't get a result. Please try again with a different prompt.",
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error generating image:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I couldn't generate that image. Please try again with a different prompt.",
          timestamp: new Date()
        }]);
      } finally {
        setIsGeneratingImage(false);
      }
    } else if (urlToScrape) {
      setIsScraping(true);
      try {
        await streamChat([...messages, userMessage], 'scrape_website', undefined, urlToScrape);
      } catch (error) {
        console.error('Error scraping website:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I couldn't scrape that website. Please check the URL and try again.",
          timestamp: new Date()
        }]);
      } finally {
        setIsScraping(false);
      }
    } else if (isSearchRequest) {
      setIsSearching(true);
      try {
        await streamChat([...messages, userMessage], 'web_search', undefined, currentInput);
      } catch (error) {
        console.error('Error in search:', error);
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: "Sorry, I encountered an error while searching. Please try again.",
          timestamp: new Date()
        }]);
      } finally {
        setIsSearching(false);
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

  const quickActions = [
    { icon: Search, label: "Search the web", prompt: "Search for " },
    { icon: ImageIcon, label: "Generate image", prompt: "Generate an image of " },
    { icon: Globe, label: "Latest news", prompt: "What's the latest news about " },
    { icon: Link, label: "Scrape website", prompt: "Scrape and summarize " },
  ];

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center gap-3">
        <Avatar className="h-12 w-12 bg-gradient-to-br from-primary to-primary/60">
          <AvatarFallback className="bg-transparent">
            <Sparkles className="h-6 w-6 text-primary-foreground" />
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-lg font-semibold">AI Assistant</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              Powered by Gemini
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Globe className="h-3 w-3" />
              Perplexity Search
            </Badge>
            <Badge variant="outline" className="text-xs flex items-center gap-1">
              <Volume2 className="h-3 w-3" />
              ElevenLabs
            </Badge>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card/50 px-4 py-2 flex gap-2 overflow-x-auto border-b border-border">
        {quickActions.map((action, idx) => (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="flex-shrink-0 gap-1"
            onClick={() => setInput(action.prompt)}
          >
            <action.icon className="h-3 w-3" />
            {action.label}
          </Button>
        ))}
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
              <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-primary/60 flex-shrink-0">
                <AvatarFallback className="bg-transparent">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </AvatarFallback>
              </Avatar>
            )}
            
            <Card
              className={`max-w-[80%] p-4 ${
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card'
              }`}
            >
              {message.isSearchResult && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Search className="h-3 w-3" />
                  Web search result
                </div>
              )}

              {message.isWebScrape && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <Link className="h-3 w-3" />
                  Website content
                </div>
              )}
              
              {/* Display user's attached image */}
              {message.userImage && (
                <div className="mb-3">
                  <img
                    src={message.userImage}
                    alt="User shared"
                    className="rounded-lg max-w-full h-auto max-h-48 object-cover"
                  />
                </div>
              )}
              
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* Display AI-generated image */}
              {message.imageUrl && (
                <div className="mt-3 space-y-2">
                  <img
                    src={message.imageUrl}
                    alt="Generated"
                    className="rounded-lg max-w-full h-auto"
                    onError={(e) => {
                      console.error('Image failed to load:', message.imageUrl?.substring(0, 100));
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
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

              {/* Text-to-speech button for assistant messages */}
              {message.role === 'assistant' && message.content && !message.imageUrl && (
                <div className="mt-2 pt-2 border-t border-border">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => handleTextToSpeech(message.content, index)}
                    disabled={loadingAudioId === index}
                  >
                    {loadingAudioId === index ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : playingAudioId === index ? (
                      <VolumeX className="h-3 w-3 mr-1" />
                    ) : (
                      <Volume2 className="h-3 w-3 mr-1" />
                    )}
                    {loadingAudioId === index ? 'Loading...' : playingAudioId === index ? 'Stop' : 'Listen'}
                  </Button>
                </div>
              )}
            </Card>

            {message.role === 'user' && (
              <Avatar className="h-8 w-8 bg-muted flex-shrink-0">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {(isLoading || isGeneratingImage || isSearching || isScraping) && (
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
                  {isGeneratingImage ? 'Generating image...' : 
                   isSearching ? 'Searching the web...' : 
                   isScraping ? 'Scraping website...' : 
                   'Thinking...'}
                </span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 pb-2">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 rounded-lg border border-border"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={removeSelectedImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={handleImageSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading || isGeneratingImage || isSearching || isScraping}
          >
            <Upload className="h-5 w-5" />
          </Button>
          <BrandInput
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything, search, share an image, or paste a URL..."
            disabled={isLoading || isGeneratingImage || isSearching || isScraping}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !selectedImage) || isLoading || isGeneratingImage || isSearching || isScraping}
            size="icon"
          >
            {isLoading || isGeneratingImage || isSearching || isScraping ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
          <span className="flex items-center gap-1">
            <ImageIcon className="h-3 w-3" />
            Generate images
          </span>
          <span className="flex items-center gap-1">
            <Upload className="h-3 w-3" />
            Analyze photos
          </span>
          <span className="flex items-center gap-1">
            <Search className="h-3 w-3" />
            Perplexity search
          </span>
          <span className="flex items-center gap-1">
            <Link className="h-3 w-3" />
            Firecrawl scrape
          </span>
          <span className="flex items-center gap-1">
            <Volume2 className="h-3 w-3" />
            ElevenLabs TTS
          </span>
        </div>
      </div>
    </div>
  );
};

export default AIChatInterface;
