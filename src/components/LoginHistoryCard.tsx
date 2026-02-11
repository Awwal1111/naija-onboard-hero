import React, { useEffect, useState } from 'react';
import { Shield, MapPin, Clock, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface LoginRecord {
  id: string;
  ip_address: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  login_method: string | null;
  created_at: string;
}

export const LoginHistoryCard: React.FC = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState<LoginRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('login_history')
        .select('id, ip_address, device_type, browser, os, login_method, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);
      
      setHistory(data || []);
      setLoading(false);
    };
    fetchHistory();
  }, [user]);

  const DeviceIcon = ({ type }: { type: string | null }) => {
    if (type === 'mobile') return <Smartphone className="h-4 w-4 text-muted-foreground" />;
    if (type === 'tablet') return <Tablet className="h-4 w-4 text-muted-foreground" />;
    return <Monitor className="h-4 w-4 text-muted-foreground" />;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Shield className="h-5 w-5" />
          Login History
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No login history yet</p>
        ) : (
          <div className="space-y-2">
            {history.map((record, idx) => (
              <div
                key={record.id}
                className={`flex items-center gap-3 p-3 rounded-lg ${idx === 0 ? 'bg-primary/5 border border-primary/20' : 'bg-muted/30'}`}
              >
                <DeviceIcon type={record.device_type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {record.browser || 'Unknown'} on {record.os || 'Unknown'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {record.ip_address ? `IP: ${record.ip_address.substring(0, 12)}***` : 'IP hidden'} • {record.login_method || 'email'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(record.created_at)}
                  </p>
                  {idx === 0 && (
                    <span className="text-[10px] text-primary font-medium">Current</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LoginHistoryCard;
