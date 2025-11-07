import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Send, Sparkles, Loader2, Minimize2, Maximize2 } from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const AdminAIAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      // @ts-ignore
      const { data } = await supabase.rpc('check_is_admin');
      setIsAdmin(data?.[0]?.is_admin || false);
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickQuestions = [
    "What submissions are pending review?",
    "Show me today's activity breakdown",
    "Any suspicious user activity?",
    "What tasks need urgent attention?",
  ];

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('admin-ai-assistant', {
        body: { message: input }
      });

      if (error) throw error;

      if (!data.success) {
        toast.error(data.error || "AI assistant error");
        return;
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  if (isMinimized) {
    return (
      <Card className="fixed bottom-4 right-4 w-16 h-16 cursor-pointer" onClick={() => setIsMinimized(false)}>
        <div className="w-full h-full flex items-center justify-center">
          <Sparkles className="h-6 w-6 text-primary" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-[600px] flex flex-col shadow-xl z-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Admin AI Assistant
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={checkAdminStatus} title="Refresh admin status">
            <Loader2 className={`h-4 w-4 ${isAdmin === null ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
        {/* Admin Status Check */}
        {isAdmin === false && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
            <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">Admin Access Required</p>
            <p className="text-xs text-muted-foreground mb-2">
              You need admin access to use the AI assistant. Click "Make Me Admin" in the setup section above.
            </p>
            <Button size="sm" variant="outline" onClick={checkAdminStatus}>
              Recheck Status
            </Button>
          </div>
        )}
        
        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary/30" />
              <p className="text-sm">Ask me anything about platform status, pending tasks, or user activity!</p>
            </div>
          )}
          
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-4 py-2 ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Analyzing data...</span>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Questions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {quickQuestions.map((question, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => handleQuickQuestion(question)}
              >
                {question}
              </Button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="Ask about platform status, pending items, or suspicious activity..."
            className="min-h-[80px] resize-none"
            disabled={isLoading || isAdmin === false}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading || isAdmin === false}
            size="icon"
            className="shrink-0"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
