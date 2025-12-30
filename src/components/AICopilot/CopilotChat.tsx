import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Image as ImageIcon, Sparkles, Download, 
  Bookmark, Settings, Trash2, Copy, MoreVertical, FileText,
  Code, Palette, MessageSquare, Zap, Bot, Search, Globe, Upload, X,
  Volume2, FileSearch, Mic
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAICopilot, CopilotMessage } from '@/hooks/useAICopilot';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import CopilotSettings from './CopilotSettings';

const CopilotChat = () => {
  const { toast } = useToast();
  const {
    settings,
    messages,
    isStreaming,
    isLoading,
    sendMessage,
    generateContent,
    saveOutput,
    clearHistory
  } = useAICopilot();

  const [input, setInput] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveTitle, setSaveTitle] = useState('');
  const [messageToSave, setMessageToSave] = useState<CopilotMessage | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload an image under 10MB",
          variant: "destructive"
        });
        return;
      }
      setUploadedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImagePreview(null);
    setUploadedImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedImage) || isStreaming) return;
    
    const message = input.trim();
    setInput('');
    
    let attachments: { type: string; url: string }[] | undefined;
    
    if (imagePreview) {
      attachments = [{ type: 'image/png', url: imagePreview }];
      removeImage();
    }
    
    await sendMessage(message, attachments);
  };

  const handleQuickAction = async (actionType: string, prompt: string) => {
    if (actionType === 'search') {
      setInput(`search: `);
    } else if (actionType === 'image') {
      setInput(`generate image: `);
    } else if (actionType === 'scrape') {
      setInput(`scrape: `);
    } else {
      setInput(prompt);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSaveOutput = async () => {
    if (!messageToSave || !saveTitle.trim()) return;
    await saveOutput(messageToSave.id, saveTitle, messageToSave.message_type);
    setSaveDialogOpen(false);
    setSaveTitle('');
    setMessageToSave(null);
  };

  const openSaveDialog = (message: CopilotMessage) => {
    setMessageToSave(message);
    setSaveTitle('');
    setSaveDialogOpen(true);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied!",
      description: "Content copied to clipboard."
    });
  };

  const handleTextToSpeech = async (messageId: string, text: string) => {
    if (isPlayingAudio === messageId) {
      audioElement?.pause();
      setIsPlayingAudio(null);
      setAudioElement(null);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('ai-copilot', {
        body: { action: 'text_to_speech', prompt: text }
      });

      if (error || !data?.audioUrl) {
        toast({
          title: "Text-to-Speech Error",
          description: "Could not generate audio. Please try again.",
          variant: "destructive"
        });
        return;
      }

      const audio = new Audio(data.audioUrl);
      audio.onended = () => {
        setIsPlayingAudio(null);
        setAudioElement(null);
      };
      audio.onerror = () => {
        toast({
          title: "Audio Error",
          description: "Could not play audio.",
          variant: "destructive"
        });
        setIsPlayingAudio(null);
        setAudioElement(null);
      };
      
      await audio.play();
      setIsPlayingAudio(messageId);
      setAudioElement(audio);
    } catch (error) {
      console.error('TTS error:', error);
      toast({
        title: "Error",
        description: "Text-to-speech failed.",
        variant: "destructive"
      });
    }
  };

  const quickActions = [
    { icon: Search, label: 'Web Search', prompt: '', actionType: 'search' },
    { icon: ImageIcon, label: 'Generate Image', prompt: '', actionType: 'image' },
    { icon: FileSearch, label: 'Scrape Website', prompt: '', actionType: 'scrape' },
    { icon: FileText, label: 'Write Proposal', prompt: 'Help me write a professional proposal for a client project', actionType: 'text' },
    { icon: Code, label: 'Generate Code', prompt: 'Help me write code for', actionType: 'text' },
    { icon: MessageSquare, label: 'Client Email', prompt: 'Help me draft a professional email to a client about', actionType: 'text' },
  ];

  const copilotName = settings?.copilot_name || 'NaijaLancers Copilot';

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-12 w-12 bg-gradient-to-br from-primary via-purple-500 to-pink-500">
              <AvatarFallback className="bg-transparent">
                <Bot className="h-6 w-6 text-white" />
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-background rounded-full" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">{copilotName}</h1>
            <div className="flex items-center gap-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {settings?.expertise || 'All-Rounder'}
              </Badge>
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-500 border-blue-500/30">
                <Search className="h-2.5 w-2.5 mr-1" />
                Perplexity
              </Badge>
              <Badge variant="outline" className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/30">
                <FileSearch className="h-2.5 w-2.5 mr-1" />
                Firecrawl
              </Badge>
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-500 border-purple-500/30">
                <Volume2 className="h-2.5 w-2.5 mr-1" />
                ElevenLabs
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
            <Settings className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={clearHistory}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Bot className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Hey there! I'm {copilotName}</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Your AI freelancing partner with Perplexity search, Firecrawl scraping, ElevenLabs TTS, and image generation!
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-lg mx-auto">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="flex items-center gap-2 justify-start h-auto py-3"
                  onClick={() => handleQuickAction(action.actionType, action.prompt)}
                >
                  <action.icon className="h-4 w-4 shrink-0" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-muted/50 rounded-lg max-w-md mx-auto text-left">
              <p className="text-sm text-muted-foreground">
                <strong>Pro Tips:</strong><br />
                • "search: [query]" - Perplexity web search<br />
                • "generate image: [description]" - Create images<br />
                • "scrape: [url]" - Extract website content<br />
                • Upload an image for AI analysis
              </p>
            </div>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id || index}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-purple-500 shrink-0">
                <AvatarFallback className="bg-transparent">
                  <Bot className="h-4 w-4 text-white" />
                </AvatarFallback>
              </Avatar>
            )}

            <div className={`group relative max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <Card
                className={`p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                {/* Search result badge */}
                {message.metadata?.isSearchResult && (
                  <Badge variant="outline" className="mb-2 text-xs bg-blue-500/10 text-blue-500">
                    <Globe className="h-3 w-3 mr-1" />
                    {message.metadata?.searchProvider || 'Web'} Search Result
                  </Badge>
                )}

                {/* Scrape result badge */}
                {message.metadata?.isScrapeResult && (
                  <Badge variant="outline" className="mb-2 text-xs bg-orange-500/10 text-orange-500">
                    <FileSearch className="h-3 w-3 mr-1" />
                    Firecrawl Result
                  </Badge>
                )}

                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {/* Show attached user image */}
                {message.metadata?.attachments?.[0]?.url && (
                  <div className="mt-2">
                    <img
                      src={message.metadata.attachments[0].url}
                      alt="Uploaded"
                      className="rounded-lg max-w-full h-auto max-h-48 object-contain"
                    />
                  </div>
                )}

                {/* Show generated image */}
                {message.media_url && (
                  <div className="mt-2">
                    <img
                      src={message.media_url}
                      alt="Generated"
                      className="rounded-lg max-w-full h-auto"
                    />
                  </div>
                )}

                {/* Audio player for TTS */}
                {message.metadata?.audioUrl && (
                  <div className="mt-2">
                    <audio controls src={message.metadata.audioUrl} className="w-full" />
                  </div>
                )}
              </Card>

              {/* Message Actions (for assistant messages) */}
              {message.role === 'assistant' && message.id !== 'streaming' && (
                <div className="absolute -bottom-8 left-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => copyToClipboard(message.content)}
                  >
                    <Copy className="h-3 w-3 mr-1" />
                    Copy
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => handleTextToSpeech(message.id, message.content)}
                  >
                    <Volume2 className={`h-3 w-3 mr-1 ${isPlayingAudio === message.id ? 'text-primary animate-pulse' : ''}`} />
                    {isPlayingAudio === message.id ? 'Stop' : 'Listen'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => openSaveDialog(message)}
                  >
                    <Bookmark className="h-3 w-3 mr-1" />
                    Save
                  </Button>
                  {message.media_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = message.media_url!;
                        link.download = 'copilot-generated.png';
                        link.click();
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  )}
                </div>
              )}
            </div>

            {message.role === 'user' && (
              <Avatar className="h-8 w-8 bg-muted shrink-0">
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isStreaming && messages[messages.length - 1]?.content === '' && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-purple-500">
              <AvatarFallback className="bg-transparent">
                <Bot className="h-4 w-4 text-white" />
              </AvatarFallback>
            </Avatar>
            <Card className="p-3 bg-card">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">Thinking...</span>
              </div>
            </Card>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image Preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t border-border">
          <div className="relative inline-block">
            <img
              src={imagePreview}
              alt="Preview"
              className="h-20 w-20 object-cover rounded-lg"
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={removeImage}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex gap-2 items-end">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            <Upload className="h-5 w-5" />
          </Button>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything, search the web, scrape websites, or generate images..."
            disabled={isStreaming}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !uploadedImage) || isStreaming}
            size="icon"
            className="shrink-0"
          >
            {isStreaming ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Zap className="h-3 w-3" />
          <span>Try: "search: freelancing trends" • "scrape: example.com" • "generate image: tech logo"</span>
        </div>
      </div>

      {/* Settings Dialog */}
      <CopilotSettings open={showSettings} onOpenChange={setShowSettings} />

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Output</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="save-title">Title</Label>
              <Input
                id="save-title"
                value={saveTitle}
                onChange={(e) => setSaveTitle(e.target.value)}
                placeholder="Enter a title for this output..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveOutput} disabled={!saveTitle.trim()}>
                <Bookmark className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CopilotChat;
