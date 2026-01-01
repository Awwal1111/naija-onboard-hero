import React from 'react';
import { 
  FileText, Code, Mail, Briefcase, PenTool, Globe, 
  Calculator, MessageSquare, Search, Image, Languages,
  FileCode, Lightbulb, Target, Users, TrendingUp,
  BookOpen, Mic, Video, Palette, Rocket, Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Template {
  id: string;
  title: string;
  description: string;
  prompt: string;
  category: string;
  icon: React.ElementType;
  tags: string[];
}

const templates: Template[] = [
  // Writing & Content
  {
    id: 'proposal',
    title: 'Client Proposal',
    description: 'Professional proposal for freelance projects',
    prompt: 'Write a professional proposal for a client project. Include: project understanding, proposed solution, timeline, pricing, and why I\'m the best fit. Project details:',
    category: 'Writing',
    icon: FileText,
    tags: ['proposal', 'client', 'business']
  },
  {
    id: 'cover-letter',
    title: 'Job Cover Letter',
    description: 'Compelling cover letter for job applications',
    prompt: 'Write a compelling cover letter for a job application. Make it personal, highlight relevant experience, and show enthusiasm. Job position:',
    category: 'Writing',
    icon: Mail,
    tags: ['cover letter', 'job', 'application']
  },
  {
    id: 'blog-post',
    title: 'SEO Blog Post',
    description: 'SEO-optimized article with structure',
    prompt: 'Write a comprehensive SEO-optimized blog post (1500+ words) with proper headings, introduction, body sections, and conclusion. Include keywords naturally. Topic:',
    category: 'Writing',
    icon: BookOpen,
    tags: ['blog', 'seo', 'content']
  },
  {
    id: 'social-content',
    title: 'Social Media Posts',
    description: 'Engaging posts for multiple platforms',
    prompt: 'Create engaging social media content for LinkedIn, Twitter/X, Instagram, and Facebook. Include hashtags and call-to-actions. Topic:',
    category: 'Writing',
    icon: Users,
    tags: ['social', 'marketing', 'posts']
  },
  {
    id: 'email-sequence',
    title: 'Email Sequence',
    description: 'Nurture or sales email series',
    prompt: 'Write a 5-email sequence for nurturing leads or making sales. Include subject lines, body copy, and CTAs. Product/Service:',
    category: 'Writing',
    icon: Mail,
    tags: ['email', 'marketing', 'sequence']
  },

  // Business & Strategy
  {
    id: 'business-plan',
    title: 'Business Plan Outline',
    description: 'Comprehensive business plan structure',
    prompt: 'Create a detailed business plan outline including executive summary, market analysis, products/services, marketing strategy, financial projections, and team structure. Business idea:',
    category: 'Business',
    icon: Briefcase,
    tags: ['business', 'plan', 'startup']
  },
  {
    id: 'pricing-strategy',
    title: 'Pricing Strategy',
    description: 'Calculate optimal pricing for services',
    prompt: 'Help me develop a pricing strategy for my freelance services. Consider market rates, my experience level, target clients, and Nigerian/international markets. My service:',
    category: 'Business',
    icon: Calculator,
    tags: ['pricing', 'strategy', 'freelance']
  },
  {
    id: 'pitch-deck',
    title: 'Pitch Deck Content',
    description: 'Slides content for investor presentations',
    prompt: 'Create content for a 10-slide pitch deck. Include: problem, solution, market size, business model, traction, team, financials, and ask. My startup:',
    category: 'Business',
    icon: Rocket,
    tags: ['pitch', 'investor', 'startup']
  },
  {
    id: 'swot-analysis',
    title: 'SWOT Analysis',
    description: 'Strengths, Weaknesses, Opportunities, Threats',
    prompt: 'Conduct a comprehensive SWOT analysis for my business/project. Provide actionable insights for each category. Business/Project:',
    category: 'Business',
    icon: Target,
    tags: ['analysis', 'strategy', 'planning']
  },

  // Code & Development
  {
    id: 'code-review',
    title: 'Code Review',
    description: 'Review code for best practices',
    prompt: 'Review this code for best practices, performance, security issues, and suggest improvements. Explain each suggestion. Code:',
    category: 'Development',
    icon: Code,
    tags: ['code', 'review', 'development']
  },
  {
    id: 'api-design',
    title: 'API Design',
    description: 'Design RESTful API endpoints',
    prompt: 'Design a RESTful API with proper endpoints, methods, request/response formats, authentication, and error handling. Application:',
    category: 'Development',
    icon: FileCode,
    tags: ['api', 'design', 'backend']
  },
  {
    id: 'database-schema',
    title: 'Database Schema',
    description: 'Design efficient database structure',
    prompt: 'Design a normalized database schema with tables, relationships, indexes, and sample queries. Include considerations for scalability. Application:',
    category: 'Development',
    icon: Code,
    tags: ['database', 'schema', 'design']
  },
  {
    id: 'debug-help',
    title: 'Debug Code',
    description: 'Find and fix bugs in code',
    prompt: 'Help me debug this code. Find the issue, explain why it\'s happening, and provide the corrected version with explanations. Error/Code:',
    category: 'Development',
    icon: Shield,
    tags: ['debug', 'fix', 'error']
  },

  // Design & Creative
  {
    id: 'brand-identity',
    title: 'Brand Identity',
    description: 'Complete brand guidelines',
    prompt: 'Create a comprehensive brand identity including: brand name suggestions, tagline, color palette (with hex codes), typography recommendations, logo concepts, and brand voice guidelines. Business:',
    category: 'Design',
    icon: Palette,
    tags: ['brand', 'identity', 'design']
  },
  {
    id: 'ux-review',
    title: 'UX Review',
    description: 'Review and improve user experience',
    prompt: 'Review this UI/UX design or website and provide specific improvements for usability, accessibility, visual hierarchy, and conversion. Include before/after suggestions. Design/URL:',
    category: 'Design',
    icon: PenTool,
    tags: ['ux', 'review', 'design']
  },
  {
    id: 'image-prompt',
    title: 'AI Image Prompt',
    description: 'Generate detailed image prompts',
    prompt: 'Create 3 detailed AI image generation prompts for the following concept. Include style, colors, composition, mood, and specific details. Concept:',
    category: 'Design',
    icon: Image,
    tags: ['image', 'prompt', 'ai']
  },

  // Marketing & Growth
  {
    id: 'marketing-plan',
    title: 'Marketing Plan',
    description: '90-day marketing strategy',
    prompt: 'Create a 90-day marketing plan with specific tactics, channels, content calendar, budget allocation, and KPIs. Include both organic and paid strategies. Business:',
    category: 'Marketing',
    icon: TrendingUp,
    tags: ['marketing', 'plan', 'strategy']
  },
  {
    id: 'competitor-analysis',
    title: 'Competitor Analysis',
    description: 'Analyze competitors and find opportunities',
    prompt: 'Conduct a thorough competitor analysis. Identify their strengths, weaknesses, pricing, positioning, and opportunities for differentiation. My business and competitors:',
    category: 'Marketing',
    icon: Search,
    tags: ['competitor', 'analysis', 'market']
  },
  {
    id: 'content-calendar',
    title: 'Content Calendar',
    description: 'Monthly content planning',
    prompt: 'Create a detailed monthly content calendar with post types, topics, platforms, best posting times, and content ideas for each day. Niche/Business:',
    category: 'Marketing',
    icon: BookOpen,
    tags: ['content', 'calendar', 'planning']
  },

  // Translation & Communication
  {
    id: 'translate',
    title: 'Translate Text',
    description: 'Translate to any language',
    prompt: 'Translate the following text professionally while maintaining the original meaning, tone, and context. Target language:',
    category: 'Translation',
    icon: Languages,
    tags: ['translate', 'language', 'communication']
  },
  {
    id: 'client-email',
    title: 'Client Email',
    description: 'Professional client communication',
    prompt: 'Write a professional email to a client. Be clear, polite, and action-oriented. Context:',
    category: 'Communication',
    icon: MessageSquare,
    tags: ['email', 'client', 'professional']
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Summary',
    description: 'Summarize meeting notes',
    prompt: 'Create a structured meeting summary with key decisions, action items, responsible parties, and deadlines from these notes:',
    category: 'Communication',
    icon: FileText,
    tags: ['meeting', 'summary', 'notes']
  },

  // Learning & Research
  {
    id: 'research-topic',
    title: 'Research Topic',
    description: 'Deep dive on any subject',
    prompt: 'Provide a comprehensive research summary on this topic. Include key concepts, current trends, expert opinions, statistics, and practical applications. Topic:',
    category: 'Research',
    icon: Search,
    tags: ['research', 'learn', 'topic']
  },
  {
    id: 'skill-roadmap',
    title: 'Learning Roadmap',
    description: 'Step-by-step learning plan',
    prompt: 'Create a detailed learning roadmap for this skill. Include resources, timeline, projects, milestones, and tips for Nigerian learners. Skill:',
    category: 'Research',
    icon: Lightbulb,
    tags: ['learn', 'roadmap', 'skill']
  },
  {
    id: 'interview-prep',
    title: 'Interview Prep',
    description: 'Prepare for job interviews',
    prompt: 'Help me prepare for a job interview. Provide common questions, best answers, questions to ask, and tips for success. Role:',
    category: 'Career',
    icon: Users,
    tags: ['interview', 'job', 'preparation']
  },

  // Creative
  {
    id: 'video-script',
    title: 'Video Script',
    description: 'YouTube or promo video script',
    prompt: 'Write a compelling video script with hook, content sections, call-to-action, and timing notes. Include B-roll suggestions. Video topic:',
    category: 'Creative',
    icon: Video,
    tags: ['video', 'script', 'youtube']
  },
  {
    id: 'podcast-outline',
    title: 'Podcast Outline',
    description: 'Episode structure and talking points',
    prompt: 'Create a detailed podcast episode outline with intro, talking points, transitions, guest questions (if applicable), and outro. Episode topic:',
    category: 'Creative',
    icon: Mic,
    tags: ['podcast', 'outline', 'audio']
  }
];

const categories = ['All', 'Writing', 'Business', 'Development', 'Design', 'Marketing', 'Research', 'Communication', 'Creative', 'Career', 'Translation'];

interface CopilotTemplatesProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (prompt: string) => void;
}

const CopilotTemplates: React.FC<CopilotTemplatesProps> = ({ 
  open, 
  onOpenChange, 
  onSelectTemplate 
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [searchQuery, setSearchQuery] = React.useState('');

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const handleSelect = (template: Template) => {
    onSelectTemplate(template.prompt);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Template Library
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>

          {/* Categories */}
          <ScrollArea className="w-full">
            <div className="flex gap-2 pb-2">
              {categories.map(category => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="shrink-0"
                >
                  {category}
                </Button>
              ))}
            </div>
          </ScrollArea>

          {/* Templates Grid */}
          <ScrollArea className="h-[50vh]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pr-4">
              {filteredTemplates.map(template => (
                <Card
                  key={template.id}
                  className="p-4 cursor-pointer hover:border-primary transition-all hover:shadow-md group"
                  onClick={() => handleSelect(template)}
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <template.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">{template.title}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {template.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </ScrollArea>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No templates found. Try a different search or category.
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CopilotTemplates;
