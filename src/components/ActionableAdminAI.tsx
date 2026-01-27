import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Send, Sparkles, Loader2, Minimize2, CheckCircle2, 
  Bell, Zap, Play, RefreshCw, ClipboardList, Users, 
  DollarSign, TrendingUp
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

export const ActionableAdminAI = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminStatus();
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000); // Check every minute
    return () => clearInterval(interval);
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

  const fetchAlerts = async () => {
    try {
      // Fetch pending counts
      const [socialTasks, referralTasks, articles] = await Promise.all([
        supabase.from('social_tasks_progress').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('referral_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('article_submissions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      ]);

      const newAlerts: Alert[] = [];

      // Alert for pending social tasks
      if ((socialTasks.count || 0) > 5) {
        newAlerts.push({
          id: 'social_tasks',
          type: 'warning',
          title: `${socialTasks.count} pending social task submissions`,
          message: 'Users are waiting for approval. Auto-approve eligible ones?',
          action: {
            id: 'auto_approve_social',
            label: 'Auto-Approve Eligible',
            action: 'approve_social_tasks',
            variant: 'default'
          }
        });
      }

      // Alert for pending referral tasks
      if ((referralTasks.count || 0) > 3) {
        newAlerts.push({
          id: 'referral_tasks',
          type: 'info',
          title: `${referralTasks.count} referral submissions pending`,
          message: 'Review and approve referral task completions.',
          action: {
            id: 'view_referrals',
            label: 'Review Now',
            action: 'navigate_referrals',
            variant: 'outline'
          }
        });
      }

      // Alert for pending articles
      if ((articles.count || 0) > 2) {
        newAlerts.push({
          id: 'articles',
          type: 'info',
          title: `${articles.count} article reads pending`,
          message: 'Users completed article reading tasks.',
          action: {
            id: 'approve_articles',
            label: 'Approve All',
            action: 'approve_articles',
            variant: 'default'
          }
        });
      }

      setAlerts(newAlerts.filter(a => !a.dismissed));
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

  // Quick action commands
  const quickCommands = [
    { icon: <ClipboardList className="h-3 w-3" />, label: "Pending Tasks", command: "/pending" },
    { icon: <Users className="h-3 w-3" />, label: "Flag Suspicious", command: "/suspicious" },
    { icon: <DollarSign className="h-3 w-3" />, label: "Wallet Report", command: "/wallets" },
    { icon: <TrendingUp className="h-3 w-3" />, label: "Daily Stats", command: "/stats" },
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
        case 'navigate_referrals':
          // This would scroll to the referral section
          toast.info('Navigate to Referral Tasks tab above');
          break;
        case 'notify_experts':
          await notifyExpertsAboutTasks();
          break;
        case 'flag_user':
          if (action.params?.userId) {
            await flagSuspiciousUser(action.params.userId);
          }
          break;
        default:
          toast.info(`Action "${action.action}" executed`);
      }

      // Mark action as executed
      setMessages(prev => prev.map(msg => ({
        ...msg,
        actions: msg.actions?.map(a => 
          a.id === action.id ? { ...a, executed: true } : a
        )
      })));

      // Dismiss related alert
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
      // Get pending submissions with screenshots (eligible for auto-approval)
      const { data: pendingTasks, error } = await supabase
        .from('social_tasks_progress')
        .select('id, earner_id, task_id, screenshot_url, social_tasks(reward)')
        .eq('status', 'pending')
        .not('screenshot_url', 'is', null)
        .limit(10);

      if (error) throw error;

      let approved = 0;
      for (const task of (pendingTasks as any[]) || []) {
        // Get earner's current balance
        const { data: profile } = await supabase
          .from('profiles')
          .select('wallet_balance, balance_withdrawable')
          .eq('user_id', task.earner_id)
          .single();

        if (profile) {
          const reward = task.social_tasks?.reward || 0;
          
          // Update submission status
          await supabase
            .from('social_tasks_progress')
            .update({ status: 'completed' })
            .eq('id', task.id);

          // Credit wallet
          await supabase
            .from('profiles')
            .update({ 
              wallet_balance: (profile.wallet_balance || 0) + reward,
              balance_withdrawable: (profile.balance_withdrawable || 0) + reward
            })
            .eq('user_id', task.earner_id);

          // Log transaction
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

      toast.success(`✅ Auto-approved ${approved} social task submissions!`);
      fetchAlerts(); // Refresh alerts
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
        .limit(10);

      if (error) throw error;

      let approved = 0;
      for (const article of pendingArticles || []) {
        const reward = (article.articles as any)?.reward_amount || 0;
        
        // Update submission
        await supabase
          .from('article_submissions')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', article.id);

        approved++;
      }

      toast.success(`✅ Auto-approved ${approved} article submissions!`);
      fetchAlerts();
    } catch (error) {
      console.error('Auto-approve articles error:', error);
      toast.error('Failed to auto-approve articles');
    }
  };

  const notifyExpertsAboutTasks = async () => {
    try {
      // Get experts with Telegram linked
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
            message: `📋 *New Tasks Available!*\n\nHey ${expert.full_name}! There are new tasks waiting for completion. Open the app to start earning! 💰`
          }
        });
        notified++;
      }

      toast.success(`✅ Notified ${notified} experts about new tasks!`);
    } catch (error) {
      console.error('Notify experts error:', error);
      toast.error('Failed to notify experts');
    }
  };

  const flagSuspiciousUser = async (userId: string) => {
    try {
      // Add to suspicious users log
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

      // Parse response for action suggestions
      const actions: ActionButton[] = [];
      const response = data.response;

      // Check for actionable patterns in response
      if (response.toLowerCase().includes('pending') && response.toLowerCase().includes('approve')) {
        actions.push({
          id: 'suggest_approve',
          label: '✓ Auto-Approve Eligible',
          action: 'approve_social_tasks',
          variant: 'default'
        });
      }
      if (response.toLowerCase().includes('suspicious') || response.toLowerCase().includes('flag')) {
        actions.push({
          id: 'notify_review',
          label: '🔔 Notify for Review',
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

  if (isMinimized) {
    return (
      <Card 
        className="fixed bottom-4 right-4 w-16 h-16 cursor-pointer hover:shadow-lg transition-shadow" 
        onClick={() => setIsMinimized(false)}
      >
        <div className="w-full h-full flex items-center justify-center relative">
          <Sparkles className="h-6 w-6 text-primary" />
          {alerts.length > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs bg-destructive">
              {alerts.length}
            </Badge>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[420px] max-h-[700px] flex flex-col shadow-xl z-50 border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-primary/10 to-transparent">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          AI Command Center
          <Badge variant="secondary" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Actionable
          </Badge>
        </CardTitle>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" onClick={fetchAlerts} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsMinimized(true)}>
            <Minimize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden p-3">
        {/* Admin Status Check */}
        {isAdmin === false && (
          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-sm">
            <p className="font-medium text-yellow-700 dark:text-yellow-400 mb-1">Admin Access Required</p>
            <Button size="sm" variant="outline" onClick={checkAdminStatus}>
              Recheck Status
            </Button>
          </div>
        )}

        {/* Real-time Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Bell className="h-3 w-3" /> Active Alerts
            </div>
            {alerts.slice(0, 2).map((alert) => (
              <div 
                key={alert.id}
                className={`p-2 rounded-lg border text-xs ${
                  alert.type === 'urgent' ? 'bg-destructive/10 border-destructive/30' :
                  alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-blue-500/10 border-blue-500/30'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="font-medium">{alert.title}</p>
                    <p className="text-muted-foreground">{alert.message}</p>
                  </div>
                  {alert.action && (
                    <Button
                      size="sm"
                      variant={alert.action.variant || 'default'}
                      onClick={() => executeAction(alert.action!)}
                      disabled={executingAction === alert.action.id}
                      className="text-xs h-7"
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
        )}

        {/* Quick Commands */}
        <div className="flex flex-wrap gap-1">
          {quickCommands.map((cmd, idx) => (
            <Button
              key={idx}
              variant="outline"
              size="sm"
              className="text-xs h-7 px-2"
              onClick={() => handleCommand(cmd.command)}
            >
              {cmd.icon}
              <span className="ml-1">{cmd.label}</span>
            </Button>
          ))}
        </div>
        
        {/* Messages */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="space-y-3 pr-2">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-6">
                <Sparkles className="h-10 w-10 mx-auto mb-2 text-primary/30" />
                <p className="text-sm">I can analyze, recommend, AND execute actions!</p>
                <p className="text-xs mt-1">Try: /pending, /suspicious, /stats</p>
              </div>
            )}
            
            {messages.map((msg) => (
              <div key={msg.id} className="space-y-2">
                <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[90%] rounded-lg px-3 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">
                      {msg.content}
                    </div>
                    <p className="text-xs opacity-70 mt-1">
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                
                {/* Action Buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 ml-2">
                    {msg.actions.map((action) => (
                      <Button
                        key={action.id}
                        size="sm"
                        variant={action.executed ? 'ghost' : action.variant || 'default'}
                        onClick={() => !action.executed && executeAction(action)}
                        disabled={action.executed || executingAction === action.id}
                        className="text-xs h-7"
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
                <div className="bg-muted rounded-lg px-3 py-2 flex items-center gap-2">
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
            placeholder="Ask or command: /pending, /approve, /stats..."
            className="min-h-[60px] resize-none text-sm"
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
