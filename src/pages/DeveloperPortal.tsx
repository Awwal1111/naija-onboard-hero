import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { 
  Code, Copy, Eye, EyeOff, RefreshCw, Loader2, ArrowLeft,
  Wallet, Video, Bell, MessageSquare, Zap, Shield, BookOpen,
  Terminal, Play, ChevronRight, ExternalLink, TrendingUp, DollarSign,
  Power, BarChart3, Activity
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useNavigate } from 'react-router-dom';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  category: string;
  cost: number;
  rateLimit: number;
  params?: { name: string; type: string; required: boolean; description: string }[];
  response?: string;
}

const API_ENDPOINTS: ApiEndpoint[] = [
  // Wallet APIs
  {
    method: 'POST',
    path: '/wallet/create',
    description: 'Create a new Celo wallet for your user',
    category: 'Web3 Wallet',
    cost: 0,
    rateLimit: 10,
    params: [
      { name: 'external_user_id', type: 'string', required: true, description: 'Your unique user identifier' }
    ],
    response: '{ "address": "0x...", "external_user_id": "user123", "network": "celo-mainnet" }'
  },
  {
    method: 'GET',
    path: '/wallet/balance',
    description: 'Get wallet balance (CELO, cUSD, USDT)',
    category: 'Web3 Wallet',
    cost: 0,
    rateLimit: 100,
    params: [
      { name: 'address', type: 'string', required: false, description: 'Wallet address (or use external_user_id)' },
      { name: 'external_user_id', type: 'string', required: false, description: 'Your user identifier' }
    ],
    response: '{ "balances": { "CELO": "1.5", "cUSD": "100.00", "USDT": "50.00" } }'
  },
  {
    method: 'POST',
    path: '/wallet/transfer',
    description: 'Transfer tokens from one wallet to another',
    category: 'Web3 Wallet',
    cost: 5,
    rateLimit: 50,
    params: [
      { name: 'from_external_user_id', type: 'string', required: true, description: 'Sender user ID' },
      { name: 'to_address', type: 'string', required: true, description: 'Recipient wallet address' },
      { name: 'amount', type: 'number', required: true, description: 'Amount to transfer' },
      { name: 'token', type: 'string', required: false, description: 'Token: CELO, cUSD, USDT (default: cUSD)' }
    ],
    response: '{ "transaction_hash": "0x...", "explorer_url": "https://celoscan.io/tx/..." }'
  },
  // Video APIs
  {
    method: 'POST',
    path: '/video/create-room',
    description: 'Create a video conference room',
    category: 'Video Conferencing',
    cost: 50,
    rateLimit: 20,
    params: [
      { name: 'room_name', type: 'string', required: true, description: 'Display name for the room' },
      { name: 'max_participants', type: 'number', required: false, description: 'Max participants (default: 10)' },
      { name: 'features', type: 'object', required: false, description: '{ screen_sharing, chat, recording }' }
    ],
    response: '{ "room_id": "...", "join_url": "https://...", "embed_code": "<iframe>..." }'
  },
  {
    method: 'POST',
    path: '/video/join-room',
    description: 'Get join credentials for a room',
    category: 'Video Conferencing',
    cost: 0,
    rateLimit: 100,
    params: [
      { name: 'room_id', type: 'string', required: true, description: 'Room ID to join' },
      { name: 'user_name', type: 'string', required: false, description: 'Display name' },
      { name: 'user_id', type: 'string', required: false, description: 'Your user identifier' }
    ],
    response: '{ "join_url": "https://...", "webrtc_config": { "iceServers": [...] } }'
  },
  // VTU APIs
  {
    method: 'POST',
    path: '/vtu/airtime',
    description: 'Purchase airtime for any Nigerian number',
    category: 'VTU Services',
    cost: 2,
    rateLimit: 100,
    params: [
      { name: 'network', type: 'string', required: true, description: 'mtn, airtel, glo, 9mobile' },
      { name: 'phone', type: 'string', required: true, description: 'Phone number (e.g., 08012345678)' },
      { name: 'amount', type: 'number', required: true, description: 'Amount in Naira' }
    ],
    response: '{ "reference": "...", "status": "success", "message": "Airtime sent successfully" }'
  },
  {
    method: 'POST',
    path: '/vtu/data',
    description: 'Purchase data bundle',
    category: 'VTU Services',
    cost: 2,
    rateLimit: 100,
    params: [
      { name: 'network', type: 'string', required: true, description: 'mtn, airtel, glo, 9mobile' },
      { name: 'phone', type: 'string', required: true, description: 'Phone number' },
      { name: 'plan_id', type: 'string', required: true, description: 'Data plan ID' }
    ],
    response: '{ "reference": "...", "status": "success" }'
  },
  // Notification APIs
  {
    method: 'POST',
    path: '/notifications/email',
    description: 'Send an email notification',
    category: 'Notifications',
    cost: 5,
    rateLimit: 200,
    params: [
      { name: 'to', type: 'string', required: true, description: 'Recipient email address' },
      { name: 'subject', type: 'string', required: true, description: 'Email subject' },
      { name: 'message', type: 'string', required: true, description: 'Email body (HTML supported)' }
    ],
    response: '{ "status": "sent", "message_id": "..." }'
  },
  {
    method: 'POST',
    path: '/notifications/sms',
    description: 'Send an SMS message',
    category: 'Notifications',
    cost: 4,
    rateLimit: 100,
    params: [
      { name: 'phone', type: 'string', required: true, description: 'Phone number with country code' },
      { name: 'message', type: 'string', required: true, description: 'SMS message (max 160 chars)' }
    ],
    response: '{ "status": "sent", "message_id": "..." }'
  },
  {
    method: 'POST',
    path: '/notifications/push',
    description: 'Send a push notification',
    category: 'Notifications',
    cost: 0.5,
    rateLimit: 500,
    params: [
      { name: 'user_id', type: 'string', required: true, description: 'NaijaLancers user ID' },
      { name: 'title', type: 'string', required: true, description: 'Notification title' },
      { name: 'message', type: 'string', required: true, description: 'Notification body' },
      { name: 'data', type: 'object', required: false, description: 'Custom data payload' }
    ],
    response: '{ "status": "sent" }'
  },
  // AI APIs
  {
    method: 'POST',
    path: '/ai/chat',
    description: 'Send a message to AI assistant',
    category: 'AI Services',
    cost: 1,
    rateLimit: 100,
    params: [
      { name: 'message', type: 'string', required: true, description: 'User message' },
      { name: 'context', type: 'array', required: false, description: 'Previous messages for context' }
    ],
    response: '{ "response": "AI response text...", "usage": { "tokens": 150 } }'
  },
  // Payment APIs
  {
    method: 'POST',
    path: '/payments/escrow/create',
    description: 'Create an escrow payment',
    category: 'Payments',
    cost: 10,
    rateLimit: 50,
    params: [
      { name: 'payer_external_id', type: 'string', required: true, description: 'Payer user ID' },
      { name: 'payee_external_id', type: 'string', required: true, description: 'Payee user ID' },
      { name: 'amount', type: 'number', required: true, description: 'Amount in Naira' },
      { name: 'description', type: 'string', required: false, description: 'Payment description' }
    ],
    response: '{ "escrow_id": "...", "status": "pending", "actions": { "fund": "...", "release": "..." } }'
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All APIs', icon: Code },
  { id: 'Web3 Wallet', label: 'Web3 Wallet', icon: Wallet },
  { id: 'Video Conferencing', label: 'Video', icon: Video },
  { id: 'VTU Services', label: 'VTU', icon: Zap },
  { id: 'Notifications', label: 'Notifications', icon: Bell },
  { id: 'AI Services', label: 'AI', icon: MessageSquare },
  { id: 'Payments', label: 'Payments', icon: Shield }
];

export default function DeveloperPortal() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [testInput, setTestInput] = useState('{}');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [usage, setUsage] = useState<{ total_calls: number; total_cost: number; this_month: number } | null>(null);
  const [accountType, setAccountType] = useState<string>('personal');
  const [ncBalance, setNcBalance] = useState(0);
  const [apiKeyEnabled, setApiKeyEnabled] = useState(true);
  const [togglingKey, setTogglingKey] = useState(false);
  const [recentCalls, setRecentCalls] = useState<Array<{ endpoint: string; status_code: number; cost_nc: number; created_at: string; external_service: string | null }>>([]);
  const [endpointBreakdown, setEndpointBreakdown] = useState<Array<{ endpoint: string; count: number; cost: number }>>([]);
  const [quidaxStats, setQuidaxStats] = useState({ calls: 0, earned: 0 });

  useEffect(() => {
    if (user) {
      fetchDeveloperData();
    }
  }, [user]);

  const fetchDeveloperData = async () => {
    try {
      const [{ data: profile }, { data: secrets }] = await Promise.all([
        supabase.from('profiles').select('account_type, wallet_balance').eq('user_id', user?.id).single(),
        supabase.from('user_secrets').select('api_key').eq('user_id', user?.id).single()
      ]);
      
      if (profile) {
        setApiKey(secrets?.api_key || null);
        setAccountType((profile as any).account_type || 'personal');
        setNcBalance((profile as any).wallet_balance || 0);
      }

      // Get usage stats
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usageData } = await supabase
        .from('api_usage')
        .select('cost_nc, created_at')
        .eq('user_id', user?.id);

      if (usageData) {
        const total_calls = usageData.length;
        const total_cost = usageData.reduce((sum, u) => sum + (u.cost_nc || 0), 0);
        const this_month = usageData.filter(u => new Date(u.created_at) >= startOfMonth).length;
        setUsage({ total_calls, total_cost, this_month });
      }
    } catch (error) {
      console.error('Error fetching developer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const upgradeToDevloper = async () => {
    try {
      setLoading(true);
      
      
      const { data: keyData, error: keyError } = await supabase.rpc('generate_api_key');
      
      if (keyError) {
        console.error('Error generating API key:', keyError);
        throw new Error('Failed to generate API key');
      }
      
      if (!keyData) {
        throw new Error('API key generation returned empty result');
      }
      
      
      
      const [{ error: updateError }, { error: secretError }] = await Promise.all([
        supabase.from('profiles').update({ account_type: 'developer' } as any).eq('user_id', user?.id),
        supabase.from('user_secrets').upsert({ user_id: user?.id, api_key: keyData }, { onConflict: 'user_id' })
      ]);
      if (secretError) throw secretError;
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
      
      setApiKey(keyData);
      setAccountType('developer');
      toast.success('Welcome to the Developer Portal! Your API key is ready.');
    } catch (error: any) {
      console.error('Upgrade error:', error);
      toast.error(error.message || 'Failed to upgrade account');
    } finally {
      setLoading(false);
    }
  };

  const regenerateApiKey = async () => {
    // Confirm before regenerating
    if (!confirm('Are you sure you want to regenerate your API key?\n\nYour current key will stop working immediately. Any applications using it will need to be updated.')) {
      return;
    }
    
    try {
      setRegenerating(true);
      
      
      const { data: keyData, error: keyError } = await supabase.rpc('generate_api_key');
      
      if (keyError) {
        console.error('Error generating API key:', keyError);
        throw new Error('Failed to generate new API key');
      }
      
      if (!keyData) {
        throw new Error('API key generation returned empty result');
      }
      
      
      
      const { error: updateError } = await supabase
        .from('user_secrets')
        .upsert({ user_id: user?.id, api_key: keyData }, { onConflict: 'user_id' });
      
      if (updateError) {
        console.error('Error updating profile:', updateError);
        throw updateError;
      }
      
      setApiKey(keyData);
      toast.success('API key regenerated! Your old key is now invalid.');
    } catch (error: any) {
      console.error('Regenerate error:', error);
      toast.error(error.message || 'Failed to regenerate API key');
    } finally {
      setRegenerating(false);
    }
  };

  const copyApiKey = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
      toast.success('API key copied!');
    }
  };

  const testEndpoint = async () => {
    if (!selectedEndpoint || !apiKey) {
      toast.error('API key is required to test endpoints');
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const body = JSON.parse(testInput);
      // Use the correct Supabase URL
      const url = `https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/developer-api${selectedEndpoint.path}`;
      
      
      
      const response = await fetch(url, {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: selectedEndpoint.method !== 'GET' ? JSON.stringify(body) : undefined
      });
      
      const data = await response.json();
      
      setTestResult(JSON.stringify(data, null, 2));
      
      if (response.ok) {
        toast.success('API call successful!');
      } else {
        toast.error(data.error || 'API call failed');
      }
    } catch (error: any) {
      console.error('Test error:', error);
      setTestResult(JSON.stringify({ error: error.message }, null, 2));
      toast.error('Failed to test endpoint: ' + error.message);
    } finally {
      setTesting(false);
    }
  };

  const filteredEndpoints = selectedCategory === 'all' 
    ? API_ENDPOINTS 
    : API_ENDPOINTS.filter(e => e.category === selectedCategory);

  const methodColors: Record<string, string> = {
    GET: 'bg-green-500',
    POST: 'bg-blue-500',
    PUT: 'bg-yellow-500',
    DELETE: 'bg-red-500'
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Show upgrade prompt if not a developer
  if (accountType !== 'developer') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Code className="h-10 w-10 text-primary" />
          </div>
          
          <h1 className="text-3xl font-bold">Developer Portal</h1>
          <p className="text-muted-foreground text-lg">
            Access powerful APIs to integrate Web3 wallets, video conferencing, VTU services, 
            AI chat, and more into your applications.
          </p>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-8">
            {[
              { icon: Wallet, label: 'Web3 Wallets', desc: 'Create Celo wallets' },
              { icon: Video, label: 'Video Calls', desc: 'WebRTC conferencing' },
              { icon: Zap, label: 'VTU Services', desc: 'Airtime & data' },
              { icon: Bell, label: 'Notifications', desc: 'Email, SMS, Push' },
              { icon: MessageSquare, label: 'AI Chat', desc: 'GPT integration' },
              { icon: Shield, label: 'Escrow', desc: 'Safe payments' }
            ].map((item, i) => (
              <Card key={i} className="p-4 text-center">
                <item.icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium">{item.label}</h3>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </Card>
            ))}
          </div>
          
          <Button size="lg" onClick={upgradeToDevloper} className="gap-2">
            <Code className="h-5 w-5" />
            Become a Developer
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Free to start • Pay only for what you use
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Code className="h-5 w-5 text-primary" />
                Developer Portal
              </h1>
              <p className="text-sm text-muted-foreground">API Documentation & Testing</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden md:block">
              <p className="text-sm text-muted-foreground">NC Balance</p>
              <p className="font-bold text-primary">₦{ncBalance.toLocaleString()}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
              Top Up
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* API Key Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Your API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={apiKey || ''}
                  readOnly
                  className="pr-10 font-mono text-sm"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={copyApiKey}>
                  <Copy className="h-4 w-4 mr-2" /> Copy
                </Button>
                <Button variant="outline" onClick={regenerateApiKey} disabled={regenerating}>
                  {regenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Include in requests: <code className="bg-muted px-1 rounded">x-api-key: YOUR_API_KEY</code>
            </p>
          </CardContent>
        </Card>

        {/* Usage Stats */}
        {usage && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Terminal className="h-4 w-4" />
                <span className="text-xs">Total Calls</span>
              </div>
              <p className="text-2xl font-bold">{usage.total_calls.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">This Month</span>
              </div>
              <p className="text-2xl font-bold">{usage.this_month.toLocaleString()}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs">Total Spent</span>
              </div>
              <p className="text-2xl font-bold">₦{usage.total_cost.toLocaleString()}</p>
            </Card>
          </div>
        )}

        <Tabs defaultValue="endpoints" className="space-y-4">
          <TabsList>
            <TabsTrigger value="endpoints" className="gap-2">
              <BookOpen className="h-4 w-4" /> API Reference
            </TabsTrigger>
            <TabsTrigger value="playground" className="gap-2">
              <Terminal className="h-4 w-4" /> Playground
            </TabsTrigger>
          </TabsList>

          <TabsContent value="endpoints" className="space-y-4">
            {/* Category Filter */}
            <ScrollArea className="w-full">
              <div className="flex gap-2 pb-2">
                {CATEGORIES.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedCategory(cat.id)}
                    className="gap-2 whitespace-nowrap"
                  >
                    <cat.icon className="h-4 w-4" />
                    {cat.label}
                  </Button>
                ))}
              </div>
            </ScrollArea>

            {/* Endpoints List */}
            <div className="grid gap-3">
              {filteredEndpoints.map((endpoint, i) => (
                <Card 
                  key={i} 
                  className={`cursor-pointer transition-all hover:border-primary ${
                    selectedEndpoint?.path === endpoint.path ? 'border-primary ring-2 ring-primary/20' : ''
                  }`}
                  onClick={() => {
                    setSelectedEndpoint(endpoint);
                    setTestInput(JSON.stringify(
                      Object.fromEntries(
                        (endpoint.params || [])
                          .filter(p => p.required)
                          .map(p => [p.name, p.type === 'number' ? 0 : ''])
                      ),
                      null, 2
                    ));
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${methodColors[endpoint.method]} text-white text-xs`}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm font-mono truncate">{endpoint.path}</code>
                        </div>
                        <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span>Rate: {endpoint.rateLimit}/hr</span>
                          <span>Cost: {endpoint.cost > 0 ? `₦${endpoint.cost}` : 'Free'}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="playground" className="space-y-4">
            {selectedEndpoint ? (
              <div className="grid md:grid-cols-2 gap-4">
                {/* Request */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Badge className={`${methodColors[selectedEndpoint.method]} text-white`}>
                        {selectedEndpoint.method}
                      </Badge>
                      <code className="text-sm">{selectedEndpoint.path}</code>
                    </CardTitle>
                    <CardDescription>{selectedEndpoint.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Parameters */}
                    {selectedEndpoint.params && selectedEndpoint.params.length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Parameters</h4>
                        <div className="space-y-2">
                          {selectedEndpoint.params.map((param, i) => (
                            <div key={i} className="text-sm">
                              <code className="bg-muted px-1 rounded">{param.name}</code>
                              <span className="text-muted-foreground ml-2">
                                ({param.type}) {param.required && <Badge variant="outline" className="text-xs ml-1">required</Badge>}
                              </span>
                              <p className="text-xs text-muted-foreground mt-0.5">{param.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Request Body */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Request Body</h4>
                      <textarea
                        value={testInput}
                        onChange={(e) => setTestInput(e.target.value)}
                        className="w-full h-32 p-3 font-mono text-sm bg-muted rounded-md border resize-none"
                        placeholder="{}"
                      />
                    </div>

                    <Button onClick={testEndpoint} disabled={testing} className="w-full gap-2">
                      {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Send Request
                    </Button>
                  </CardContent>
                </Card>

                {/* Response */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Response</CardTitle>
                    <CardDescription>
                      {testResult ? 'Live response' : 'Example response'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono h-64">
                      {testResult || selectedEndpoint.response || '// Response will appear here'}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="p-8 text-center">
                <Terminal className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="font-medium mb-2">Select an API endpoint</h3>
                <p className="text-sm text-muted-foreground">
                  Choose an endpoint from the API Reference tab to test it here
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Start */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Quick Start</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-md overflow-auto text-sm font-mono">
{`// Example: Create a wallet for your user
const response = await fetch('${import.meta.env.VITE_SUPABASE_URL}/functions/v1/developer-api/wallet/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': '${apiKey?.slice(0, 8)}...'
  },
  body: JSON.stringify({
    external_user_id: 'your-user-123'
  })
});

const { address, network } = await response.json();
console.log('Wallet created:', address);`}
            </pre>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
