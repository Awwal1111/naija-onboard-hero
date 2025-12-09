import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, Loader2, Image as ImageIcon, Sparkles, Download, 
  Bookmark, Settings, Trash2, Copy, MoreVertical, FileText,
  Code, Palette, MessageSquare, Zap, Bot
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useAICopilot, CopilotMessage } from '@/hooks/useAICopilot';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming) return;
    const message = input.trim();
    setInput('');
    await sendMessage(message);
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

  const quickActions = [
    { icon: FileText, label: 'Write Proposal', prompt: 'Help me write a professional proposal for a client' },
    { icon: Code, label: 'Generate Code', prompt: 'Help me write code for' },
    { icon: Palette, label: 'Design Brief', prompt: 'Create a design brief for' },
    { icon: MessageSquare, label: 'Client Email', prompt: 'Help me draft a professional email to a client about' },
  ];

  const copilotName = settings?.copilot_name || 'NaijaLancers Copilot';
  const isOnline = true; // AI is always online

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
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {settings?.expertise || 'All-Rounder'}
              </Badge>
              <span className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Online
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowSettings(true)}
          >
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
              Your personal freelancing AI partner. I can help you with proposals, 
              client communication, design, code, and much more!
            </p>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2 max-w-sm mx-auto">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="flex items-center gap-2 justify-start"
                  onClick={() => setInput(action.prompt)}
                >
                  <action.icon className="h-4 w-4" />
                  <span className="text-sm">{action.label}</span>
                </Button>
              ))}
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

            <div className={`group relative max-w-[75%] ${message.role === 'user' ? 'order-first' : ''}`}>
              <Card
                className={`p-3 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-card'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                {message.media_url && (
                  <div className="mt-2">
                    <img
                      src={message.media_url}
                      alt="Generated"
                      className="rounded-lg max-w-full h-auto"
                    />
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

      {/* Input */}
      <div className="bg-card border-t border-border p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything or describe what you need..."
            disabled={isStreaming}
            className="flex-1 min-h-[44px] max-h-[120px] resize-none"
            rows={1}
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
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
        <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
          <Zap className="h-3 w-3" />
          Try: "Write a proposal for a web design project" or "Generate a logo concept"
        </p>
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
