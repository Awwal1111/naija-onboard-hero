// Tools & Resources Library for Learning Hub

export interface LearningTool {
  id: string;
  name: string;
  description: string;
  url: string;
  icon: string;
  category: ToolCategory;
  isPremium: boolean;
  tags: string[];
}

export type ToolCategory = 
  | 'content-creation'
  | 'collaboration'
  | 'stock-assets'
  | 'scheduling'
  | 'analytics'
  | 'client-management'
  | 'development'
  | 'ai-tools'
  | 'design'
  | 'productivity';

export const toolCategories: { id: ToolCategory; name: string; icon: string; description: string }[] = [
  { id: 'content-creation', name: 'Content Creation', icon: '🎨', description: 'Create stunning visuals, videos & audio' },
  { id: 'collaboration', name: 'Team & Client Collaboration', icon: '🤝', description: 'Work together seamlessly' },
  { id: 'stock-assets', name: 'Stock Assets & Media', icon: '📹', description: 'Free images, videos & music' },
  { id: 'scheduling', name: 'Scheduling & Publishing', icon: '📅', description: 'Plan and automate your content' },
  { id: 'analytics', name: 'Analytics & Insights', icon: '📊', description: 'Track performance & grow' },
  { id: 'client-management', name: 'Client Management', icon: '💼', description: 'Manage clients & payments' },
  { id: 'development', name: 'Development Tools', icon: '💻', description: 'Build apps & websites' },
  { id: 'ai-tools', name: 'AI & Automation', icon: '🤖', description: 'AI-powered productivity tools' },
  { id: 'design', name: 'Design & Prototyping', icon: '✏️', description: 'UI/UX design tools' },
  { id: 'productivity', name: 'Productivity', icon: '⚡', description: 'Stay organized & efficient' },
];

export const learningTools: LearningTool[] = [
  // Content Creation
  {
    id: 'canva',
    name: 'Canva',
    description: 'Free graphic design platform for social media, presentations, and more',
    url: 'https://www.canva.com',
    icon: '🎨',
    category: 'content-creation',
    isPremium: false,
    tags: ['design', 'graphics', 'social media', 'templates']
  },
  {
    id: 'davinci-resolve',
    name: 'DaVinci Resolve',
    description: 'Professional video editing software - free version available',
    url: 'https://www.blackmagicdesign.com/products/davinciresolve',
    icon: '🎬',
    category: 'content-creation',
    isPremium: false,
    tags: ['video editing', 'color grading', 'professional']
  },
  {
    id: 'capcut',
    name: 'CapCut',
    description: 'Free all-in-one video editor for mobile and desktop',
    url: 'https://www.capcut.com',
    icon: '📱',
    category: 'content-creation',
    isPremium: false,
    tags: ['video editing', 'mobile', 'tiktok', 'reels']
  },
  {
    id: 'audacity',
    name: 'Audacity',
    description: 'Free, open-source audio editing software',
    url: 'https://www.audacityteam.org',
    icon: '🎵',
    category: 'content-creation',
    isPremium: false,
    tags: ['audio', 'podcast', 'music', 'editing']
  },
  {
    id: 'obs-studio',
    name: 'OBS Studio',
    description: 'Free streaming and recording software',
    url: 'https://obsproject.com',
    icon: '📺',
    category: 'content-creation',
    isPremium: false,
    tags: ['streaming', 'recording', 'live', 'youtube']
  },
  {
    id: 'descript',
    name: 'Descript',
    description: 'AI-powered video and podcast editing',
    url: 'https://www.descript.com',
    icon: '✨',
    category: 'content-creation',
    isPremium: true,
    tags: ['ai', 'video', 'podcast', 'transcription']
  },

  // Collaboration
  {
    id: 'slack',
    name: 'Slack',
    description: 'Team communication and collaboration platform',
    url: 'https://slack.com',
    icon: '💬',
    category: 'collaboration',
    isPremium: false,
    tags: ['communication', 'team', 'messaging', 'channels']
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Visual project management with boards and cards',
    url: 'https://trello.com',
    icon: '📋',
    category: 'collaboration',
    isPremium: false,
    tags: ['project management', 'kanban', 'tasks', 'boards']
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'All-in-one workspace for notes, docs, and projects',
    url: 'https://www.notion.so',
    icon: '📝',
    category: 'collaboration',
    isPremium: false,
    tags: ['notes', 'docs', 'wiki', 'database']
  },
  {
    id: 'google-workspace',
    name: 'Google Workspace',
    description: 'Docs, Sheets, Slides, Drive and more',
    url: 'https://workspace.google.com',
    icon: '📊',
    category: 'collaboration',
    isPremium: false,
    tags: ['docs', 'sheets', 'drive', 'collaboration']
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Work management platform for teams',
    url: 'https://asana.com',
    icon: '✅',
    category: 'collaboration',
    isPremium: false,
    tags: ['project management', 'tasks', 'workflow', 'teams']
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'One app to replace them all - tasks, docs, goals',
    url: 'https://clickup.com',
    icon: '🚀',
    category: 'collaboration',
    isPremium: false,
    tags: ['project management', 'all-in-one', 'productivity']
  },

  // Stock Assets
  {
    id: 'pexels',
    name: 'Pexels',
    description: 'Free stock photos and videos',
    url: 'https://www.pexels.com',
    icon: '📷',
    category: 'stock-assets',
    isPremium: false,
    tags: ['photos', 'videos', 'free', 'stock']
  },
  {
    id: 'unsplash',
    name: 'Unsplash',
    description: 'Beautiful free images and pictures',
    url: 'https://unsplash.com',
    icon: '🖼️',
    category: 'stock-assets',
    isPremium: false,
    tags: ['photos', 'images', 'free', 'high-quality']
  },
  {
    id: 'pixabay',
    name: 'Pixabay',
    description: 'Free images, videos, music and sound effects',
    url: 'https://pixabay.com',
    icon: '🎭',
    category: 'stock-assets',
    isPremium: false,
    tags: ['images', 'videos', 'music', 'free']
  },
  {
    id: 'mixkit',
    name: 'Mixkit',
    description: 'Free video clips, music and sound effects',
    url: 'https://mixkit.co',
    icon: '🎞️',
    category: 'stock-assets',
    isPremium: false,
    tags: ['video', 'music', 'sound effects', 'free']
  },
  {
    id: 'freepik',
    name: 'Freepik',
    description: 'Free vectors, stock photos, PSD and icons',
    url: 'https://www.freepik.com',
    icon: '🎯',
    category: 'stock-assets',
    isPremium: false,
    tags: ['vectors', 'psd', 'icons', 'graphics']
  },
  {
    id: 'envato-elements',
    name: 'Envato Elements',
    description: 'Unlimited creative assets with subscription',
    url: 'https://elements.envato.com',
    icon: '💎',
    category: 'stock-assets',
    isPremium: true,
    tags: ['premium', 'templates', 'graphics', 'unlimited']
  },

  // Scheduling & Publishing
  {
    id: 'buffer',
    name: 'Buffer',
    description: 'Social media scheduling and analytics',
    url: 'https://buffer.com',
    icon: '📱',
    category: 'scheduling',
    isPremium: false,
    tags: ['social media', 'scheduling', 'analytics']
  },
  {
    id: 'later',
    name: 'Later',
    description: 'Visual social media planner and scheduler',
    url: 'https://later.com',
    icon: '📅',
    category: 'scheduling',
    isPremium: false,
    tags: ['instagram', 'scheduling', 'visual planner']
  },
  {
    id: 'hootsuite',
    name: 'Hootsuite',
    description: 'Social media management platform',
    url: 'https://www.hootsuite.com',
    icon: '🦉',
    category: 'scheduling',
    isPremium: true,
    tags: ['social media', 'management', 'enterprise']
  },
  {
    id: 'calendly',
    name: 'Calendly',
    description: 'Scheduling automation for meetings',
    url: 'https://calendly.com',
    icon: '📆',
    category: 'scheduling',
    isPremium: false,
    tags: ['meetings', 'scheduling', 'booking', 'calendar']
  },
  {
    id: 'metricool',
    name: 'Metricool',
    description: 'Social media analytics and scheduling',
    url: 'https://metricool.com',
    icon: '📈',
    category: 'scheduling',
    isPremium: false,
    tags: ['analytics', 'scheduling', 'reports']
  },

  // Analytics
  {
    id: 'google-analytics',
    name: 'Google Analytics',
    description: 'Web analytics service for tracking website traffic',
    url: 'https://analytics.google.com',
    icon: '📊',
    category: 'analytics',
    isPremium: false,
    tags: ['web analytics', 'traffic', 'reports', 'insights']
  },
  {
    id: 'hotjar',
    name: 'Hotjar',
    description: 'Heatmaps, recordings and feedback tools',
    url: 'https://www.hotjar.com',
    icon: '🔥',
    category: 'analytics',
    isPremium: false,
    tags: ['heatmaps', 'recordings', 'user behavior']
  },
  {
    id: 'social-blade',
    name: 'Social Blade',
    description: 'Social media statistics and analytics',
    url: 'https://socialblade.com',
    icon: '📉',
    category: 'analytics',
    isPremium: false,
    tags: ['youtube', 'social media', 'statistics']
  },
  {
    id: 'semrush',
    name: 'SEMrush',
    description: 'SEO, content marketing and competitor analysis',
    url: 'https://www.semrush.com',
    icon: '🔍',
    category: 'analytics',
    isPremium: true,
    tags: ['seo', 'keywords', 'competitor', 'marketing']
  },
  {
    id: 'plausible',
    name: 'Plausible',
    description: 'Privacy-friendly Google Analytics alternative',
    url: 'https://plausible.io',
    icon: '🌱',
    category: 'analytics',
    isPremium: true,
    tags: ['privacy', 'analytics', 'simple', 'gdpr']
  },

  // Client Management
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Payment processing for internet businesses',
    url: 'https://stripe.com',
    icon: '💳',
    category: 'client-management',
    isPremium: false,
    tags: ['payments', 'invoicing', 'subscriptions']
  },
  {
    id: 'paypal',
    name: 'PayPal',
    description: 'Online payment system and invoicing',
    url: 'https://www.paypal.com',
    icon: '💰',
    category: 'client-management',
    isPremium: false,
    tags: ['payments', 'invoicing', 'international']
  },
  {
    id: 'freshbooks',
    name: 'FreshBooks',
    description: 'Invoicing and accounting for freelancers',
    url: 'https://www.freshbooks.com',
    icon: '📒',
    category: 'client-management',
    isPremium: true,
    tags: ['invoicing', 'accounting', 'freelancers']
  },
  {
    id: 'hubspot-crm',
    name: 'HubSpot CRM',
    description: 'Free CRM for managing contacts and deals',
    url: 'https://www.hubspot.com/products/crm',
    icon: '🎯',
    category: 'client-management',
    isPremium: false,
    tags: ['crm', 'contacts', 'sales', 'free']
  },
  {
    id: 'honeybook',
    name: 'HoneyBook',
    description: 'Client management for creatives',
    url: 'https://www.honeybook.com',
    icon: '🍯',
    category: 'client-management',
    isPremium: true,
    tags: ['contracts', 'invoicing', 'creatives']
  },

  // Development Tools
  {
    id: 'lovable',
    name: 'Lovable',
    description: 'AI-powered full-stack app builder',
    url: 'https://lovable.dev',
    icon: '💜',
    category: 'development',
    isPremium: false,
    tags: ['ai', 'no-code', 'full-stack', 'apps']
  },
  {
    id: 'bolt',
    name: 'Bolt.new',
    description: 'Instant full-stack web development in browser',
    url: 'https://bolt.new',
    icon: '⚡',
    category: 'development',
    isPremium: false,
    tags: ['ai', 'full-stack', 'instant', 'browser']
  },
  {
    id: 'cursor',
    name: 'Cursor',
    description: 'AI-first code editor built on VS Code',
    url: 'https://cursor.sh',
    icon: '🖱️',
    category: 'development',
    isPremium: false,
    tags: ['ai', 'code editor', 'vs code', 'coding']
  },
  {
    id: 'replit',
    name: 'Replit',
    description: 'Browser-based IDE with AI assistance',
    url: 'https://replit.com',
    icon: '💻',
    category: 'development',
    isPremium: false,
    tags: ['ide', 'browser', 'coding', 'collaboration']
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Code hosting and version control platform',
    url: 'https://github.com',
    icon: '🐙',
    category: 'development',
    isPremium: false,
    tags: ['git', 'version control', 'open source', 'collaboration']
  },
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Deploy web applications instantly',
    url: 'https://vercel.com',
    icon: '▲',
    category: 'development',
    isPremium: false,
    tags: ['deployment', 'hosting', 'serverless', 'nextjs']
  },
  {
    id: 'expo',
    name: 'Expo',
    description: 'Create React Native apps quickly',
    url: 'https://expo.dev',
    icon: '📱',
    category: 'development',
    isPremium: false,
    tags: ['mobile', 'react native', 'apps', 'cross-platform']
  },
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Open source Firebase alternative',
    url: 'https://supabase.com',
    icon: '⚡',
    category: 'development',
    isPremium: false,
    tags: ['database', 'auth', 'backend', 'postgres']
  },

  // AI Tools
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    description: 'AI assistant for writing, coding, and more',
    url: 'https://chat.openai.com',
    icon: '🤖',
    category: 'ai-tools',
    isPremium: false,
    tags: ['ai', 'writing', 'coding', 'assistant']
  },
  {
    id: 'claude',
    name: 'Claude',
    description: 'Advanced AI assistant by Anthropic',
    url: 'https://claude.ai',
    icon: '🧠',
    category: 'ai-tools',
    isPremium: false,
    tags: ['ai', 'writing', 'analysis', 'assistant']
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    description: 'AI image generation platform',
    url: 'https://www.midjourney.com',
    icon: '🎨',
    category: 'ai-tools',
    isPremium: true,
    tags: ['ai', 'images', 'art', 'generation']
  },
  {
    id: 'leonardo-ai',
    name: 'Leonardo.ai',
    description: 'AI image generation with fine control',
    url: 'https://leonardo.ai',
    icon: '🖼️',
    category: 'ai-tools',
    isPremium: false,
    tags: ['ai', 'images', 'art', 'free tier']
  },
  {
    id: 'runway',
    name: 'Runway',
    description: 'AI video generation and editing',
    url: 'https://runwayml.com',
    icon: '🎬',
    category: 'ai-tools',
    isPremium: true,
    tags: ['ai', 'video', 'generation', 'editing']
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Automate workflows between apps',
    url: 'https://zapier.com',
    icon: '⚡',
    category: 'ai-tools',
    isPremium: false,
    tags: ['automation', 'workflows', 'integration']
  },
  {
    id: 'make',
    name: 'Make (Integromat)',
    description: 'Visual automation platform',
    url: 'https://www.make.com',
    icon: '🔧',
    category: 'ai-tools',
    isPremium: false,
    tags: ['automation', 'visual', 'integration']
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    description: 'AI voice generation and cloning',
    url: 'https://elevenlabs.io',
    icon: '🎙️',
    category: 'ai-tools',
    isPremium: false,
    tags: ['ai', 'voice', 'text-to-speech', 'cloning']
  },

  // Design & Prototyping
  {
    id: 'figma',
    name: 'Figma',
    description: 'Collaborative design and prototyping tool',
    url: 'https://www.figma.com',
    icon: '🎨',
    category: 'design',
    isPremium: false,
    tags: ['design', 'prototyping', 'collaboration', 'ui/ux']
  },
  {
    id: 'framer',
    name: 'Framer',
    description: 'Design and publish websites visually',
    url: 'https://www.framer.com',
    icon: '✨',
    category: 'design',
    isPremium: false,
    tags: ['website', 'design', 'no-code', 'publish']
  },
  {
    id: 'adobe-xd',
    name: 'Adobe XD',
    description: 'UI/UX design and prototyping',
    url: 'https://www.adobe.com/products/xd.html',
    icon: '💠',
    category: 'design',
    isPremium: true,
    tags: ['ui/ux', 'prototyping', 'adobe', 'design']
  },
  {
    id: 'photopea',
    name: 'Photopea',
    description: 'Free online photo editor like Photoshop',
    url: 'https://www.photopea.com',
    icon: '🖌️',
    category: 'design',
    isPremium: false,
    tags: ['photo editing', 'free', 'photoshop', 'browser']
  },
  {
    id: 'remove-bg',
    name: 'Remove.bg',
    description: 'Remove image backgrounds automatically',
    url: 'https://www.remove.bg',
    icon: '✂️',
    category: 'design',
    isPremium: false,
    tags: ['background removal', 'ai', 'quick', 'free']
  },

  // Productivity
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Task management and to-do lists',
    url: 'https://todoist.com',
    icon: '✅',
    category: 'productivity',
    isPremium: false,
    tags: ['tasks', 'to-do', 'productivity', 'organization']
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    description: 'Knowledge base and note-taking',
    url: 'https://obsidian.md',
    icon: '💎',
    category: 'productivity',
    isPremium: false,
    tags: ['notes', 'knowledge', 'markdown', 'linking']
  },
  {
    id: 'loom',
    name: 'Loom',
    description: 'Quick video messaging for work',
    url: 'https://www.loom.com',
    icon: '🎥',
    category: 'productivity',
    isPremium: false,
    tags: ['video', 'messaging', 'screen recording', 'async']
  },
  {
    id: 'grammarly',
    name: 'Grammarly',
    description: 'AI writing assistant for grammar and style',
    url: 'https://www.grammarly.com',
    icon: '📝',
    category: 'productivity',
    isPremium: false,
    tags: ['writing', 'grammar', 'ai', 'proofreading']
  },
  {
    id: '1password',
    name: '1Password',
    description: 'Password manager for teams and individuals',
    url: 'https://1password.com',
    icon: '🔐',
    category: 'productivity',
    isPremium: true,
    tags: ['passwords', 'security', 'team', 'management']
  },
];

export function getToolsByCategory(category: ToolCategory): LearningTool[] {
  return learningTools.filter(tool => tool.category === category);
}

export function getFreeTools(): LearningTool[] {
  return learningTools.filter(tool => !tool.isPremium);
}

export function searchTools(query: string): LearningTool[] {
  const lowerQuery = query.toLowerCase();
  return learningTools.filter(tool => 
    tool.name.toLowerCase().includes(lowerQuery) ||
    tool.description.toLowerCase().includes(lowerQuery) ||
    tool.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
