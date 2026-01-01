import React from 'react';
import { 
  Search, Image, Globe, Volume2, FileSearch, Languages, 
  Code, FileText, Calculator, Brain, Sparkles, Zap,
  MessageSquare, Palette, TrendingUp, BookOpen
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Capability {
  icon: React.ElementType;
  title: string;
  description: string;
  command: string;
  example: string;
  color: string;
}

const capabilities: Capability[] = [
  {
    icon: Search,
    title: 'Web Search',
    description: 'Real-time web search powered by Perplexity AI for current information, trends, and research.',
    command: 'search: [query]',
    example: 'search: best freelancing platforms 2025',
    color: 'bg-blue-500/10 text-blue-500'
  },
  {
    icon: Image,
    title: 'Image Generation',
    description: 'Create logos, banners, graphics, illustrations, and any visual content with AI.',
    command: 'generate image: [description]',
    example: 'generate image: modern tech startup logo with blue gradient',
    color: 'bg-purple-500/10 text-purple-500'
  },
  {
    icon: FileSearch,
    title: 'Website Scraping',
    description: 'Extract and analyze content from any website using Firecrawl technology.',
    command: 'scrape: [url]',
    example: 'scrape: https://example.com/pricing',
    color: 'bg-orange-500/10 text-orange-500'
  },
  {
    icon: Volume2,
    title: 'Text-to-Speech',
    description: 'Convert any text to natural-sounding speech with ElevenLabs AI voices.',
    command: 'read this: [text]',
    example: 'read this: Welcome to our platform!',
    color: 'bg-green-500/10 text-green-500'
  },
  {
    icon: Languages,
    title: 'Translation',
    description: 'Translate text between any languages while preserving meaning and tone.',
    command: 'translate to [language]: [text]',
    example: 'translate to French: Hello, how are you?',
    color: 'bg-cyan-500/10 text-cyan-500'
  },
  {
    icon: Code,
    title: 'Code Generation',
    description: 'Write, review, debug, and explain code in any programming language.',
    command: 'code: [description]',
    example: 'code: React hook for fetching data with loading state',
    color: 'bg-yellow-500/10 text-yellow-500'
  },
  {
    icon: FileText,
    title: 'Document Creation',
    description: 'Generate proposals, contracts, emails, reports, and any business document.',
    command: 'write: [document type]',
    example: 'write: proposal for web design project worth ₦500,000',
    color: 'bg-indigo-500/10 text-indigo-500'
  },
  {
    icon: Calculator,
    title: 'Calculations & Analysis',
    description: 'Perform calculations, financial analysis, pricing strategies, and data analysis.',
    command: 'calculate: [problem]',
    example: 'calculate: monthly income if I charge $50/hr for 30 hrs/week',
    color: 'bg-pink-500/10 text-pink-500'
  },
  {
    icon: Brain,
    title: 'Deep Thinking',
    description: 'Analyze complex problems from multiple angles and provide expert solutions.',
    command: 'analyze: [problem]',
    example: 'analyze: why am I not getting clients on Upwork?',
    color: 'bg-red-500/10 text-red-500'
  },
  {
    icon: MessageSquare,
    title: 'Client Communication',
    description: 'Draft professional emails, messages, and responses for clients.',
    command: 'email: [context]',
    example: 'email: politely decline a project that\'s below my rate',
    color: 'bg-teal-500/10 text-teal-500'
  },
  {
    icon: Palette,
    title: 'Design Assistance',
    description: 'Get design advice, color palettes, UI/UX feedback, and creative direction.',
    command: 'design: [request]',
    example: 'design: color palette for a fintech app targeting young Nigerians',
    color: 'bg-fuchsia-500/10 text-fuchsia-500'
  },
  {
    icon: TrendingUp,
    title: 'Marketing Strategy',
    description: 'Get marketing plans, social media strategies, and growth tactics.',
    command: 'marketing: [goal]',
    example: 'marketing: strategy to get 1000 followers on LinkedIn',
    color: 'bg-emerald-500/10 text-emerald-500'
  }
];

interface CopilotCapabilitiesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTryCapability: (command: string) => void;
}

const CopilotCapabilities: React.FC<CopilotCapabilitiesProps> = ({ 
  open, 
  onOpenChange,
  onTryCapability 
}) => {
  const handleTry = (capability: Capability) => {
    onTryCapability(capability.command.replace('[query]', '').replace('[description]', '').replace('[url]', '').replace('[text]', '').replace('[language]', '').replace('[document type]', '').replace('[problem]', '').replace('[context]', '').replace('[request]', '').replace('[goal]', ''));
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Copilot Capabilities
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Your AI Copilot can do so much more than just chat. Here are all the powerful features at your fingertips:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {capabilities.map((capability, index) => (
              <Card
                key={index}
                className="p-4 cursor-pointer hover:border-primary transition-all hover:shadow-md"
                onClick={() => handleTry(capability)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${capability.color}`}>
                    <capability.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{capability.title}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {capability.description}
                    </p>
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono">
                      {capability.command}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1 italic">
                      Example: {capability.example}
                    </p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="p-4 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg border border-primary/20">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-semibold text-sm">Pro Tips</span>
            </div>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• You can combine capabilities: "search: React best practices and then code: implement what you found"</li>
              <li>• Upload images for analysis, design critique, or to get improvement suggestions</li>
              <li>• Enable Memory in settings to maintain context across conversations</li>
              <li>• Use Client Mode when generating content to share directly with clients</li>
              <li>• Click any response to listen to it with text-to-speech</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CopilotCapabilities;
