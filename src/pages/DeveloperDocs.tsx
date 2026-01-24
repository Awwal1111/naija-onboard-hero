import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/ui/logo';
import { 
  Code, Wallet, Video, Bell, Zap, Shield, MessageSquare, 
  ArrowRight, CheckCircle, Globe, Webhook, BookOpen, Terminal,
  ChevronRight, ExternalLink, Copy, Github, Twitter
} from 'lucide-react';
import { toast } from 'sonner';

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

const CODE_EXAMPLES = {
  curl: `curl -X POST "https://api.naijalancers.com/v1/wallet/create" \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -d '{"external_user_id": "user_123"}'`,
  
  javascript: `const response = await fetch('https://api.naijalancers.com/v1/wallet/create', {
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

response = requests.post(
    'https://api.naijalancers.com/v1/wallet/create',
    headers={
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
    },
    json={'external_user_id': 'user_123'}
)

wallet = response.json()
print(wallet['address'])`,

  webhook: `// Express.js webhook handler
const crypto = require('crypto');

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-naijalancers-signature'];
  const [timestamp, hash] = signature.split(',').map(p => p.split('=')[1]);
  
  // Verify signature
  const payload = \`\${timestamp}.\${JSON.stringify(req.body)}\`;
  const expectedHash = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(payload)
    .digest('hex');
  
  if (hash === expectedHash) {
    // Process event
    const { event, data } = req.body;
    console.log(\`Received: \${event}\`, data);
    res.status(200).send('OK');
  } else {
    res.status(401).send('Invalid signature');
  }
});`
};

export default function DeveloperDocs() {
  const [selectedLang, setSelectedLang] = useState<'curl' | 'javascript' | 'python'>('javascript');

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied to clipboard!');
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
        <link rel="canonical" href="https://naijalancers.com/developers" />
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

      {/* Webhooks Section */}
      <section id="webhooks" className="py-20 px-4">
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
                <a href="mailto:developers@naijalancers.com" className="block mt-6">
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
                <a href="mailto:developers@naijalancers.com" className="text-muted-foreground hover:text-foreground transition-colors">
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
