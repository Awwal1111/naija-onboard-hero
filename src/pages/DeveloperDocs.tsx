import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/ui/logo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Code, Wallet, Video, Bell, Zap, Shield, MessageSquare, 
  ArrowRight, CheckCircle, Globe, Webhook, BookOpen, Terminal,
  ChevronRight, ExternalLink, Copy, Github, Twitter, Play, Loader2, AlertCircle,
  Sparkles, Box, CreditCard, FileCode, Plus
} from 'lucide-react';
import { toast } from 'sonner';

// API Endpoints for testing
const TEST_ENDPOINTS = [
  { method: 'POST', path: '/wallet/create', body: '{\n  "external_user_id": "test_user_123"\n}' },
  { method: 'GET', path: '/wallet/balance', body: '{\n  "address": "0x...",\n  "currency": "cusd"\n}' },
  { method: 'POST', path: '/wallet/transfer', body: '{\n  "from_user_id": "user_1",\n  "to_address": "0x...",\n  "amount": 100,\n  "currency": "cusd"\n}' },
  { method: 'POST', path: '/video/create-room', body: '{\n  "room_name": "my-meeting",\n  "max_participants": 10\n}' },
  { method: 'POST', path: '/video/join-room', body: '{\n  "room_id": "room_123",\n  "user_id": "user_456",\n  "display_name": "John"\n}' },
  { method: 'POST', path: '/vtu/airtime', body: '{\n  "phone_number": "08012345678",\n  "amount": 500,\n  "network": "mtn"\n}' },
  { method: 'POST', path: '/payments/escrow/create', body: '{\n  "payer_id": "user_1",\n  "payee_id": "user_2",\n  "amount": 5000,\n  "description": "Freelance work"\n}' },
  { method: 'GET', path: '/webhooks', body: '' },
  { method: 'POST', path: '/webhooks', body: '{\n  "webhook_url": "https://your-app.com/webhook",\n  "events": ["wallet.created", "escrow.released"]\n}' },
];

const FEATURES = [
  {
    icon: Wallet,
    title: 'Web3 Wallets',
    description: 'Create and manage Celo blockchain wallets. Support for CELO, cUSD, and USDT tokens.',
    endpoints: ['POST /wallet/create', 'GET /wallet/balance', 'POST /wallet/transfer'],
    color: 'text-amber-500'
  },
  {
    icon: Video,
    title: 'Video Conferencing',
    description: 'Embed real-time video calls powered by WebRTC. Screen sharing, chat, and recording.',
    endpoints: ['POST /video/create-room', 'POST /video/join-room'],
    color: 'text-blue-500'
  },
  {
    icon: Zap,
    title: 'VTU Services',
    description: 'Purchase airtime and data bundles for all Nigerian networks. Instant delivery.',
    endpoints: ['POST /vtu/airtime', 'POST /vtu/data', 'POST /vtu/electricity'],
    color: 'text-green-500'
  },
  {
    icon: Bell,
    title: 'Notifications',
    description: 'Send emails, SMS, and push notifications to your users across multiple channels.',
    endpoints: ['POST /notifications/email', 'POST /notifications/sms', 'POST /notifications/push'],
    color: 'text-purple-500'
  },
  {
    icon: Shield,
    title: 'Escrow Payments',
    description: 'Secure payment processing with escrow protection. Release funds on completion.',
    endpoints: ['POST /payments/escrow/create', 'POST /payments/escrow/release'],
    color: 'text-red-500'
  },
  {
    icon: MessageSquare,
    title: 'AI Assistant',
    description: 'Integrate GPT-powered AI chat into your applications. Context-aware responses.',
    endpoints: ['POST /ai/chat'],
    color: 'text-cyan-500'
  }
];

const WEBHOOK_EVENTS = [
  { event: 'wallet.created', description: 'A new wallet was created for a user' },
  { event: 'wallet.deposit', description: 'Funds were deposited into a wallet' },
  { event: 'wallet.transfer', description: 'A transfer was completed successfully' },
  { event: 'escrow.created', description: 'A new escrow payment was created' },
  { event: 'escrow.funded', description: 'An escrow was funded by the payer' },
  { event: 'escrow.released', description: 'Escrow funds were released to the payee' },
  { event: 'escrow.refunded', description: 'Escrow was cancelled and funds refunded' },
  { event: 'vtu.airtime.success', description: 'Airtime purchase completed successfully' },
  { event: 'vtu.data.success', description: 'Data bundle purchase completed' },
  { event: 'video.room.created', description: 'A new video room was created' },
  { event: 'video.room.ended', description: 'A video session ended' },
];

const API_BASE_URL = `${import.meta.env.VITE_SUPABASE_URL ?? 'https://your-project-ref.supabase.co'}/functions/v1/developer-api`;

const MINIAPP_SDK_EXAMPLE = `<!-- Include in your Mini App's HTML -->
<script>
// 1. Tell NaijaLancers your app is ready
window.parent.postMessage({ type: 'njl_ready' }, '*');

// 2. Listen for events from the parent app
window.addEventListener('message', (event) => {
  const data = event.data;
  
  if (data.type === 'njl_identify') {
    console.log('User ID:', data.user.user_id);
    console.log('Name:', data.user.full_name);
    console.log('Email:', data.user.email);
    console.log('Avatar:', data.user.profile_picture_url);
  }
  
  if (data.type === 'njl_charge_result') {
    if (data.success) {
      console.log('Payment successful! Ref:', data.txRef);
    } else {
      console.log('Payment failed:', data.error);
    }
  }

  if (data.type === 'njl_balance_result') {
    console.log('User balance:', data.balance, 'NC');
  }

  if (data.type === 'njl_payout_result') {
    if (data.success) {
      console.log('Payout sent! Ref:', data.txRef);
    } else {
      console.log('Payout failed:', data.error);
    }
  }
});

// 3. Charge the user
//    currency: 'NC' (default, internal) or 'USDT' (on-chain Celo).
//    USDT: NC is deducted from the user (PIN-verified). The platform master
//    wallet sends the equivalent USDT to ANY external 0x address you pass in
//    "to" — your treasury, a smart contract, a partner wallet, anything.
//    The result includes user_id so you know which user paid.
function chargeUser(amount, description, chargeType, currency, toAddress) {
  const requestId = 'req_' + Math.random().toString(36).slice(2);
  window.parent.postMessage({
    type: 'njl_charge',
    amount: amount,
    description: description,
    charge_type: chargeType, // 'one_time' | 'subscription' | 'tip' | 'purchase'
    currency: currency || 'NC', // 'NC' | 'USDT'
    to: toAddress,              // REQUIRED when currency === 'USDT'
    requestId: requestId
  }, '*');
}

// 4. Query user balance
//    'NC' returns internal NC balance.
//    'USDT' returns the on-chain USDT balance of the user's connected wallet.
function getBalance(currency) {
  const requestId = 'bal_' + Math.random().toString(36).slice(2);
  window.parent.postMessage({
    type: 'njl_balance',
    currency: currency || 'NC',
    requestId: requestId
  }, '*');
}

// 5. Send money to a user
//    NC: credits user's internal NC balance.
//    USDT: the platform does NOT move funds. We simply return the user's
//    connected wallet address — your own contract / external system is
//    responsible for sending USDT to that address.
function payoutUser(amount, description, currency) {
  const requestId = 'po_' + Math.random().toString(36).slice(2);
  window.parent.postMessage({
    type: 'njl_payout',
    amount: amount,
    description: description,
    currency: currency || 'NC', // 'NC' | 'USDT'
    requestId: requestId
  }, '*');
}

// 6. Verify user identity via PIN (for sensitive actions)
function verifyPin(reason) {
  const requestId = 'pin_' + Math.random().toString(36).slice(2);
  window.parent.postMessage({
    type: 'njl_verify_pin',
    reason: reason,
    requestId: requestId
  }, '*');
}

// Examples:
chargeUser(500, 'Premium Access - 30 Days', 'subscription');                          // 500 NC
chargeUser(1.5, 'Pro Plan', 'subscription', 'USDT', '0xYourTreasuryAddress');         // 1.5 USDT to your address
getBalance();                                                                          // NC
getBalance('USDT');                                                                    // on-chain USDT
payoutUser(200, 'Savings withdrawal');                                                 // NC credit
payoutUser(5, 'Reward', 'USDT');                                                       // returns user's wallet address; you send USDT yourself
verifyPin('confirm withdrawal');
</script>`;

const MINIAPP_SDK_EVENTS = [
  { direction: '← Parent sends', event: 'njl_identify', description: 'Sent automatically when your app loads. Contains user_id, full_name, email, profile_picture_url.' },
  { direction: '→ App sends', event: 'njl_ready', description: 'Send this when your app is ready to receive the identity payload.' },
  { direction: '→ App sends', event: 'njl_charge', description: 'Request a payment. Fields: amount, description, charge_type, currency ("NC" default | "USDT"), to (REQUIRED for USDT — ANY external 0x destination address), requestId (REQUIRED, unique per charge — used for idempotency, safe to retry).' },
  { direction: '← Parent sends', event: 'njl_charge_result', description: 'Payment result. Fields: success, currency, txRef, user_id, to, amount, error, requestId, duplicate (true if requestId was already processed). Also delivered to your registered webhook URL signed with HMAC-SHA256 (header X-Naijalancers-Signature: sha256=<hex>) — verify on your backend before granting value.' },
  { direction: '→ App sends', event: 'njl_balance', description: 'Query user balance. Fields: currency ("NC" | "USDT"), requestId.' },
  { direction: '← Parent sends', event: 'njl_balance_result', description: 'Balance result. Fields: balance, currency, address (USDT only), requestId.' },
  { direction: '→ App sends', event: 'njl_payout', description: 'Pay a user. Fields: amount, description, currency ("NC" | "USDT"), requestId. NC payouts credit the user\'s internal balance. USDT payouts return the user\'s wallet address + profile — your contract handles the actual on-chain send.' },
  { direction: '← Parent sends', event: 'njl_payout_result', description: 'Payout result. NC: { success, txRef, error }. USDT: { success, wallet_address, amount, user: { user_id, full_name, email, phone, profile_picture_url, wallet_address, country } } — use wallet_address to send USDT yourself.' },
  { direction: '→ App sends', event: 'njl_verify_pin', description: 'Request PIN verification for sensitive actions. Fields: reason, requestId.' },
  { direction: '← Parent sends', event: 'njl_verify_pin_result', description: 'PIN verification result. Fields: success, error, requestId.' },
];

const CODE_EXAMPLES = {
  curl: `# Base URL: ${API_BASE_URL}

curl -X POST "${API_BASE_URL}/wallet/create" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"external_user_id": "user_123"}'`,
  
  javascript: `// Base URL (use this, NOT api.naijalancers.name.ng)
const BASE_URL = '${API_BASE_URL}';

const response = await fetch(\`\${BASE_URL}/wallet/create\`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    external_user_id: 'user_123'
  })
});

const wallet = await response.json();
console.log(wallet.address);`,

  python: `import requests

# Base URL (use this, NOT api.naijalancers.name.ng)
BASE_URL = '${API_BASE_URL}'

response = requests.post(
    f'{BASE_URL}/wallet/create',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
    },
    json={'external_user_id': 'user_123'}
)

wallet = response.json()
print(wallet['address'])`,

  webhook: `// MiniApp Charge Webhook (Express.js)
// Configure URL + view secret in Apps → My Apps → Webhook & Secret
const crypto = require('crypto');

app.post('/naijalancers-webhook',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const sig = req.headers['x-naijalancers-signature']; // "sha256=<hex>"
    const expected = 'sha256=' + crypto
      .createHmac('sha256', process.env.NAIJALANCERS_WEBHOOK_SECRET)
      .update(req.body) // raw body buffer
      .digest('hex');

    if (sig !== expected) return res.status(401).send('bad signature');

    const evt = JSON.parse(req.body.toString());
    // evt = { event: "charge.completed", request_id, mini_app_id, user_id,
    //         to_address, usdt_amount, nc_amount, exchange_rate, tx_hash, timestamp }
    if (evt.event === 'charge.completed') {
      // Idempotent: store evt.request_id, ignore if already processed
      grantUserAccess(evt.user_id, evt.usdt_amount);
    }
    res.status(200).send('ok');
  }
);`
};

export default function DeveloperDocs() {
  const [selectedLang, setSelectedLang] = useState<'curl' | 'javascript' | 'python'>('javascript');
  
  // API Playground state
  const [apiKey, setApiKey] = useState('');
  const [selectedEndpoint, setSelectedEndpoint] = useState(TEST_ENDPOINTS[0]);
  const [requestBody, setRequestBody] = useState(TEST_ENDPOINTS[0].body);
  const [response, setResponse] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
  };

  const handleEndpointChange = (path: string) => {
    const endpoint = TEST_ENDPOINTS.find(e => e.path === path);
    if (endpoint) {
      setSelectedEndpoint(endpoint);
      setRequestBody(endpoint.body);
      setResponse(null);
    }
  };

  const testApi = async () => {
    if (!apiKey.trim()) {
      toast.error('Please enter your API key');
      return;
    }

    setIsTesting(true);
    setResponse(null);

    try {
      const url = `${API_BASE_URL}${selectedEndpoint.path}`;
      
      const options: RequestInit = {
        method: selectedEndpoint.method,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey.trim()
        }
      };

      if (selectedEndpoint.method !== 'GET' && requestBody.trim()) {
        try {
          options.body = JSON.stringify(JSON.parse(requestBody));
        } catch {
          toast.error('Invalid JSON in request body');
          setIsTesting(false);
          return;
        }
      }

      const res = await fetch(url, options);
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
      
      if (res.ok) {
        toast.success('API call successful!');
      } else {
        toast.error(data.error || 'API call failed');
      }
    } catch (error: any) {
      setResponse(JSON.stringify({ error: error.message }, null, 2));
      toast.error('Request failed');
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Developer API | NaijaLancers - Build with Web3, Video & VTU APIs</title>
        <meta name="description" content="Integrate NaijaLancers' powerful APIs into your applications. Web3 wallets, video conferencing, VTU services, notifications, and more. Start building today." />
        <meta name="keywords" content="NaijaLancers API, Web3 API, Celo wallet API, Video API, VTU API, Nigeria developer API, escrow API" />
        <meta property="og:title" content="NaijaLancers Developer API" />
        <meta property="og:description" content="Build powerful applications with our Web3, Video, VTU, and Payment APIs" />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://naijalancers.name.ng/developers" />
      </Helmet>

      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className="h-8 w-8" />
            <span className="font-bold text-lg">NaijaLancers</span>
            <Badge variant="secondary" className="ml-2">Developers</Badge>
          </Link>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#miniapp-sdk" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Mini App SDK</a>
            <a href="#playground" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Playground</a>
            <a href="#webhooks" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Webhooks</a>
            <a href="#docs" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Documentation</a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Pricing</a>
          </nav>
          
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/developer">
              <Button size="sm" className="gap-2">
                <Terminal className="h-4 w-4" />
                Get API Key
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-4">
            <Code className="h-3 w-3 mr-1" /> Developer API v1.0
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Build Powerful Apps with NaijaLancers API
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Integrate Web3 wallets, video conferencing, VTU services, escrow payments, 
            and AI into your applications. Built for Nigeria, ready for the world.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Start Building <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#docs">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <BookOpen className="h-4 w-4" /> Read Documentation
              </Button>
            </a>
          </div>
          
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Free to start
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Pay per use
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Real-time webhooks
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Nigerian-optimized
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything You Need to Build</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Six powerful API categories to supercharge your applications
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:border-primary/50">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {feature.endpoints.map((endpoint, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ChevronRight className="h-3 w-3" />
                        <code className="text-xs bg-muted px-2 py-0.5 rounded">{endpoint}</code>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Code Example Section */}
      <section id="docs" className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Quick Start</h2>
            <p className="text-muted-foreground">
              Get started in minutes with our simple API
            </p>
          </div>

          {/* Important: Base URL Notice */}
          <Card className="mb-6 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <AlertCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">⚠️ Important: Correct Base URL</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    All API requests must use this base URL. Do <strong>NOT</strong> use <code className="bg-destructive/10 text-destructive px-1 rounded">api.naijalancers.name.ng</code> — that domain does not exist.
                  </p>
                  <div className="bg-background border rounded-lg p-3 flex items-center justify-between gap-2">
                    <code className="text-sm font-mono text-primary break-all">{API_BASE_URL}</code>
                    <Button variant="ghost" size="sm" onClick={() => copyCode(API_BASE_URL)} className="shrink-0">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Create a Wallet</span>
              </div>
              <Tabs value={selectedLang} onValueChange={(v) => setSelectedLang(v as any)}>
                <TabsList className="h-8">
                  <TabsTrigger value="curl" className="text-xs h-7">cURL</TabsTrigger>
                  <TabsTrigger value="javascript" className="text-xs h-7">JavaScript</TabsTrigger>
                  <TabsTrigger value="python" className="text-xs h-7">Python</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            <div className="relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-3 right-3 h-8 w-8"
                onClick={() => copyCode(CODE_EXAMPLES[selectedLang])}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <ScrollArea className="h-[300px]">
                <pre className="p-4 text-sm">
                  <code className="text-foreground">{CODE_EXAMPLES[selectedLang]}</code>
                </pre>
              </ScrollArea>
            </div>
          </Card>
        </div>
      </section>

      {/* API Playground Section */}
      <section id="playground" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Play className="h-5 w-5" />
              <span className="font-medium">Interactive Playground</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Test the API Live</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Enter your API key and test any endpoint directly from this page.
              Get your API key from the <Link to="/developer" className="text-primary hover:underline">Developer Portal</Link>.
            </p>
          </div>
          
          <Card className="overflow-hidden">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                API Playground
              </CardTitle>
              <CardDescription>
                Test API endpoints with your own API key
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              {/* API Key Input */}
              <div className="space-y-2">
                <Label htmlFor="apiKey">Your API Key</Label>
                <Input
                  id="apiKey"
                  type="password"
                  placeholder="Enter your x-api-key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Don't have an API key? <Link to="/developer" className="text-primary hover:underline">Get one here</Link>
                </p>
              </div>

              {/* Endpoint Selector */}
              <div className="space-y-2">
                <Label>Select Endpoint</Label>
                <Select value={selectedEndpoint.path} onValueChange={handleEndpointChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEST_ENDPOINTS.map((ep) => (
                      <SelectItem key={ep.path} value={ep.path}>
                        <span className="flex items-center gap-2">
                          <Badge variant={ep.method === 'GET' ? 'secondary' : 'default'} className="text-xs">
                            {ep.method}
                          </Badge>
                          <code className="text-sm">{ep.path}</code>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Request Body */}
              {selectedEndpoint.method !== 'GET' && (
                <div className="space-y-2">
                  <Label>Request Body (JSON)</Label>
                  <Textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    className="font-mono text-sm h-32"
                    placeholder="{}"
                  />
                </div>
              )}

              {/* Test Button */}
              <Button 
                onClick={testApi} 
                disabled={isTesting || !apiKey.trim()}
                className="w-full gap-2"
                size="lg"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Send Request
                  </>
                )}
              </Button>

              {/* Response */}
              {response && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Response</Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => copyCode(response)}
                      className="h-7 text-xs"
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Copy
                    </Button>
                  </div>
                  <ScrollArea className="h-64 rounded-lg border bg-muted/30">
                    <pre className="p-4 text-sm font-mono text-foreground">
                      {response}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Webhooks Section */}
      <section id="webhooks" className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Webhook className="h-5 w-5" />
              <span className="font-medium">Real-time Webhooks</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Stay Updated in Real-time</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Receive instant notifications when important events happen. 
              Our webhooks are signed, reliable, and include automatic retries.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Available Events</CardTitle>
                <CardDescription>Subscribe to any of these events</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-3">
                    {WEBHOOK_EVENTS.map((item, i) => (
                      <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <code className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono">
                          {item.event}
                        </code>
                        <span className="text-sm text-muted-foreground flex-1">
                          {item.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Webhook Handler Example</CardTitle>
                <CardDescription>Verify signatures and process events</CardDescription>
              </CardHeader>
              <CardContent className="relative">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="absolute top-0 right-0 h-8 w-8"
                  onClick={() => copyCode(CODE_EXAMPLES.webhook)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <ScrollArea className="h-[300px]">
                  <pre className="text-xs">
                    <code>{CODE_EXAMPLES.webhook}</code>
                  </pre>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Mini App SDK Section */}
      <section id="miniapp-sdk" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">Mini App Platform</span>
            </div>
            <h2 className="text-3xl font-bold mb-4">Build Mini Apps for NaijaLancers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Create apps that run inside NaijaLancers. Access user identity, charge NC payments, 
              and reach thousands of users. 90% revenue goes to you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {/* SDK Events Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">SDK Events (postMessage)</CardTitle>
                <CardDescription>Communication between your app and NaijaLancers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {MINIAPP_SDK_EVENTS.map((item, i) => (
                    <div key={i} className="p-3 rounded-lg bg-muted/50 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={item.direction.startsWith('←') ? 'secondary' : 'default'} className="text-[10px]">
                          {item.direction}
                        </Badge>
                        <code className="text-xs font-mono text-primary font-bold">{item.event}</code>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Rules & Guidelines */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Rules & Guidelines</CardTitle>
                <CardDescription>Requirements for Mini App approval</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Must be hosted on <strong>HTTPS</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Must work inside an <strong>iframe</strong> (no X-Frame-Options deny)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>No adult, gambling, or illegal content</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Revenue split: <strong>90%</strong> to developer, <strong>10%</strong> platform fee</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Admin review required before going live</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Provide a square icon (128×128px+) and clear description</span>
                  </li>
                </ul>
                <div className="mt-6">
                  <Link to="/mini-apps">
                    <Button className="w-full gap-2">
                      <Plus className="h-4 w-4" />
                      Submit Your Mini App
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SDK Code Example */}
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Integration Example</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => copyCode(MINIAPP_SDK_EXAMPLE)}
                className="h-7 text-xs"
              >
                <Copy className="h-3 w-3 mr-1" />
                Copy
              </Button>
            </div>
            <ScrollArea className="h-[400px]">
              <pre className="p-4 text-sm">
                <code className="text-foreground">{MINIAPP_SDK_EXAMPLE}</code>
              </pre>
            </ScrollArea>
          </Card>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-muted-foreground">
              Pay only for what you use. No monthly fees, no hidden charges.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle>Starter</CardTitle>
                <div className="text-4xl font-bold mt-4">Free</div>
                <CardDescription>Perfect for testing</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Wallet creation - Free
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Balance checks - Free
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    1,000 API calls/month
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Basic webhook support
                  </li>
                </ul>
                <Link to="/signup" className="block mt-6">
                  <Button variant="outline" className="w-full">Get Started</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-2 border-primary relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Most Popular</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle>Pay-as-you-go</CardTitle>
                <div className="text-4xl font-bold mt-4">₦0</div>
                <CardDescription>+ usage costs</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Transfers - ₦5/tx
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Video rooms - ₦50/room
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    VTU services - ₦2/tx
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Unlimited webhooks
                  </li>
                </ul>
                <Link to="/signup" className="block mt-6">
                  <Button className="w-full">Start Building</Button>
                </Link>
              </CardContent>
            </Card>
            
            <Card className="border-2">
              <CardHeader className="text-center">
                <CardTitle>Enterprise</CardTitle>
                <div className="text-4xl font-bold mt-4">Custom</div>
                <CardDescription>For high-volume apps</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Volume discounts
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Dedicated support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Custom SLA
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    White-label options
                  </li>
                </ul>
                <a href="mailto:developers@naijalancers.name.ng" className="block mt-6">
                  <Button variant="outline" className="w-full">Contact Sales</Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Something Amazing?</h2>
          <p className="text-muted-foreground mb-8">
            Join hundreds of developers building with NaijaLancers API
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="lg" className="gap-2 w-full sm:w-auto">
                Create Free Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/developer">
              <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                <Terminal className="h-4 w-4" /> Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Logo className="h-8 w-8" />
                <span className="font-bold">NaijaLancers</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Empowering Nigerian developers to build world-class applications.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">API</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#docs" className="hover:text-foreground transition-colors">Documentation</a></li>
                <li><a href="#webhooks" className="hover:text-foreground transition-colors">Webhooks</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Pricing</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link to="/faq" className="hover:text-foreground transition-colors">FAQ</Link></li>
                <li><Link to="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-4">Connect</h4>
              <div className="flex gap-3">
                <a href="https://github.com/naijalancers" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Github className="h-5 w-5" />
                </a>
                <a href="https://twitter.com/naijalancers" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="mailto:developers@naijalancers.name.ng" className="text-muted-foreground hover:text-foreground transition-colors">
                  <Globe className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t mt-8 pt-8 text-center text-sm text-muted-foreground">
            © {new Date().getFullYear()} NaijaLancers. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
