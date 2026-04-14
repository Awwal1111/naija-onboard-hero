import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { 
  Send, Sparkles, Loader2, CheckCircle2, 
  Bell, Zap, Play, RefreshCw, ClipboardList, Users, 
  DollarSign, TrendingUp, X, Megaphone, FileCheck,
  AlertTriangle, Shield, Database
} from "lucide-react";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  actions?: ActionButton[];
}

interface ActionButton {
  id: string;
  label: string;
  action: string;
  params?: Record<string, any>;
  variant?: 'default' | 'destructive' | 'outline';
  executed?: boolean;
}

interface Alert {
  id: string;
  type: 'warning' | 'info' | 'urgent';
  title: string;
  message: string;
  action?: ActionButton;
  dismissed?: boolean;
}

export const AdminAIDrawer = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Only poll alerts if confirmed admin
  useEffect(() => {
    if (!isAdmin) return;
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 300000); // 5 min (was 1 min)
    return () => clearInterval(interval);
  }, [isAdmin]);

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

  const fetchAlerts = async () => {
    try {
      const [socialTasks, referralTasks, articles, withdrawals] = await Promise.all([
        supabase.from('social_tasks_progress').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('referral_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('article_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('wallet_transactions').select('id', { count: 'exact', head: true }).eq('kind', 'withdrawal').eq('status', 'pending'),
      ]);

      const newAlerts: Alert[] = [];

      if ((socialTasks.count || 0) > 0) {
        newAlerts.push({
          id: 'social_tasks',
          type: (socialTasks.count || 0) > 10 ? 'urgent' : 'warning',
          title: `${socialTasks.count} pending social tasks`,
          message: 'Auto-approve eligible submissions with screenshots',
          action: { id: 'auto_approve_social', label: 'Auto-Approve', action: 'approve_social_tasks', variant: 'default' }
        });
      }

      if ((withdrawals.count || 0) > 0) {
        newAlerts.push({
          id: 'withdrawals',
          type: 'urgent',
          title: `${withdrawals.count} pending withdrawals`,
          message: 'Users are waiting for their funds',
          action: { id: 'view_withdrawals', label: 'Review', action: 'navigate_withdrawals', variant: 'destructive' }
        });
      }

      if ((referralTasks.count || 0) > 0) {
        newAlerts.push({
          id: 'referral_tasks',
          type: 'info',
          title: `${referralTasks.count} referral submissions`,
          message: 'Review referral task completions'
        });
      }

      if ((articles.count || 0) > 0) {
        newAlerts.push({
          id: 'articles',
          type: 'info',
          title: `${articles.count} article reads pending`,
          message: 'Users completed reading tasks',
          action: { id: 'approve_articles', label: 'Approve All', action: 'approve_articles', variant: 'default' }
        });
      }

      setAlerts(newAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickCommands = [
    { icon: <ClipboardList className="h-3 w-3" />, label: "Pending", command: "/pending" },
    { icon: <AlertTriangle className="h-3 w-3" />, label: "Suspicious", command: "/suspicious" },
    { icon: <DollarSign className="h-3 w-3" />, label: "Wallets", command: "/wallets" },
    { icon: <TrendingUp className="h-3 w-3" />, label: "Stats", command: "/stats" },
    { icon: <Megaphone className="h-3 w-3" />, label: "Broadcast", command: "/broadcast" },
    { icon: <Shield className="h-3 w-3" />, label: "Security", command: "/security" },
    { icon: <Database className="h-3 w-3" />, label: "Analytics", command: "/analytics" },
    { icon: <FileCheck className="h-3 w-3" />, label: "Audit", command: "/audit" },
    { icon: <Users className="h-3 w-3" />, label: "Incomplete", command: "/incomplete profiles - show users who haven't finished their profile and suggest engagement messages" },
  ];

  const executeAction = async (action: ActionButton) => {
    setExecutingAction(action.id);
    
    try {
      switch (action.action) {
        case 'approve_social_tasks':
          await autoApproveSocialTasks();
          break;
        case 'approve_articles':
          await autoApproveArticles();
          break;
        case 'navigate_withdrawals':
          toast.info('Scroll to Withdrawals tab above');
          break;
        case 'notify_experts':
          await notifyExpertsAboutTasks();
          break;
        case 'broadcast_telegram':
          await broadcastTelegram(action.params?.message);
          break;
        case 'flag_user':
          if (action.params?.userId) {
            await flagSuspiciousUser(action.params.userId);
          }
          break;
        default:
          toast.info(`Action "${action.action}" executed`);
      }

      setMessages(prev => prev.map(msg => ({
        ...msg,
        actions: msg.actions?.map(a => 
          a.id === action.id ? { ...a, executed: true } : a
        )
      })));

      setAlerts(prev => prev.filter(a => a.action?.id !== action.id));
      
    } catch (error) {
      console.error('Action execution error:', error);
      toast.error('Failed to execute action');
    } finally {
      setExecutingAction(null);
    }
  };

  const autoApproveSocialTasks = async () => {
    try {
      const { data: pendingTasks, error } = await supabase
        .from('social_tasks_progress')
        .select('id, earner_id, task_id, screenshot_url, social_tasks(reward)')
        .eq('status', 'pending')
        .not('screenshot_url', 'is', null)
        .limit(20);

      if (error) throw error;

      let approved = 0;
      for (const task of (pendingTasks as any[]) || []) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable')
          .eq('user_id', task.earner_id)
          .single();

        if (profile) {
          const reward = task.social_tasks?.reward || 0;
          
          await supabase
            .from('social_tasks_progress')
            .update({ status: 'completed' })
            .eq('id', task.id);

          await supabase
            .from('profiles')
            .update({ 
              wallet_balance: (profile.wallet_balance || 0) + reward,
              balance_withdrawable: (profile.balance_withdrawable || 0) + reward
            })
            .eq('user_id', task.earner_id);

          await supabase.from('wallet_transactions').insert({
            user_id: task.earner_id,
            amount: reward,
            kind: 'social_task_reward',
            status: 'completed',
            reference: 'AI Auto-approved social task'
          });

          approved++;
        }
      }

      toast.success(`✅ Auto-approved ${approved} submissions!`);
      fetchAlerts();
    } catch (error) {
      console.error('Auto-approve error:', error);
      toast.error('Failed to auto-approve tasks');
    }
  };

  const autoApproveArticles = async () => {
    try {
      const { data: pendingArticles, error } = await supabase
        .from('article_submissions')
        .select('id, user_id, article_id, articles(reward_amount)')
        .eq('status', 'pending')
        .not('screenshot_url', 'is', null)
        .limit(20);

      if (error) throw error;

      let approved = 0;
      for (const article of pendingArticles || []) {
        await supabase
          .from('article_submissions')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', article.id);

        approved++;
      }

      toast.success(`✅ Auto-approved ${approved} articles!`);
      fetchAlerts();
    } catch (error) {
      console.error('Auto-approve articles error:', error);
      toast.error('Failed to auto-approve articles');
    }
  };

  const notifyExpertsAboutTasks = async () => {
    try {
      const { data: experts } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_user_id')
        .eq('is_expert', true)
        .not('telegram_user_id', 'is', null);

      let notified = 0;
      for (const expert of experts || []) {
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            user_id: expert.user_id,
            message: `📋 *New Tasks Available!*\n\nHey ${expert.full_name}! There are new tasks waiting for completion. Open the app to start earning! 💰`,
            reply_markup: JSON.stringify({
              inline_keyboard: [[
                { text: "🚀 View Tasks", url: "https://naijalancers.name.ng/tasks" }
              ]]
            })
          }
        });
        notified++;
      }

      toast.success(`✅ Notified ${notified} experts!`);
    } catch (error) {
      console.error('Notify experts error:', error);
      toast.error('Failed to notify experts');
    }
  };

  const broadcastTelegram = async (message?: string) => {
    if (!message) {
      toast.error('Please provide a message to broadcast');
      return;
    }

    try {
      const { data: users } = await supabase
        .from('profiles')
        .select('user_id, full_name, telegram_user_id')
        .not('telegram_user_id', 'is', null)
        .limit(100);

      let sent = 0;
      for (const user of users || []) {
        await supabase.functions.invoke('send-telegram-notification', {
          body: { user_id: user.user_id, message }
        });
        sent++;
      }

      toast.success(`📢 Broadcast sent to ${sent} users!`);
    } catch (error) {
      console.error('Broadcast error:', error);
      toast.error('Failed to broadcast');
    }
  };

  const flagSuspiciousUser = async (userId: string) => {
    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action: 'flagged_suspicious',
        table_name: 'profiles',
        record_id: userId,
        metadata: { flagged_by: 'AI Assistant', reason: 'Automated detection' }
      });

      toast.success('User flagged for review');
    } catch (error) {
      console.error('Flag user error:', error);
      toast.error('Failed to flag user');
    }
  };

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

      const actions: ActionButton[] = [];
      const response = data.response;

      if (response.toLowerCase().includes('pending') && response.toLowerCase().includes('approve')) {
        actions.push({
          id: 'suggest_approve',
          label: '✓ Auto-Approve Eligible',
          action: 'approve_social_tasks',
          variant: 'default'
        });
      }
      if (response.toLowerCase().includes('broadcast') || response.toLowerCase().includes('notify all')) {
        actions.push({
          id: 'broadcast_action',
          label: '📢 Broadcast Now',
          action: 'broadcast_telegram',
          params: { message: input.replace(/\/broadcast\s*/i, '') },
          variant: 'outline'
        });
      }
      if (response.toLowerCase().includes('suspicious') || response.toLowerCase().includes('flag')) {
        actions.push({
          id: 'notify_review',
          label: '🔔 Notify Team',
          action: 'notify_experts',
          variant: 'outline'
        });
      }

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        actions: actions.length > 0 ? actions : undefined
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('AI Assistant error:', error);
      toast.error("Failed to get AI response");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCommand = (command: string) => {
    setInput(command);
  };

  if (isAdmin === false) return null;

  return (
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <Button
          className="fixed bottom-4 right-4 z-50 h-14 w-14 rounded-full shadow-lg"
          size="icon"
        >
          <div className="relative">
            <Sparkles className="h-6 w-6" />
            {alerts.length > 0 && (
              <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive">
                {alerts.length}
              </Badge>
            )}
          </div>
        </Button>
      </DrawerTrigger>
      <DrawerContent className="h-[85vh] max-h-[85vh]">
        <DrawerHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DrawerTitle>AI Command Center</DrawerTitle>
            <Badge variant="secondary" className="text-xs">
              <Zap className="h-3 w-3 mr-1" />
              Enhanced
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" onClick={fetchAlerts}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <DrawerClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </div>
        </DrawerHeader>

        <div className="flex-1 flex flex-col overflow-hidden p-4 space-y-4">
          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                <Bell className="h-3 w-3" /> Active Alerts ({alerts.length})
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {alerts.map((alert) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border text-sm ${
                      alert.type === 'urgent' ? 'bg-destructive/10 border-destructive/30' :
                      alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                      'bg-blue-500/10 border-blue-500/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-medium">{alert.title}</p>
                        <p className="text-muted-foreground text-xs">{alert.message}</p>
                      </div>
                      {alert.action && (
                        <Button
                          size="sm"
                          variant={alert.action.variant || 'default'}
                          onClick={() => executeAction(alert.action!)}
                          disabled={executingAction === alert.action.id}
                          className="text-xs h-8 shrink-0"
                        >
                          {executingAction === alert.action.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              {alert.action.label}
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Commands */}
          <div className="flex flex-wrap gap-1">
            {quickCommands.map((cmd, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                className="text-xs h-8"
                onClick={() => handleCommand(cmd.command)}
              >
                {cmd.icon}
                <span className="ml-1">{cmd.label}</span>
              </Button>
            ))}
          </div>
          
          {/* Messages */}
          <ScrollArea className="flex-1 min-h-0 border rounded-lg p-3">
            <div className="space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary/30" />
                  <p className="font-medium">AI Command Center Ready</p>
                  <p className="text-sm mt-1">I can analyze, recommend, AND execute actions!</p>
                  <p className="text-xs mt-2 text-muted-foreground">
                    Try: /pending, /suspicious, /stats, /broadcast
                  </p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-lg px-4 py-2 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground'
                      }`}
                    >
                      <div className="text-sm whitespace-pre-wrap">{msg.content}</div>
                      <p className="text-xs opacity-70 mt-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-2 ml-2">
                      {msg.actions.map((action) => (
                        <Button
                          key={action.id}
                          size="sm"
                          variant={action.executed ? 'ghost' : action.variant || 'default'}
                          onClick={() => !action.executed && executeAction(action)}
                          disabled={action.executed || executingAction === action.id}
                          className="text-xs h-8"
                        >
                          {action.executed ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" />
                              Done
                            </>
                          ) : executingAction === action.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <>
                              <Play className="h-3 w-3 mr-1" />
                              {action.label}
                            </>
                          )}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Analyzing & preparing actions...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

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
              placeholder="Ask or command: /pending, /approve, /broadcast message..."
              className="min-h-[60px] resize-none"
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size="icon"
              className="shrink-0 h-[60px] w-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
