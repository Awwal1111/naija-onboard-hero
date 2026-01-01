import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Image as ImageIcon, Sparkles, Download, 
  Bookmark, Settings, Trash2, Copy, MoreVertical, FileText,
  Code, Palette, MessageSquare, Zap, Bot, Search, Globe, Upload, X,
  Volume2, FileSearch, Mic, Library, Wand2, Languages, Calculator,
  TrendingUp, PenTool, BookOpen, Lightbulb
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
import CopilotTemplates from './CopilotTemplates';
import CopilotCapabilities from './CopilotCapabilities';

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
  const [showTemplates, setShowTemplates] = useState(false);
  const [showCapabilities, setShowCapabilities] = useState(false);
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
    { icon: Search, label: 'Web Search', prompt: '', actionType: 'search', color: 'text-blue-500' },
    { icon: ImageIcon, label: 'Generate Image', prompt: '', actionType: 'image', color: 'text-purple-500' },
    { icon: FileSearch, label: 'Scrape Website', prompt: '', actionType: 'scrape', color: 'text-orange-500' },
    { icon: FileText, label: 'Write Proposal', prompt: 'Help me write a professional proposal for a client project', actionType: 'text', color: 'text-indigo-500' },
    { icon: Code, label: 'Generate Code', prompt: 'Help me write code for', actionType: 'text', color: 'text-yellow-500' },
    { icon: Languages, label: 'Translate', prompt: 'Translate the following text to', actionType: 'text', color: 'text-cyan-500' },
    { icon: Calculator, label: 'Calculate', prompt: 'Help me calculate', actionType: 'text', color: 'text-pink-500' },
    { icon: TrendingUp, label: 'Marketing Plan', prompt: 'Create a marketing strategy for', actionType: 'text', color: 'text-emerald-500' },
    { icon: PenTool, label: 'Design Brief', prompt: 'Create a design brief for', actionType: 'text', color: 'text-fuchsia-500' },
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
          <div className="text-center py-6">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-lg shadow-primary/25">
              <Bot className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Hey! I'm {copilotName} 🚀
            </h2>
            <p className="text-muted-foreground mb-4 max-w-md mx-auto">
              Your elite AI freelancing partner with superpowers. I can research, create, code, design, and help you win clients.
            </p>
            
            {/* Capabilities badges */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/30">
                <Search className="h-3 w-3 mr-1" /> Web Search
              </Badge>
              <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/30">
                <ImageIcon className="h-3 w-3 mr-1" /> Image Gen
              </Badge>
              <Badge className="bg-orange-500/10 text-orange-500 border-orange-500/30">
                <FileSearch className="h-3 w-3 mr-1" /> Web Scraping
              </Badge>
              <Badge className="bg-green-500/10 text-green-500 border-green-500/30">
                <Volume2 className="h-3 w-3 mr-1" /> Text-to-Speech
              </Badge>
              <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                <Code className="h-3 w-3 mr-1" /> Code Generation
              </Badge>
              <Badge className="bg-cyan-500/10 text-cyan-500 border-cyan-500/30">
                <Languages className="h-3 w-3 mr-1" /> Translation
              </Badge>
            </div>

            {/* Main action buttons */}
            <div className="flex justify-center gap-3 mb-6">
              <Button 
                onClick={() => setShowTemplates(true)}
                className="gap-2"
              >
                <Library className="h-4 w-4" />
                Templates Library
              </Button>
              <Button 
                variant="outline"
                onClick={() => setShowCapabilities(true)}
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                See All Powers
              </Button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-3 gap-2 max-w-xl mx-auto mb-6">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-accent/50"
                  onClick={() => handleQuickAction(action.actionType, action.prompt)}
                >
                  <action.icon className={`h-5 w-5 ${action.color}`} />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>

            {/* Tips Card */}
            <Card className="p-4 max-w-md mx-auto text-left bg-gradient-to-br from-muted/50 to-background border-primary/10">
              <div className="flex items-center gap-2 mb-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Pro Tips</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <strong>search:</strong> [query] - Real-time web search</li>
                <li>• <strong>generate image:</strong> [description] - Create visuals</li>
                <li>• <strong>scrape:</strong> [url] - Extract website content</li>
                <li>• <strong>translate to [lang]:</strong> [text] - Translate text</li>
                <li>• <strong>Upload images</strong> for AI analysis & feedback</li>
              </ul>
            </Card>
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

        {(isStreaming || isLoading) && (messages.length === 0 || !['loading', 'streaming'].includes(messages[messages.length - 1]?.id)) && (
          <div className="flex gap-3 justify-start">
            <Avatar className="h-8 w-8 bg-gradient-to-br from-primary to-purple-500">
              <AvatarFallback className="bg-transparent">
                <Bot className="h-4 w-4 text-white" />
              </AvatarFallback>
            </Avatar>
            <Card className="p-3 bg-card border-primary/20">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                </div>
                <span className="text-sm font-medium bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                  {isLoading ? 'Processing...' : 'Thinking deeply...'}
                </span>
              </div>
              <div className="flex gap-1 mt-2">
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: '300ms' }} />
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
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0"
              title="Upload image"
            >
              <Upload className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowTemplates(true)}
              className="shrink-0"
              title="Templates"
            >
              <Library className="h-5 w-5" />
            </Button>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything - I can search, create images, generate code, write proposals, translate, and more..."
            disabled={isStreaming || isLoading}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={(!input.trim() && !uploadedImage) || isStreaming || isLoading}
            size="icon"
            className="shrink-0"
          >
            {(isStreaming || isLoading) ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Zap className="h-3 w-3 text-primary" />
            <span className="hidden sm:inline">search: • generate image: • scrape: • translate to:</span>
            <span className="sm:hidden">Try commands or templates</span>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-xs"
            onClick={() => setShowCapabilities(true)}
          >
            <Wand2 className="h-3 w-3 mr-1" />
            All Powers
          </Button>
        </div>
      </div>

      {/* Settings Dialog */}
      <CopilotSettings open={showSettings} onOpenChange={setShowSettings} />

      {/* Templates Dialog */}
      <CopilotTemplates 
        open={showTemplates} 
        onOpenChange={setShowTemplates}
        onSelectTemplate={(prompt) => setInput(prompt)}
      />

      {/* Capabilities Dialog */}
      <CopilotCapabilities
        open={showCapabilities}
        onOpenChange={setShowCapabilities}
        onTryCapability={(command) => setInput(command)}
      />

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
