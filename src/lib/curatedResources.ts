// Curated free learning resources for Nigerian freelancers
// No API costs - static database of verified resources

export interface CuratedResource {
  id: string;
  title: string;
  description: string;
  url: string;
  platform: 'YouTube' | 'freeCodeCamp' | 'Coursera' | 'Udemy' | 'LinkedIn Learning' | 'Other';
  category: string;
  subcategory: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  isFree: boolean;
  thumbnail?: string;
  tags: string[];
}

export const skillCategories = [
  {
    id: 'web-development',
    name: 'Web Development',
    icon: '💻',
    description: 'Build websites and web applications',
    subcategories: ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'WordPress', 'PHP']
  },
  {
    id: 'mobile-development',
    name: 'Mobile Development',
    icon: '📱',
    description: 'Create iOS and Android apps',
    subcategories: ['Flutter', 'React Native', 'Android', 'iOS']
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design',
    icon: '🎨',
    description: 'Visual design and branding',
    subcategories: ['Canva', 'Adobe Photoshop', 'Illustrator', 'Logo Design', 'UI/UX']
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    icon: '📈',
    description: 'Grow brands online',
    subcategories: ['Social Media Marketing', 'SEO', 'Content Marketing', 'Email Marketing', 'Google Ads']
  },
  {
    id: 'writing',
    name: 'Writing & Content',
    icon: '✍️',
    description: 'Copywriting and content creation',
    subcategories: ['Copywriting', 'Blog Writing', 'Technical Writing', 'SEO Writing']
  },
  {
    id: 'video-editing',
    name: 'Video & Animation',
    icon: '🎬',
    description: 'Video production and editing',
    subcategories: ['Video Editing', 'Motion Graphics', 'YouTube', 'TikTok Content']
  },
  {
    id: 'data-analysis',
    name: 'Data & Analytics',
    icon: '📊',
    description: 'Work with data and insights',
    subcategories: ['Excel', 'Python', 'SQL', 'Power BI', 'Google Analytics']
  },
  {
    id: 'virtual-assistant',
    name: 'Virtual Assistance',
    icon: '🗂️',
    description: 'Remote administrative support',
    subcategories: ['Admin Tasks', 'Customer Service', 'Project Management', 'Data Entry']
  }
];

export const curatedResources: CuratedResource[] = [
  // Web Development
  {
    id: 'fcc-html-css',
    title: 'HTML & CSS Full Course',
    description: 'Learn HTML and CSS from scratch. Perfect for beginners starting web development.',
    url: 'https://www.youtube.com/watch?v=mU6anWqZJcc',
    platform: 'YouTube',
    category: 'web-development',
    subcategory: 'HTML/CSS',
    duration: '11 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['html', 'css', 'web design', 'frontend']
  },
  {
    id: 'fcc-javascript',
    title: 'JavaScript Full Course for Beginners',
    description: 'Complete JavaScript tutorial covering fundamentals to advanced concepts.',
    url: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
    platform: 'YouTube',
    category: 'web-development',
    subcategory: 'JavaScript',
    duration: '3.5 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['javascript', 'programming', 'frontend']
  },
  {
    id: 'fcc-react',
    title: 'React JS Full Course 2024',
    description: 'Learn React from zero to hero. Build modern web applications.',
    url: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    platform: 'YouTube',
    category: 'web-development',
    subcategory: 'React',
    duration: '12 hours',
    level: 'Intermediate',
    language: 'English',
    isFree: true,
    tags: ['react', 'javascript', 'frontend', 'spa']
  },
  {
    id: 'fcc-nodejs',
    title: 'Node.js Full Course',
    description: 'Backend development with Node.js and Express.',
    url: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
    platform: 'YouTube',
    category: 'web-development',
    subcategory: 'Node.js',
    duration: '8 hours',
    level: 'Intermediate',
    language: 'English',
    isFree: true,
    tags: ['nodejs', 'backend', 'api', 'javascript']
  },
  {
    id: 'wp-beginners',
    title: 'WordPress Complete Tutorial',
    description: 'Build websites without coding using WordPress.',
    url: 'https://www.youtube.com/watch?v=kYY88h5J86A',
    platform: 'YouTube',
    category: 'web-development',
    subcategory: 'WordPress',
    duration: '4 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['wordpress', 'cms', 'no-code', 'website']
  },
  
  // Graphic Design
  {
    id: 'canva-masterclass',
    title: 'Canva Design Masterclass',
    description: 'Create professional designs using Canva. Perfect for social media graphics.',
    url: 'https://www.youtube.com/watch?v=zJSLMFzVt6M',
    platform: 'YouTube',
    category: 'graphic-design',
    subcategory: 'Canva',
    duration: '2 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['canva', 'design', 'social media', 'graphics']
  },
  {
    id: 'figma-ui',
    title: 'Figma UI/UX Design Tutorial',
    description: 'Learn UI/UX design with Figma from scratch.',
    url: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8',
    platform: 'YouTube',
    category: 'graphic-design',
    subcategory: 'UI/UX',
    duration: '3 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['figma', 'ui', 'ux', 'design', 'prototype']
  },
  {
    id: 'photoshop-basics',
    title: 'Adobe Photoshop for Beginners',
    description: 'Master Photoshop essentials for photo editing and design.',
    url: 'https://www.youtube.com/watch?v=IyR_uYsRdPs',
    platform: 'YouTube',
    category: 'graphic-design',
    subcategory: 'Adobe Photoshop',
    duration: '2.5 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['photoshop', 'adobe', 'photo editing', 'design']
  },
  
  // Digital Marketing
  {
    id: 'smm-complete',
    title: 'Social Media Marketing Full Course',
    description: 'Complete guide to marketing on Instagram, Facebook, Twitter, and LinkedIn.',
    url: 'https://www.youtube.com/watch?v=9rDpfxU6yZs',
    platform: 'YouTube',
    category: 'digital-marketing',
    subcategory: 'Social Media Marketing',
    duration: '6 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['social media', 'marketing', 'instagram', 'facebook']
  },
  {
    id: 'seo-complete',
    title: 'SEO Full Course for Beginners',
    description: 'Learn search engine optimization to rank websites on Google.',
    url: 'https://www.youtube.com/watch?v=xsVTqzratPs',
    platform: 'YouTube',
    category: 'digital-marketing',
    subcategory: 'SEO',
    duration: '4 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['seo', 'google', 'search', 'ranking']
  },
  {
    id: 'google-ads',
    title: 'Google Ads Tutorial 2024',
    description: 'Run profitable Google Ads campaigns for businesses.',
    url: 'https://www.youtube.com/watch?v=3d8omWEvSPo',
    platform: 'YouTube',
    category: 'digital-marketing',
    subcategory: 'Google Ads',
    duration: '3 hours',
    level: 'Intermediate',
    language: 'English',
    isFree: true,
    tags: ['google ads', 'ppc', 'advertising', 'marketing']
  },
  
  // Writing
  {
    id: 'copywriting-basics',
    title: 'Copywriting for Beginners',
    description: 'Write persuasive copy that sells. Essential for freelance writers.',
    url: 'https://www.youtube.com/watch?v=RSbfz4lU1Ak',
    platform: 'YouTube',
    category: 'writing',
    subcategory: 'Copywriting',
    duration: '1.5 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['copywriting', 'writing', 'sales', 'content']
  },
  {
    id: 'content-writing',
    title: 'Content Writing Masterclass',
    description: 'Create engaging blog posts and articles that drive traffic.',
    url: 'https://www.youtube.com/watch?v=vLyNxNvnWQk',
    platform: 'YouTube',
    category: 'writing',
    subcategory: 'Blog Writing',
    duration: '2 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['content', 'blog', 'writing', 'articles']
  },
  
  // Video Editing
  {
    id: 'capcut-editing',
    title: 'CapCut Video Editing Tutorial',
    description: 'Free mobile video editing for TikTok and Instagram Reels.',
    url: 'https://www.youtube.com/watch?v=vG8MfhJNxZI',
    platform: 'YouTube',
    category: 'video-editing',
    subcategory: 'Video Editing',
    duration: '30 mins',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['capcut', 'video editing', 'tiktok', 'reels']
  },
  {
    id: 'premiere-pro',
    title: 'Adobe Premiere Pro for Beginners',
    description: 'Professional video editing with Premiere Pro.',
    url: 'https://www.youtube.com/watch?v=Hls3Tp7JS8E',
    platform: 'YouTube',
    category: 'video-editing',
    subcategory: 'Video Editing',
    duration: '4 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['premiere pro', 'adobe', 'video editing', 'professional']
  },
  
  // Data Analysis
  {
    id: 'excel-complete',
    title: 'Excel Full Course for Beginners',
    description: 'Master Microsoft Excel from basics to advanced formulas.',
    url: 'https://www.youtube.com/watch?v=Vl0H-qTclOg',
    platform: 'YouTube',
    category: 'data-analysis',
    subcategory: 'Excel',
    duration: '7 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['excel', 'spreadsheet', 'data', 'formulas']
  },
  {
    id: 'python-data',
    title: 'Python for Data Analysis',
    description: 'Learn Python for data science and analytics.',
    url: 'https://www.youtube.com/watch?v=GPVsHOlRBBI',
    platform: 'YouTube',
    category: 'data-analysis',
    subcategory: 'Python',
    duration: '6 hours',
    level: 'Intermediate',
    language: 'English',
    isFree: true,
    tags: ['python', 'data analysis', 'pandas', 'data science']
  },
  
  // Virtual Assistant
  {
    id: 'va-guide',
    title: 'Virtual Assistant Complete Guide',
    description: 'Start your career as a virtual assistant. In-demand remote skill.',
    url: 'https://www.youtube.com/watch?v=5SYPjKqfwMs',
    platform: 'YouTube',
    category: 'virtual-assistant',
    subcategory: 'Admin Tasks',
    duration: '1 hour',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['virtual assistant', 'remote work', 'admin', 'freelance']
  },
  {
    id: 'project-management',
    title: 'Project Management Fundamentals',
    description: 'Learn project management skills with free tools.',
    url: 'https://www.youtube.com/watch?v=uWPIsaYpY7U',
    platform: 'YouTube',
    category: 'virtual-assistant',
    subcategory: 'Project Management',
    duration: '2 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['project management', 'trello', 'asana', 'organization']
  },
  
  // Mobile Development
  {
    id: 'flutter-complete',
    title: 'Flutter Complete Course',
    description: 'Build iOS and Android apps with one codebase using Flutter.',
    url: 'https://www.youtube.com/watch?v=VPvVD8t02U8',
    platform: 'YouTube',
    category: 'mobile-development',
    subcategory: 'Flutter',
    duration: '37 hours',
    level: 'Beginner',
    language: 'English',
    isFree: true,
    tags: ['flutter', 'dart', 'mobile', 'ios', 'android']
  },
  {
    id: 'react-native',
    title: 'React Native Full Course',
    description: 'Build mobile apps using React Native and JavaScript.',
    url: 'https://www.youtube.com/watch?v=obH0Po_RdWk',
    platform: 'YouTube',
    category: 'mobile-development',
    subcategory: 'React Native',
    duration: '4 hours',
    level: 'Intermediate',
    language: 'English',
    isFree: true,
    tags: ['react native', 'mobile', 'javascript', 'app']
  }
];

export const getResourcesByCategory = (categoryId: string): CuratedResource[] => {
  return curatedResources.filter(r => r.category === categoryId);
};

export const getResourcesByLevel = (level: 'Beginner' | 'Intermediate' | 'Advanced'): CuratedResource[] => {
  return curatedResources.filter(r => r.level === level);
};

export const searchResources = (query: string): CuratedResource[] => {
  const lowerQuery = query.toLowerCase();
  return curatedResources.filter(r => 
    r.title.toLowerCase().includes(lowerQuery) ||
    r.description.toLowerCase().includes(lowerQuery) ||
    r.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    r.subcategory.toLowerCase().includes(lowerQuery)
  );
};
