import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  UserX, 
  Mail, 
  MessageSquare, 
  RefreshCw, 
  Send, 
  Loader2,
  Users,
  Briefcase,
  Eye
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface IncompleteUser {
  user_id: string;
  full_name: string | null;
  email?: string;
  phone_number: string | null;
  user_mode: 'freelancer' | 'client' | 'both' | null;
  completion_percentage: number;
  missing_fields: string[];
  created_at: string;
}

interface MessagePreview {
  emailSubject: string;
  emailBody: string;
  smsMessage: string;
  userContext: any;
}

export const IncompleteProfilesCard = () => {
  const [incompleteUsers, setIncompleteUsers] = useState<IncompleteUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedUser, setSelectedUser] = useState<IncompleteUser | null>(null);
  const [messagePreview, setMessagePreview] = useState<MessagePreview | null>(null);
  const [generatingMessage, setGeneratingMessage] = useState(false);

  useEffect(() => {
    fetchIncompleteProfiles();
  }, []);

  const fetchIncompleteProfiles = async () => {
    setLoading(true);
    try {
      // Do a dry run to get incomplete profile data
      const { data, error } = await supabase.functions.invoke('engage-incomplete-profiles', {
        body: { dryRun: true }
      });

      if (error) throw error;

      if (data?.success && data.users) {
        setIncompleteUsers(data.users);
      }
    } catch (error) {
      console.error('Error fetching incomplete profiles:', error);
      toast.error('Failed to fetch incomplete profiles');
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async (user: IncompleteUser) => {
    setSelectedUser(user);
    setGeneratingMessage(true);
    setMessagePreview(null);

    try {
      const { data, error } = await supabase.functions.invoke('generate-engagement-message', {
        body: {
          userId: user.user_id,
          messageType: 'incomplete_profile',
          channel: 'both'
        }
      });

      if (error) throw error;

      if (data?.success) {
        setMessagePreview({
          emailSubject: data.emailSubject,
          emailBody: data.emailBody,
          smsMessage: data.smsMessage,
          userContext: data.userContext
        });
      }
    } catch (error) {
      console.error('Error generating message:', error);
      toast.error('Failed to generate message preview');
    } finally {
      setGeneratingMessage(false);
    }
  };

  const sendToUser = async (user: IncompleteUser) => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('engage-incomplete-profiles', {
        body: { 
          dryRun: false,
          userId: user.user_id 
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Engagement sent to ${user.full_name || 'user'}!`);
        fetchIncompleteProfiles();
      }
    } catch (error) {
      console.error('Error sending engagement:', error);
      toast.error('Failed to send engagement');
    } finally {
      setSending(false);
    }
  };

  const sendToAll = async () => {
    if (!confirm(`Send engagement messages to ${incompleteUsers.length} users with incomplete profiles?`)) {
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('engage-incomplete-profiles', {
        body: { dryRun: false }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`Sent ${data.summary.emailsSent} emails and ${data.summary.smsSent} SMS!`);
        fetchIncompleteProfiles();
      }
    } catch (error) {
      console.error('Error sending bulk engagement:', error);
      toast.error('Failed to send bulk engagement');
    } finally {
      setSending(false);
    }
  };

  const stats = {
    total: incompleteUsers.length,
    freelancers: incompleteUsers.filter(u => u.user_mode === 'freelancer').length,
    clients: incompleteUsers.filter(u => u.user_mode === 'client').length,
    both: incompleteUsers.filter(u => u.user_mode === 'both').length,
    unset: incompleteUsers.filter(u => !u.user_mode).length
  };

  const getUserModeBadge = (mode: string | null) => {
    switch (mode) {
      case 'freelancer':
        return <Badge variant="secondary" className="text-xs"><Briefcase className="h-3 w-3 mr-1" />Freelancer</Badge>;
      case 'client':
        return <Badge variant="outline" className="text-xs"><Users className="h-3 w-3 mr-1" />Client</Badge>;
      case 'both':
        return <Badge className="text-xs bg-primary/20 text-primary">Both</Badge>;
      default:
        return <Badge variant="destructive" className="text-xs">Unset</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <UserX className="h-5 w-5 text-orange-500" />
          Incomplete Profiles
          <Badge variant="secondary">{stats.total}</Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchIncompleteProfiles} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button 
            size="sm" 
            onClick={sendToAll} 
            disabled={sending || stats.total === 0}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
            Engage All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Stats summary */}
        <div className="grid grid-cols-4 gap-2 mb-4 text-center">
          <div className="p-2 bg-muted rounded-lg">
            <div className="text-lg font-bold">{stats.freelancers}</div>
            <div className="text-xs text-muted-foreground">Freelancers</div>
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <div className="text-lg font-bold">{stats.clients}</div>
            <div className="text-xs text-muted-foreground">Clients</div>
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <div className="text-lg font-bold">{stats.both}</div>
            <div className="text-xs text-muted-foreground">Both</div>
          </div>
          <div className="p-2 bg-muted rounded-lg">
            <div className="text-lg font-bold text-destructive">{stats.unset}</div>
            <div className="text-xs text-muted-foreground">Unset</div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : incompleteUsers.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserX className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>All recent users have completed their profiles! 🎉</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {incompleteUsers.slice(0, 20).map((user) => (
                <div 
                  key={user.user_id} 
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium truncate">{user.full_name || 'Unknown'}</span>
                      {getUserModeBadge(user.user_mode)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Progress value={user.completion_percentage} className="w-16 h-1.5" />
                      <span>{user.completion_percentage}%</span>
                      <span>•</span>
                      <span className="truncate">Missing: {user.missing_fields.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={() => generatePreview(user)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle className="flex items-center gap-2">
                            AI-Generated Message for {user.full_name || 'User'}
                            {getUserModeBadge(user.user_mode)}
                          </DialogTitle>
                        </DialogHeader>
                        {generatingMessage ? (
                          <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mr-2" />
                            <span>Generating personalized message...</span>
                          </div>
                        ) : messagePreview ? (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                                <Mail className="h-4 w-4" /> Email Subject
                              </label>
                              <input 
                                className="w-full p-2 border rounded bg-muted" 
                                value={messagePreview.emailSubject} 
                                readOnly 
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                                <Mail className="h-4 w-4" /> Email Body
                              </label>
                              <Textarea 
                                className="min-h-[150px]" 
                                value={messagePreview.emailBody} 
                                readOnly 
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium flex items-center gap-2 mb-1">
                                <MessageSquare className="h-4 w-4" /> SMS Message
                                <Badge variant="outline" className="text-xs">
                                  {messagePreview.smsMessage.length}/160
                                </Badge>
                              </label>
                              <input 
                                className="w-full p-2 border rounded bg-muted" 
                                value={messagePreview.smsMessage} 
                                readOnly 
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button 
                                onClick={() => sendToUser(user)}
                                disabled={sending}
                              >
                                {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Send className="h-4 w-4 mr-1" />}
                                Send to {user.full_name?.split(' ')[0] || 'User'}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <p>Click Preview to generate a message</p>
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8"
                      onClick={() => sendToUser(user)}
                      disabled={sending}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
