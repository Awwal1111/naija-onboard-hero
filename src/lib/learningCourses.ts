// Comprehensive Learning Hub Courses for Nigerian Freelancers
// Includes AI Learning, Vibe Coding, and all major skill categories

export interface LearningCourse {
  id: string;
  title: string;
  description: string;
  category: string;
  subcategory: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
  durationMinutes: number;
  thumbnail: string;
  videoUrl: string;
  sections: CourseSection[];
  practicalTask: PracticalTask;
  tags: string[];
  instructor: string;
  isFree: boolean;
}

export interface CourseSection {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  durationMinutes: number;
  quizQuestions: QuizQuestion[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false';
  options: { text: string; isCorrect: boolean }[];
  explanation: string;
}

export interface PracticalTask {
  title: string;
  description: string;
  instructions: string;
  submissionTypes: ('text' | 'url' | 'screenshot' | 'file')[];
  exampleSubmission: string;
}

export const learningCategories = [
  {
    id: 'ai-learning',
    name: 'AI & Machine Learning',
    icon: '🤖',
    description: 'Master AI tools and automation for the future',
    subcategories: ['ChatGPT Mastery', 'AI Image Generation', 'AI Automation', 'Prompt Engineering', 'AI for Business']
  },
  {
    id: 'vibe-coding',
    name: 'Vibe Coding',
    icon: '✨',
    description: 'Build apps without traditional coding using AI tools',
    subcategories: ['Lovable.dev', 'Cursor AI', 'Bolt.new', 'V0.dev', 'No-Code AI Apps']
  },
  {
    id: 'web-development',
    name: 'Web Development',
    icon: '💻',
    description: 'Build websites and web applications',
    subcategories: ['HTML/CSS', 'JavaScript', 'React', 'Node.js', 'WordPress', 'PHP', 'Tailwind CSS']
  },
  {
    id: 'mobile-development',
    name: 'Mobile Development',
    icon: '📱',
    description: 'Create iOS and Android apps',
    subcategories: ['Flutter', 'React Native', 'Android', 'iOS', 'PWA']
  },
  {
    id: 'graphic-design',
    name: 'Graphic Design',
    icon: '🎨',
    description: 'Visual design and branding',
    subcategories: ['Canva', 'Adobe Photoshop', 'Illustrator', 'Logo Design', 'UI/UX', 'Figma', 'Brand Identity']
  },
  {
    id: 'digital-marketing',
    name: 'Digital Marketing',
    icon: '📈',
    description: 'Grow brands online',
    subcategories: ['Social Media Marketing', 'SEO', 'Content Marketing', 'Email Marketing', 'Google Ads', 'Facebook Ads', 'Analytics']
  },
  {
    id: 'writing',
    name: 'Writing & Content',
    icon: '✍️',
    description: 'Copywriting and content creation',
    subcategories: ['Copywriting', 'Blog Writing', 'Technical Writing', 'SEO Writing', 'Scriptwriting', 'Email Marketing Copy']
  },
  {
    id: 'video-editing',
    name: 'Video & Animation',
    icon: '🎬',
    description: 'Video production and editing',
    subcategories: ['Video Editing', 'Motion Graphics', 'YouTube', 'TikTok Content', 'After Effects', 'DaVinci Resolve']
  },
  {
    id: 'data-analysis',
    name: 'Data & Analytics',
    icon: '📊',
    description: 'Work with data and insights',
    subcategories: ['Excel', 'Python', 'SQL', 'Power BI', 'Google Analytics', 'Tableau', 'Data Visualization']
  },
  {
    id: 'virtual-assistant',
    name: 'Virtual Assistance',
    icon: '🗂️',
    description: 'Remote administrative support',
    subcategories: ['Admin Tasks', 'Customer Service', 'Project Management', 'Data Entry', 'Calendar Management']
  },
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    icon: '🛒',
    description: 'Build and manage online stores',
    subcategories: ['Shopify', 'WooCommerce', 'Dropshipping', 'Product Photography', 'Inventory Management']
  },
  {
    id: 'finance',
    name: 'Finance & Accounting',
    icon: '💰',
    description: 'Financial skills for freelancers',
    subcategories: ['Bookkeeping', 'QuickBooks', 'Invoice Management', 'Tax Basics', 'Financial Planning']
  }
];

// Comprehensive course library with working videos
export const learningCourses: LearningCourse[] = [
  // ==================== AI & MACHINE LEARNING ====================
  {
    id: 'chatgpt-mastery-beginner',
    title: 'ChatGPT Mastery for Beginners',
    description: 'Learn to use ChatGPT effectively for work, business, and personal productivity. Master prompt engineering from scratch.',
    category: 'ai-learning',
    subcategory: 'ChatGPT Mastery',
    level: 'Beginner',
    duration: '2 hours',
    durationMinutes: 120,
    thumbnail: 'https://img.youtube.com/vi/JTxsNm9IdYU/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=JTxsNm9IdYU',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['chatgpt', 'ai', 'productivity', 'prompts'],
    sections: [
      {
        id: 'chatgpt-intro',
        title: 'Introduction to ChatGPT',
        description: 'Understanding what ChatGPT is and how it works',
        videoUrl: 'https://www.youtube.com/watch?v=JTxsNm9IdYU&t=0s',
        durationMinutes: 20,
        quizQuestions: [
          {
            id: 'q1',
            question: 'What type of AI model is ChatGPT?',
            type: 'multiple_choice',
            options: [
              { text: 'Image generation model', isCorrect: false },
              { text: 'Large Language Model (LLM)', isCorrect: true },
              { text: 'Voice recognition model', isCorrect: false },
              { text: 'Video processing model', isCorrect: false }
            ],
            explanation: 'ChatGPT is a Large Language Model (LLM) designed to understand and generate human-like text.'
          },
          {
            id: 'q2',
            question: 'ChatGPT can access real-time internet information.',
            type: 'true_false',
            options: [
              { text: 'True', isCorrect: false },
              { text: 'False', isCorrect: true }
            ],
            explanation: 'ChatGPT has a knowledge cutoff date and cannot access real-time internet information unless using plugins or browsing features.'
          }
        ]
      },
      {
        id: 'chatgpt-prompts',
        title: 'Effective Prompt Writing',
        description: 'Learn how to write prompts that get the best results',
        videoUrl: 'https://www.youtube.com/watch?v=JTxsNm9IdYU&t=1200s',
        durationMinutes: 30,
        quizQuestions: [
          {
            id: 'q3',
            question: 'Which is the BEST way to write a prompt for ChatGPT?',
            type: 'multiple_choice',
            options: [
              { text: '"Write something good"', isCorrect: false },
              { text: '"Write a 500-word blog post about digital marketing for small businesses in Nigeria, targeting beginners"', isCorrect: true },
              { text: '"Blog post"', isCorrect: false },
              { text: '"Marketing"', isCorrect: false }
            ],
            explanation: 'Specific, detailed prompts with context, length, topic, and target audience get the best results.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Create a Business Use Case',
      description: 'Use ChatGPT to solve a real business problem',
      instructions: 'Write 5 different prompts for a Nigerian small business (e.g., restaurant, fashion store, or tech startup). Show the prompts and the results you got from ChatGPT.',
      submissionTypes: ['text', 'screenshot'],
      exampleSubmission: 'Prompt 1: "Write a WhatsApp broadcast message for my restaurant announcing a new Jollof rice special for ₦1,500. Target young professionals in Lagos."'
    }
  },
  {
    id: 'chatgpt-advanced',
    title: 'Advanced ChatGPT & Prompt Engineering',
    description: 'Master advanced techniques including chain-of-thought prompting, role-playing, and building AI workflows.',
    category: 'ai-learning',
    subcategory: 'Prompt Engineering',
    level: 'Intermediate',
    duration: '3 hours',
    durationMinutes: 180,
    thumbnail: 'https://img.youtube.com/vi/mBYu5NoXBcs/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=mBYu5NoXBcs',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['chatgpt', 'prompt engineering', 'advanced ai', 'automation'],
    sections: [
      {
        id: 'advanced-techniques',
        title: 'Advanced Prompting Techniques',
        description: 'Chain-of-thought, few-shot learning, and role-playing',
        videoUrl: 'https://www.youtube.com/watch?v=mBYu5NoXBcs&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'adv-q1',
            question: 'What is "chain-of-thought" prompting?',
            type: 'multiple_choice',
            options: [
              { text: 'Asking multiple questions in one prompt', isCorrect: false },
              { text: 'Asking the AI to explain its reasoning step by step', isCorrect: true },
              { text: 'Creating a long prompt with many details', isCorrect: false },
              { text: 'Repeating the same prompt multiple times', isCorrect: false }
            ],
            explanation: 'Chain-of-thought prompting asks the AI to show its reasoning process step by step, which often leads to better and more accurate answers.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build an AI Workflow',
      description: 'Create a multi-step AI workflow for a business process',
      instructions: 'Design a 3-step AI workflow that automates a business task. For example: (1) Generate customer questions, (2) Create FAQ responses, (3) Format for website. Document each step with prompts and results.',
      submissionTypes: ['text', 'url'],
      exampleSubmission: 'Created a content workflow: Step 1 - Generate blog ideas → Step 2 - Outline best idea → Step 3 - Write full article'
    }
  },
  {
    id: 'ai-image-generation',
    title: 'AI Image Generation Masterclass',
    description: 'Learn to create stunning images using Midjourney, DALL-E, and Leonardo AI for business and creative projects.',
    category: 'ai-learning',
    subcategory: 'AI Image Generation',
    level: 'Beginner',
    duration: '2.5 hours',
    durationMinutes: 150,
    thumbnail: 'https://img.youtube.com/vi/u2KwvNWcOU0/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=u2KwvNWcOU0',
    instructor: 'Runway',
    isFree: true,
    tags: ['midjourney', 'dalle', 'ai art', 'image generation'],
    sections: [
      {
        id: 'ai-image-basics',
        title: 'Understanding AI Image Generation',
        description: 'How AI creates images from text prompts',
        videoUrl: 'https://www.youtube.com/watch?v=u2KwvNWcOU0&t=0s',
        durationMinutes: 30,
        quizQuestions: [
          {
            id: 'img-q1',
            question: 'What is the main input required for AI image generation?',
            type: 'multiple_choice',
            options: [
              { text: 'An existing image', isCorrect: false },
              { text: 'A text description (prompt)', isCorrect: true },
              { text: 'Audio recording', isCorrect: false },
              { text: 'Video file', isCorrect: false }
            ],
            explanation: 'AI image generators primarily work by converting text descriptions (prompts) into visual images.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Create a Brand Visual',
      description: 'Generate AI images for a Nigerian brand',
      instructions: 'Create 3 AI-generated images for a fictional Nigerian business (e.g., a Lagos restaurant, Abuja tech startup, or fashion brand). Submit the prompts you used and the final images.',
      submissionTypes: ['screenshot', 'text'],
      exampleSubmission: 'Created product images for a Lagos smoothie bar using prompt: "Fresh fruit smoothie, tropical setting, vibrant Nigerian colors, professional food photography"'
    }
  },
  {
    id: 'ai-automation-zapier',
    title: 'AI Automation with Zapier & Make',
    description: 'Automate your business workflows by connecting AI tools with other apps using Zapier and Make (Integromat).',
    category: 'ai-learning',
    subcategory: 'AI Automation',
    level: 'Intermediate',
    duration: '4 hours',
    durationMinutes: 240,
    thumbnail: 'https://img.youtube.com/vi/XJfELJoALhA/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=XJfELJoALhA',
    instructor: 'Zapier',
    isFree: true,
    tags: ['automation', 'zapier', 'make', 'workflow', 'productivity'],
    sections: [
      {
        id: 'automation-intro',
        title: 'Introduction to No-Code Automation',
        description: 'Understanding automation and its business benefits',
        videoUrl: 'https://www.youtube.com/watch?v=XJfELJoALhA&t=0s',
        durationMinutes: 40,
        quizQuestions: [
          {
            id: 'auto-q1',
            question: 'What is a "Zap" in Zapier?',
            type: 'multiple_choice',
            options: [
              { text: 'A type of payment', isCorrect: false },
              { text: 'An automated workflow connecting apps', isCorrect: true },
              { text: 'A coding language', isCorrect: false },
              { text: 'A social media post', isCorrect: false }
            ],
            explanation: 'A Zap is an automated workflow in Zapier that connects different apps and triggers actions based on specific events.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build an Automation',
      description: 'Create a working automation workflow',
      instructions: 'Using Zapier free tier or Make, create an automation that: (1) Triggers from a form submission or email, (2) Processes data with AI or formatting, (3) Sends output to another app. Screenshot your Zap/Scenario and explain what it does.',
      submissionTypes: ['screenshot', 'text', 'url'],
      exampleSubmission: 'Created a Zap: Google Form submission → OpenAI summarizes response → Slack notification to team'
    }
  },

  // ==================== VIBE CODING ====================
  {
    id: 'lovable-basics',
    title: 'Build Apps with Lovable.dev',
    description: 'Create full-stack web applications using just natural language. No coding experience needed - just describe what you want!',
    category: 'vibe-coding',
    subcategory: 'Lovable.dev',
    level: 'Beginner',
    duration: '3 hours',
    durationMinutes: 180,
    thumbnail: 'https://img.youtube.com/vi/WgjH5WBApMI/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=WgjH5WBApMI',
    instructor: 'Lovable',
    isFree: true,
    tags: ['lovable', 'vibe coding', 'no-code', 'ai development', 'apps'],
    sections: [
      {
        id: 'lovable-intro',
        title: 'Introduction to Vibe Coding',
        description: 'Understanding the future of app development with AI',
        videoUrl: 'https://www.youtube.com/watch?v=WgjH5WBApMI&t=0s',
        durationMinutes: 30,
        quizQuestions: [
          {
            id: 'vibe-q1',
            question: 'What is "Vibe Coding"?',
            type: 'multiple_choice',
            options: [
              { text: 'A new programming language', isCorrect: false },
              { text: 'Building apps by describing what you want in natural language', isCorrect: true },
              { text: 'A type of music coding', isCorrect: false },
              { text: 'Traditional coding with better tools', isCorrect: false }
            ],
            explanation: 'Vibe Coding is building software by describing what you want in plain English, and AI generates the code for you.'
          },
          {
            id: 'vibe-q2',
            question: 'You need programming experience to use Lovable.dev.',
            type: 'true_false',
            options: [
              { text: 'True', isCorrect: false },
              { text: 'False', isCorrect: true }
            ],
            explanation: 'Lovable.dev is designed for non-developers. You describe what you want in plain English, and the AI builds it for you.'
          }
        ]
      },
      {
        id: 'lovable-first-app',
        title: 'Building Your First App',
        description: 'Step-by-step guide to creating your first application',
        videoUrl: 'https://www.youtube.com/watch?v=WgjH5WBApMI&t=1800s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'vibe-q3',
            question: 'What is the BEST way to describe an app to Lovable?',
            type: 'multiple_choice',
            options: [
              { text: '"Make an app"', isCorrect: false },
              { text: '"Create a task management app with a dashboard showing pending tasks, completed tasks counter, and ability to add new tasks with due dates"', isCorrect: true },
              { text: '"Task manager"', isCorrect: false },
              { text: '"Something for tasks"', isCorrect: false }
            ],
            explanation: 'Being specific about features, layout, and functionality helps the AI understand exactly what you want to build.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a Simple App',
      description: 'Create a working application using Lovable.dev',
      instructions: 'Build a simple app for a Nigerian use case (e.g., expense tracker in Naira, local business directory, or event listing for Lagos). Share the live link to your app and describe what you built.',
      submissionTypes: ['url', 'text', 'screenshot'],
      exampleSubmission: 'Built a Lagos event finder app: https://myapp.lovable.app - Users can browse upcoming events, filter by category, and save favorites.'
    }
  },
  {
    id: 'cursor-ai-coding',
    title: 'Cursor AI: Code with AI Assistance',
    description: 'Learn to use Cursor, the AI-powered code editor that helps you write code faster with natural language.',
    category: 'vibe-coding',
    subcategory: 'Cursor AI',
    level: 'Intermediate',
    duration: '2.5 hours',
    durationMinutes: 150,
    thumbnail: 'https://img.youtube.com/vi/gqUQbjsYZLQ/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=gqUQbjsYZLQ',
    instructor: 'Cursor',
    isFree: true,
    tags: ['cursor', 'ai coding', 'developer tools', 'productivity'],
    sections: [
      {
        id: 'cursor-setup',
        title: 'Setting Up Cursor',
        description: 'Installing and configuring Cursor for maximum productivity',
        videoUrl: 'https://www.youtube.com/watch?v=gqUQbjsYZLQ&t=0s',
        durationMinutes: 20,
        quizQuestions: [
          {
            id: 'cursor-q1',
            question: 'Cursor is based on which popular code editor?',
            type: 'multiple_choice',
            options: [
              { text: 'Sublime Text', isCorrect: false },
              { text: 'VS Code', isCorrect: true },
              { text: 'Atom', isCorrect: false },
              { text: 'Notepad++', isCorrect: false }
            ],
            explanation: 'Cursor is built on top of VS Code, so it has all the same features plus AI-powered coding assistance.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build with Cursor',
      description: 'Create a project using Cursor AI features',
      instructions: 'Use Cursor to build a simple web page or script. Document how you used the AI features (Cmd+K, Chat, etc.) and show before/after of AI-assisted code changes.',
      submissionTypes: ['screenshot', 'text', 'url'],
      exampleSubmission: 'Used Cursor to build a landing page. Cmd+K generated responsive navbar, Chat helped debug CSS issues.'
    }
  },
  {
    id: 'bolt-new-apps',
    title: 'Bolt.new: Instant Full-Stack Apps',
    description: 'Build and deploy full-stack applications instantly with Bolt.new. Create React apps, APIs, and databases from prompts.',
    category: 'vibe-coding',
    subcategory: 'Bolt.new',
    level: 'Beginner',
    duration: '2 hours',
    durationMinutes: 120,
    thumbnail: 'https://img.youtube.com/vi/A_tPb01Zs4w/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=A_tPb01Zs4w',
    instructor: 'StackBlitz',
    isFree: true,
    tags: ['bolt', 'full-stack', 'instant apps', 'deployment'],
    sections: [
      {
        id: 'bolt-intro',
        title: 'Getting Started with Bolt.new',
        description: 'Understanding how Bolt creates full-stack apps',
        videoUrl: 'https://www.youtube.com/watch?v=A_tPb01Zs4w&t=0s',
        durationMinutes: 25,
        quizQuestions: [
          {
            id: 'bolt-q1',
            question: 'Bolt.new can create which type of applications?',
            type: 'multiple_choice',
            options: [
              { text: 'Only frontend websites', isCorrect: false },
              { text: 'Full-stack applications with backend and database', isCorrect: true },
              { text: 'Only mobile apps', isCorrect: false },
              { text: 'Only static pages', isCorrect: false }
            ],
            explanation: 'Bolt.new creates complete full-stack applications including frontend, backend logic, and database integration.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Deploy an App with Bolt',
      description: 'Create and deploy a working application',
      instructions: 'Use Bolt.new to create and deploy a simple application (e.g., a contact form, quiz app, or portfolio). Share the deployed URL and explain what you built.',
      submissionTypes: ['url', 'text'],
      exampleSubmission: 'Created a Nigerian quiz app about local trivia: https://myquiz.bolt.new'
    }
  },

  // ==================== WEB DEVELOPMENT ====================
  {
    id: 'html-css-complete',
    title: 'HTML & CSS Complete Course',
    description: 'Learn the fundamentals of web development. Build responsive websites from scratch using HTML5 and CSS3.',
    category: 'web-development',
    subcategory: 'HTML/CSS',
    level: 'Beginner',
    duration: '11 hours',
    durationMinutes: 660,
    thumbnail: 'https://img.youtube.com/vi/mU6anWqZJcc/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=mU6anWqZJcc',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['html', 'css', 'web design', 'frontend', 'responsive'],
    sections: [
      {
        id: 'html-basics',
        title: 'HTML Fundamentals',
        description: 'Understanding HTML structure and elements',
        videoUrl: 'https://www.youtube.com/watch?v=mU6anWqZJcc&t=0s',
        durationMinutes: 120,
        quizQuestions: [
          {
            id: 'html-q1',
            question: 'What does HTML stand for?',
            type: 'multiple_choice',
            options: [
              { text: 'Hyper Text Markup Language', isCorrect: true },
              { text: 'High Tech Modern Language', isCorrect: false },
              { text: 'Home Tool Markup Language', isCorrect: false },
              { text: 'Hyperlinks and Text Markup Language', isCorrect: false }
            ],
            explanation: 'HTML stands for Hyper Text Markup Language, the standard markup language for creating web pages.'
          },
          {
            id: 'html-q2',
            question: 'The <head> section of an HTML document contains content visible to users.',
            type: 'true_false',
            options: [
              { text: 'True', isCorrect: false },
              { text: 'False', isCorrect: true }
            ],
            explanation: 'The <head> section contains metadata like title, styles, and scripts. Visible content goes in the <body> section.'
          }
        ]
      },
      {
        id: 'css-styling',
        title: 'CSS Styling',
        description: 'Making websites beautiful with CSS',
        videoUrl: 'https://www.youtube.com/watch?v=mU6anWqZJcc&t=7200s',
        durationMinutes: 180,
        quizQuestions: [
          {
            id: 'css-q1',
            question: 'Which CSS property changes the text color?',
            type: 'multiple_choice',
            options: [
              { text: 'background-color', isCorrect: false },
              { text: 'color', isCorrect: true },
              { text: 'font-color', isCorrect: false },
              { text: 'text-color', isCorrect: false }
            ],
            explanation: 'The "color" property in CSS is used to set the color of text content.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a Personal Website',
      description: 'Create a responsive personal portfolio page',
      instructions: 'Build a personal portfolio website with: (1) Header with your name, (2) About section, (3) Skills section, (4) Contact information. Make it mobile-responsive. Upload to GitHub Pages or Netlify.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Built my portfolio: https://myname.github.io - Includes responsive design and smooth scrolling'
    }
  },
  {
    id: 'javascript-complete',
    title: 'JavaScript Full Course for Beginners',
    description: 'Master JavaScript from zero to confident. Learn variables, functions, DOM manipulation, and modern ES6+ features.',
    category: 'web-development',
    subcategory: 'JavaScript',
    level: 'Beginner',
    duration: '8 hours',
    durationMinutes: 480,
    thumbnail: 'https://img.youtube.com/vi/PkZNo7MFNFg/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['javascript', 'programming', 'frontend', 'web development'],
    sections: [
      {
        id: 'js-basics',
        title: 'JavaScript Basics',
        description: 'Variables, data types, and operators',
        videoUrl: 'https://www.youtube.com/watch?v=PkZNo7MFNFg&t=0s',
        durationMinutes: 90,
        quizQuestions: [
          {
            id: 'js-q1',
            question: 'Which keyword is used to declare a variable that can be reassigned?',
            type: 'multiple_choice',
            options: [
              { text: 'const', isCorrect: false },
              { text: 'let', isCorrect: true },
              { text: 'var', isCorrect: false },
              { text: 'define', isCorrect: false }
            ],
            explanation: '"let" is used to declare variables that can be reassigned. "const" is for constants that cannot be reassigned.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Interactive Calculator',
      description: 'Build a working calculator with JavaScript',
      instructions: 'Create a web-based calculator that can perform: addition, subtraction, multiplication, and division. Include a clear button and display area. Submit a link to your working calculator.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Built calculator with keyboard support: https://codepen.io/myname/calculator'
    }
  },
  {
    id: 'react-complete-2024',
    title: 'React.js Full Course 2024',
    description: 'Learn React from scratch. Build modern single-page applications with hooks, state management, and API integration.',
    category: 'web-development',
    subcategory: 'React',
    level: 'Intermediate',
    duration: '12 hours',
    durationMinutes: 720,
    thumbnail: 'https://img.youtube.com/vi/bMknfKXIFA8/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=bMknfKXIFA8',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['react', 'javascript', 'frontend', 'spa', 'hooks'],
    sections: [
      {
        id: 'react-fundamentals',
        title: 'React Fundamentals',
        description: 'Components, JSX, and props',
        videoUrl: 'https://www.youtube.com/watch?v=bMknfKXIFA8&t=0s',
        durationMinutes: 120,
        quizQuestions: [
          {
            id: 'react-q1',
            question: 'What is JSX in React?',
            type: 'multiple_choice',
            options: [
              { text: 'A database query language', isCorrect: false },
              { text: 'A syntax extension that allows HTML-like code in JavaScript', isCorrect: true },
              { text: 'A testing framework', isCorrect: false },
              { text: 'A CSS preprocessor', isCorrect: false }
            ],
            explanation: 'JSX is a syntax extension that lets you write HTML-like markup inside JavaScript, making React components more readable.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a React App',
      description: 'Create a functional React application',
      instructions: 'Build a simple React app with at least 3 components (e.g., a task list, weather app, or product gallery). Use useState and props. Deploy to Vercel or Netlify.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Built a Nigerian food recipe app: https://recipes.vercel.app'
    }
  },
  {
    id: 'tailwind-css-2024',
    title: 'Tailwind CSS Complete Guide',
    description: 'Master Tailwind CSS and build beautiful, responsive websites faster than ever with utility-first CSS.',
    category: 'web-development',
    subcategory: 'Tailwind CSS',
    level: 'Beginner',
    duration: '4 hours',
    durationMinutes: 240,
    thumbnail: 'https://img.youtube.com/vi/ft30zcMlFao/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=ft30zcMlFao',
    instructor: 'Traversy Media',
    isFree: true,
    tags: ['tailwind', 'css', 'utility-first', 'responsive design'],
    sections: [
      {
        id: 'tailwind-basics',
        title: 'Tailwind Fundamentals',
        description: 'Understanding utility-first CSS approach',
        videoUrl: 'https://www.youtube.com/watch?v=ft30zcMlFao&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'tw-q1',
            question: 'What is "utility-first" CSS?',
            type: 'multiple_choice',
            options: [
              { text: 'Writing all CSS in one file', isCorrect: false },
              { text: 'Using small, single-purpose classes to build designs', isCorrect: true },
              { text: 'Only using utility bills for payment', isCorrect: false },
              { text: 'A backend development approach', isCorrect: false }
            ],
            explanation: 'Utility-first CSS uses small, single-purpose classes like "text-center" or "bg-blue-500" to build designs directly in HTML.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Tailwind Landing Page',
      description: 'Build a complete landing page with Tailwind',
      instructions: 'Create a responsive landing page for a Nigerian startup using only Tailwind CSS classes. Include: hero section, features grid, testimonials, and footer.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Built fintech landing page with Tailwind: https://fintechng.vercel.app'
    }
  },
  {
    id: 'nodejs-complete',
    title: 'Node.js Full Course',
    description: 'Learn server-side JavaScript with Node.js. Build REST APIs, work with databases, and deploy backend applications.',
    category: 'web-development',
    subcategory: 'Node.js',
    level: 'Intermediate',
    duration: '8 hours',
    durationMinutes: 480,
    thumbnail: 'https://img.youtube.com/vi/Oe421EPjeBE/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['nodejs', 'backend', 'api', 'javascript', 'server'],
    sections: [
      {
        id: 'node-basics',
        title: 'Node.js Basics',
        description: 'Understanding Node.js and NPM',
        videoUrl: 'https://www.youtube.com/watch?v=Oe421EPjeBE&t=0s',
        durationMinutes: 90,
        quizQuestions: [
          {
            id: 'node-q1',
            question: 'What is Node.js?',
            type: 'multiple_choice',
            options: [
              { text: 'A frontend framework', isCorrect: false },
              { text: 'A JavaScript runtime for running JS outside browsers', isCorrect: true },
              { text: 'A database system', isCorrect: false },
              { text: 'A CSS framework', isCorrect: false }
            ],
            explanation: 'Node.js is a JavaScript runtime that allows you to run JavaScript code outside of web browsers, typically for server-side development.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a REST API',
      description: 'Create a working REST API with Node.js',
      instructions: 'Build a simple REST API with endpoints for: GET all items, GET single item, POST new item, DELETE item. Use Express.js and test with Postman or Insomnia.',
      submissionTypes: ['url', 'text', 'screenshot'],
      exampleSubmission: 'Built products API: https://api.myapp.com - GET/POST/DELETE endpoints for Nigerian products'
    }
  },

  // ==================== DIGITAL MARKETING ====================
  {
    id: 'social-media-marketing-complete',
    title: 'Social Media Marketing Masterclass',
    description: 'Master marketing on Instagram, Facebook, Twitter/X, LinkedIn, and TikTok. Learn content strategy, paid ads, and analytics.',
    category: 'digital-marketing',
    subcategory: 'Social Media Marketing',
    level: 'Beginner',
    duration: '6 hours',
    durationMinutes: 360,
    thumbnail: 'https://img.youtube.com/vi/9rDpfxU6yZs/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=9rDpfxU6yZs',
    instructor: 'Simplilearn',
    isFree: true,
    tags: ['social media', 'marketing', 'instagram', 'facebook', 'tiktok'],
    sections: [
      {
        id: 'smm-strategy',
        title: 'Social Media Strategy',
        description: 'Building an effective social media strategy',
        videoUrl: 'https://www.youtube.com/watch?v=9rDpfxU6yZs&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'smm-q1',
            question: 'What should you define FIRST when creating a social media strategy?',
            type: 'multiple_choice',
            options: [
              { text: 'The design of your posts', isCorrect: false },
              { text: 'Your goals and target audience', isCorrect: true },
              { text: 'Which platform to use', isCorrect: false },
              { text: 'How often to post', isCorrect: false }
            ],
            explanation: 'Defining your goals and target audience should come first, as this determines everything else in your strategy.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Create a Content Calendar',
      description: 'Design a 30-day content calendar',
      instructions: 'Create a 30-day content calendar for a Nigerian business on Instagram. Include: post types (educational, promotional, engagement), captions, hashtags, and best posting times for Nigerian audience.',
      submissionTypes: ['file', 'screenshot', 'url'],
      exampleSubmission: 'Created content calendar for Lagos restaurant with 30 posts covering food content, behind-the-scenes, and customer testimonials.'
    }
  },
  {
    id: 'seo-complete-2024',
    title: 'SEO Complete Course 2024',
    description: 'Learn search engine optimization from keyword research to technical SEO. Rank websites on Google and drive organic traffic.',
    category: 'digital-marketing',
    subcategory: 'SEO',
    level: 'Beginner',
    duration: '5 hours',
    durationMinutes: 300,
    thumbnail: 'https://img.youtube.com/vi/xsVTqzratPs/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=xsVTqzratPs',
    instructor: 'Ahrefs',
    isFree: true,
    tags: ['seo', 'google', 'search', 'ranking', 'keywords'],
    sections: [
      {
        id: 'seo-fundamentals',
        title: 'SEO Fundamentals',
        description: 'Understanding how search engines work',
        videoUrl: 'https://www.youtube.com/watch?v=xsVTqzratPs&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'seo-q1',
            question: 'What is the primary goal of SEO?',
            type: 'multiple_choice',
            options: [
              { text: 'To make a website look better', isCorrect: false },
              { text: 'To improve a website\'s visibility in search engine results', isCorrect: true },
              { text: 'To add more content to a website', isCorrect: false },
              { text: 'To increase social media followers', isCorrect: false }
            ],
            explanation: 'SEO aims to improve a website\'s visibility in organic (non-paid) search engine results, driving more traffic.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'SEO Audit & Keyword Research',
      description: 'Perform SEO analysis on a real website',
      instructions: 'Choose a Nigerian business website and perform: (1) Basic SEO audit (title tags, meta descriptions, headings), (2) Keyword research for 10 relevant keywords, (3) Recommendations for improvement.',
      submissionTypes: ['text', 'file'],
      exampleSubmission: 'Audited jumia.com.ng - Found missing meta descriptions on 5 pages, identified 10 high-volume Nigerian keywords.'
    }
  },
  {
    id: 'google-ads-2024',
    title: 'Google Ads Complete Tutorial 2024',
    description: 'Master Google Ads from setup to optimization. Create search, display, and video campaigns that drive results.',
    category: 'digital-marketing',
    subcategory: 'Google Ads',
    level: 'Intermediate',
    duration: '4 hours',
    durationMinutes: 240,
    thumbnail: 'https://img.youtube.com/vi/3d8omWEvSPo/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=3d8omWEvSPo',
    instructor: 'Google',
    isFree: true,
    tags: ['google ads', 'ppc', 'advertising', 'sem'],
    sections: [
      {
        id: 'google-ads-setup',
        title: 'Setting Up Google Ads',
        description: 'Creating your first campaign',
        videoUrl: 'https://www.youtube.com/watch?v=3d8omWEvSPo&t=0s',
        durationMinutes: 50,
        quizQuestions: [
          {
            id: 'gads-q1',
            question: 'What is the Google Ads bidding model called?',
            type: 'multiple_choice',
            options: [
              { text: 'Cost-per-view (CPV)', isCorrect: false },
              { text: 'Pay-per-click (PPC)', isCorrect: true },
              { text: 'Cost-per-mile (CPM)', isCorrect: false },
              { text: 'Pay-per-impression (PPI)', isCorrect: false }
            ],
            explanation: 'Google Ads primarily uses Pay-per-click (PPC) model where you pay when someone clicks your ad.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Design a Google Ads Campaign',
      description: 'Create a complete campaign plan',
      instructions: 'Design a Google Ads campaign for a Nigerian business: (1) Define target audience, (2) Research 10 keywords with estimated costs, (3) Write 3 ad copies, (4) Set hypothetical budget and expected results.',
      submissionTypes: ['text', 'file'],
      exampleSubmission: 'Designed campaign for Lagos delivery service targeting "food delivery Lagos" with ₦50,000 monthly budget.'
    }
  },
  {
    id: 'facebook-ads-masterclass',
    title: 'Facebook & Instagram Ads Masterclass',
    description: 'Learn to create and optimize Facebook and Instagram ad campaigns. Master targeting, creative, and conversion tracking.',
    category: 'digital-marketing',
    subcategory: 'Facebook Ads',
    level: 'Intermediate',
    duration: '5 hours',
    durationMinutes: 300,
    thumbnail: 'https://img.youtube.com/vi/RFEQ_Yt26c4/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=RFEQ_Yt26c4',
    instructor: 'Santrel Media',
    isFree: true,
    tags: ['facebook ads', 'instagram ads', 'meta', 'advertising'],
    sections: [
      {
        id: 'fb-ads-basics',
        title: 'Facebook Ads Fundamentals',
        description: 'Understanding the Meta advertising platform',
        videoUrl: 'https://www.youtube.com/watch?v=RFEQ_Yt26c4&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'fb-q1',
            question: 'What is the Facebook Pixel used for?',
            type: 'multiple_choice',
            options: [
              { text: 'To design ads', isCorrect: false },
              { text: 'To track conversions and retarget website visitors', isCorrect: true },
              { text: 'To schedule posts', isCorrect: false },
              { text: 'To moderate comments', isCorrect: false }
            ],
            explanation: 'The Facebook Pixel is a code that tracks user actions on your website, enabling conversion tracking and retargeting.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Create Facebook Ad Campaign Plan',
      description: 'Design a complete Facebook advertising strategy',
      instructions: 'Create a Facebook/Instagram ad campaign plan for a Nigerian e-commerce brand: (1) Define campaign objective, (2) Create audience targeting, (3) Design ad mockup, (4) Plan budget allocation.',
      submissionTypes: ['text', 'screenshot', 'file'],
      exampleSubmission: 'Created campaign for Nigerian fashion brand targeting women 18-35 in Lagos/Abuja with conversion objective.'
    }
  },

  // ==================== GRAPHIC DESIGN ====================
  {
    id: 'canva-masterclass-2024',
    title: 'Canva Design Masterclass 2024',
    description: 'Create professional designs using Canva. Perfect for social media graphics, presentations, and marketing materials.',
    category: 'graphic-design',
    subcategory: 'Canva',
    level: 'Beginner',
    duration: '3 hours',
    durationMinutes: 180,
    thumbnail: 'https://img.youtube.com/vi/zJSLMFzVt6M/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=zJSLMFzVt6M',
    instructor: 'Canva',
    isFree: true,
    tags: ['canva', 'design', 'social media', 'graphics'],
    sections: [
      {
        id: 'canva-basics',
        title: 'Canva Basics',
        description: 'Getting started with Canva',
        videoUrl: 'https://www.youtube.com/watch?v=zJSLMFzVt6M&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'canva-q1',
            question: 'Canva requires graphic design software installation.',
            type: 'true_false',
            options: [
              { text: 'True', isCorrect: false },
              { text: 'False', isCorrect: true }
            ],
            explanation: 'Canva is a web-based tool that works in your browser. No software installation required.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Social Media Design Kit',
      description: 'Create a complete social media design package',
      instructions: 'Create a social media design kit for a Nigerian brand: (1) 3 Instagram post templates, (2) 1 Instagram story template, (3) 1 Facebook cover. Use consistent branding.',
      submissionTypes: ['screenshot', 'file', 'url'],
      exampleSubmission: 'Created design kit for Nigerian tech startup with green/gold color scheme.'
    }
  },
  {
    id: 'figma-ui-ux-2024',
    title: 'Figma UI/UX Design Complete Course',
    description: 'Master Figma for UI/UX design. Learn to design apps, websites, and create interactive prototypes.',
    category: 'graphic-design',
    subcategory: 'Figma',
    level: 'Beginner',
    duration: '6 hours',
    durationMinutes: 360,
    thumbnail: 'https://img.youtube.com/vi/FTFaQWZBqQ8/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8',
    instructor: 'DesignCourse',
    isFree: true,
    tags: ['figma', 'ui', 'ux', 'design', 'prototype'],
    sections: [
      {
        id: 'figma-fundamentals',
        title: 'Figma Fundamentals',
        description: 'Understanding Figma interface and tools',
        videoUrl: 'https://www.youtube.com/watch?v=FTFaQWZBqQ8&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'figma-q1',
            question: 'What is a "Frame" in Figma?',
            type: 'multiple_choice',
            options: [
              { text: 'A picture frame decoration', isCorrect: false },
              { text: 'A container for design elements, like an artboard', isCorrect: true },
              { text: 'A type of animation', isCorrect: false },
              { text: 'A collaboration feature', isCorrect: false }
            ],
            explanation: 'A Frame in Figma is a container for design elements, similar to artboards in other design tools.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Design a Mobile App Screen',
      description: 'Create a complete app screen design',
      instructions: 'Design a mobile app screen for a Nigerian service (e.g., food delivery, fintech, or transport). Include: navigation, main content area, and call-to-action buttons. Export as PNG and share Figma link.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Designed POS payment app screen: https://figma.com/file/xxx'
    }
  },
  {
    id: 'photoshop-advanced',
    title: 'Adobe Photoshop Complete Course',
    description: 'Master Photoshop for photo editing, manipulation, and graphic design. From basics to advanced techniques.',
    category: 'graphic-design',
    subcategory: 'Adobe Photoshop',
    level: 'Intermediate',
    duration: '8 hours',
    durationMinutes: 480,
    thumbnail: 'https://img.youtube.com/vi/IyR_uYsRdPs/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=IyR_uYsRdPs',
    instructor: 'Envato Tuts+',
    isFree: true,
    tags: ['photoshop', 'adobe', 'photo editing', 'design', 'manipulation'],
    sections: [
      {
        id: 'ps-basics',
        title: 'Photoshop Basics',
        description: 'Understanding Photoshop workspace and tools',
        videoUrl: 'https://www.youtube.com/watch?v=IyR_uYsRdPs&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'ps-q1',
            question: 'What is a "Layer" in Photoshop?',
            type: 'multiple_choice',
            options: [
              { text: 'A type of filter', isCorrect: false },
              { text: 'A separate level of an image that can be edited independently', isCorrect: true },
              { text: 'A brush type', isCorrect: false },
              { text: 'An export format', isCorrect: false }
            ],
            explanation: 'Layers allow you to work on individual parts of an image without affecting other elements.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Photo Editing Project',
      description: 'Complete a professional photo editing task',
      instructions: 'Take a photo and apply professional editing: (1) Color correction, (2) Background removal or replacement, (3) Add text/logo overlay. Show before and after.',
      submissionTypes: ['screenshot', 'file'],
      exampleSubmission: 'Edited product photos for online store with background removal and color enhancement.'
    }
  },

  // ==================== DATA & ANALYTICS ====================
  {
    id: 'excel-complete-2024',
    title: 'Microsoft Excel Complete Course',
    description: 'Master Excel from basics to advanced. Formulas, pivot tables, charts, and data analysis for business.',
    category: 'data-analysis',
    subcategory: 'Excel',
    level: 'Beginner',
    duration: '7 hours',
    durationMinutes: 420,
    thumbnail: 'https://img.youtube.com/vi/Vl0H-qTclOg/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=Vl0H-qTclOg',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['excel', 'spreadsheet', 'data', 'formulas', 'business'],
    sections: [
      {
        id: 'excel-basics',
        title: 'Excel Fundamentals',
        description: 'Understanding Excel interface and basic functions',
        videoUrl: 'https://www.youtube.com/watch?v=Vl0H-qTclOg&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'excel-q1',
            question: 'Which function calculates the sum of a range of cells?',
            type: 'multiple_choice',
            options: [
              { text: 'ADD()', isCorrect: false },
              { text: 'SUM()', isCorrect: true },
              { text: 'TOTAL()', isCorrect: false },
              { text: 'PLUS()', isCorrect: false }
            ],
            explanation: 'The SUM() function adds up all numbers in a specified range of cells.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Business Report with Excel',
      description: 'Create a complete business analysis',
      instructions: 'Create an Excel report with: (1) Sales data for 6 months, (2) Formulas calculating totals, averages, and growth %, (3) A chart visualizing the data, (4) Pivot table summary.',
      submissionTypes: ['file', 'screenshot'],
      exampleSubmission: 'Created sales analysis for Nigerian retail business with charts and 3 pivot tables.'
    }
  },
  {
    id: 'python-data-analysis',
    title: 'Python for Data Analysis',
    description: 'Learn Python for data science. Pandas, NumPy, and data visualization for analyzing real-world datasets.',
    category: 'data-analysis',
    subcategory: 'Python',
    level: 'Intermediate',
    duration: '9 hours',
    durationMinutes: 540,
    thumbnail: 'https://img.youtube.com/vi/GPVsHOlRBBI/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=GPVsHOlRBBI',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['python', 'data analysis', 'pandas', 'data science'],
    sections: [
      {
        id: 'python-data-basics',
        title: 'Python for Data Basics',
        description: 'Setting up Python and understanding data structures',
        videoUrl: 'https://www.youtube.com/watch?v=GPVsHOlRBBI&t=0s',
        durationMinutes: 90,
        quizQuestions: [
          {
            id: 'py-data-q1',
            question: 'Which Python library is most commonly used for data manipulation?',
            type: 'multiple_choice',
            options: [
              { text: 'Django', isCorrect: false },
              { text: 'Pandas', isCorrect: true },
              { text: 'Flask', isCorrect: false },
              { text: 'Requests', isCorrect: false }
            ],
            explanation: 'Pandas is the go-to library for data manipulation and analysis in Python.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Data Analysis Project',
      description: 'Analyze a real dataset with Python',
      instructions: 'Find a Nigerian-related dataset (e.g., from Kaggle or data.gov.ng). Use Python to: (1) Clean the data, (2) Perform basic analysis, (3) Create visualizations, (4) Draw insights.',
      submissionTypes: ['url', 'file'],
      exampleSubmission: 'Analyzed Nigerian population data with Pandas - Created charts showing growth trends.'
    }
  },
  {
    id: 'sql-complete',
    title: 'SQL Complete Course',
    description: 'Master SQL for database management. Learn to query, insert, update, and analyze data in databases.',
    category: 'data-analysis',
    subcategory: 'SQL',
    level: 'Beginner',
    duration: '4 hours',
    durationMinutes: 240,
    thumbnail: 'https://img.youtube.com/vi/HXV3zeQKqGY/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['sql', 'database', 'queries', 'data'],
    sections: [
      {
        id: 'sql-basics',
        title: 'SQL Fundamentals',
        description: 'Understanding databases and basic queries',
        videoUrl: 'https://www.youtube.com/watch?v=HXV3zeQKqGY&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'sql-q1',
            question: 'Which SQL command is used to retrieve data from a database?',
            type: 'multiple_choice',
            options: [
              { text: 'GET', isCorrect: false },
              { text: 'SELECT', isCorrect: true },
              { text: 'FETCH', isCorrect: false },
              { text: 'READ', isCorrect: false }
            ],
            explanation: 'SELECT is the primary SQL command for retrieving data from database tables.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Database Queries Project',
      description: 'Write SQL queries for business scenarios',
      instructions: 'Using SQLite or an online SQL playground, create a simple database for a Nigerian business and write 10 queries: SELECT with WHERE, JOIN two tables, GROUP BY, ORDER BY, etc.',
      submissionTypes: ['text', 'screenshot'],
      exampleSubmission: 'Created customer database for Lagos restaurant with 10 queries for sales analysis.'
    }
  },

  // ==================== VIDEO & ANIMATION ====================
  {
    id: 'video-editing-premiere',
    title: 'Adobe Premiere Pro Complete Course',
    description: 'Learn professional video editing with Premiere Pro. Edit YouTube videos, commercials, and films like a pro.',
    category: 'video-editing',
    subcategory: 'Video Editing',
    level: 'Beginner',
    duration: '8 hours',
    durationMinutes: 480,
    thumbnail: 'https://img.youtube.com/vi/Hls3Tp7JS8E/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=Hls3Tp7JS8E',
    instructor: 'Premiere Gal',
    isFree: true,
    tags: ['premiere pro', 'video editing', 'adobe', 'youtube'],
    sections: [
      {
        id: 'premiere-basics',
        title: 'Premiere Pro Basics',
        description: 'Understanding the editing workspace',
        videoUrl: 'https://www.youtube.com/watch?v=Hls3Tp7JS8E&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'premiere-q1',
            question: 'What is a "timeline" in video editing?',
            type: 'multiple_choice',
            options: [
              { text: 'A schedule for editing', isCorrect: false },
              { text: 'The area where you arrange and edit video clips', isCorrect: true },
              { text: 'A list of video files', isCorrect: false },
              { text: 'An export setting', isCorrect: false }
            ],
            explanation: 'The timeline is where you arrange, trim, and edit your video clips in sequence.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Edit a Short Video',
      description: 'Create a complete edited video',
      instructions: 'Record or gather footage and edit a 1-2 minute video: (1) Use cuts and transitions, (2) Add background music, (3) Include text/titles, (4) Color correct. Upload to YouTube unlisted.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Edited promo video for Lagos restaurant: https://youtube.com/watch?v=xxx'
    }
  },
  {
    id: 'capcut-mobile-editing',
    title: 'CapCut Mobile Video Editing',
    description: 'Master free video editing on your phone. Create TikTok, Reels, and YouTube Shorts content with CapCut.',
    category: 'video-editing',
    subcategory: 'TikTok Content',
    level: 'Beginner',
    duration: '2 hours',
    durationMinutes: 120,
    thumbnail: 'https://img.youtube.com/vi/vG8MfhJNxZI/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=vG8MfhJNxZI',
    instructor: 'Think Media',
    isFree: true,
    tags: ['capcut', 'mobile editing', 'tiktok', 'reels', 'shorts'],
    sections: [
      {
        id: 'capcut-basics',
        title: 'CapCut Essentials',
        description: 'Getting started with mobile editing',
        videoUrl: 'https://www.youtube.com/watch?v=vG8MfhJNxZI&t=0s',
        durationMinutes: 30,
        quizQuestions: [
          {
            id: 'capcut-q1',
            question: 'CapCut is a paid video editing app.',
            type: 'true_false',
            options: [
              { text: 'True', isCorrect: false },
              { text: 'False', isCorrect: true }
            ],
            explanation: 'CapCut is a free video editing app by ByteDance (TikTok) with powerful features.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Create a Viral-Style Video',
      description: 'Make a trending short-form video',
      instructions: 'Create a 15-30 second video using CapCut with: (1) Trending transitions, (2) Text overlays, (3) Music sync, (4) Effects. Focus on Nigerian content that could go viral.',
      submissionTypes: ['url', 'file'],
      exampleSubmission: 'Created "Day in Lagos" video with trending transitions and Afrobeats soundtrack.'
    }
  },

  // ==================== ADVANCED COURSES ====================
  {
    id: 'fullstack-web-advanced',
    title: 'Full-Stack Web Development Bootcamp',
    description: 'Complete full-stack development: React frontend, Node.js backend, database design, deployment, and best practices.',
    category: 'web-development',
    subcategory: 'React',
    level: 'Advanced',
    duration: '20 hours',
    durationMinutes: 1200,
    thumbnail: 'https://img.youtube.com/vi/nu_pCVPKzTk/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=nu_pCVPKzTk',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['fullstack', 'react', 'nodejs', 'mern', 'advanced'],
    sections: [
      {
        id: 'fullstack-overview',
        title: 'Full-Stack Architecture',
        description: 'Understanding full-stack application design',
        videoUrl: 'https://www.youtube.com/watch?v=nu_pCVPKzTk&t=0s',
        durationMinutes: 120,
        quizQuestions: [
          {
            id: 'fs-q1',
            question: 'What does MERN stack stand for?',
            type: 'multiple_choice',
            options: [
              { text: 'MongoDB, Express, React, Node.js', isCorrect: true },
              { text: 'MySQL, Express, React, Nginx', isCorrect: false },
              { text: 'MongoDB, Electron, Redux, Next.js', isCorrect: false },
              { text: 'MySQL, EJS, REST, Node.js', isCorrect: false }
            ],
            explanation: 'MERN stands for MongoDB, Express.js, React, and Node.js - a popular full-stack JavaScript solution.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a Full-Stack Application',
      description: 'Create a complete application from scratch',
      instructions: 'Build a complete application with: (1) User authentication, (2) CRUD operations, (3) Database storage, (4) Deployment to production. Example: task manager, blog, or e-commerce.',
      submissionTypes: ['url', 'text'],
      exampleSubmission: 'Built job board for Nigerian freelancers: https://naijajobs.vercel.app with auth and database.'
    }
  },
  {
    id: 'advanced-seo',
    title: 'Advanced SEO & Content Strategy',
    description: 'Master advanced SEO techniques including technical SEO, link building, content strategy, and enterprise SEO.',
    category: 'digital-marketing',
    subcategory: 'SEO',
    level: 'Advanced',
    duration: '6 hours',
    durationMinutes: 360,
    thumbnail: 'https://img.youtube.com/vi/SnxeXZpZkI0/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=SnxeXZpZkI0',
    instructor: 'Ahrefs',
    isFree: true,
    tags: ['advanced seo', 'technical seo', 'link building', 'content strategy'],
    sections: [
      {
        id: 'technical-seo',
        title: 'Technical SEO Deep Dive',
        description: 'Advanced technical optimization strategies',
        videoUrl: 'https://www.youtube.com/watch?v=SnxeXZpZkI0&t=0s',
        durationMinutes: 90,
        quizQuestions: [
          {
            id: 'adv-seo-q1',
            question: 'What is "schema markup" in SEO?',
            type: 'multiple_choice',
            options: [
              { text: 'A type of backlink', isCorrect: false },
              { text: 'Structured data that helps search engines understand content', isCorrect: true },
              { text: 'A website design pattern', isCorrect: false },
              { text: 'A keyword research tool', isCorrect: false }
            ],
            explanation: 'Schema markup is structured data code that helps search engines better understand and display your content.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Complete SEO Strategy',
      description: 'Develop an advanced SEO plan',
      instructions: 'Create a comprehensive 6-month SEO strategy for a Nigerian business: (1) Technical audit, (2) Content calendar, (3) Link building plan, (4) Competitor analysis, (5) KPIs and tracking.',
      submissionTypes: ['file', 'text'],
      exampleSubmission: 'Created enterprise SEO strategy for Nigerian fintech with 50-page playbook.'
    }
  },
  {
    id: 'advanced-ai-agents',
    title: 'Building AI Agents & Automations',
    description: 'Learn to build sophisticated AI agents using GPT, Claude, and automation platforms. Create autonomous workflows.',
    category: 'ai-learning',
    subcategory: 'AI Automation',
    level: 'Advanced',
    duration: '5 hours',
    durationMinutes: 300,
    thumbnail: 'https://img.youtube.com/vi/TRjq7t2Ms5I/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=TRjq7t2Ms5I',
    instructor: 'AI Jason',
    isFree: true,
    tags: ['ai agents', 'gpt', 'automation', 'langchain', 'advanced'],
    sections: [
      {
        id: 'ai-agents-intro',
        title: 'Understanding AI Agents',
        description: 'What are AI agents and how do they work',
        videoUrl: 'https://www.youtube.com/watch?v=TRjq7t2Ms5I&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'agent-q1',
            question: 'What distinguishes an AI agent from a simple chatbot?',
            type: 'multiple_choice',
            options: [
              { text: 'Agents can browse the internet', isCorrect: false },
              { text: 'Agents can take actions and make decisions autonomously', isCorrect: true },
              { text: 'Agents are more expensive', isCorrect: false },
              { text: 'Agents only work offline', isCorrect: false }
            ],
            explanation: 'AI agents can take autonomous actions, make decisions, and execute multi-step tasks without constant human input.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build an AI Agent',
      description: 'Create a functional AI agent',
      instructions: 'Build an AI agent that can: (1) Receive a task, (2) Break it into steps, (3) Execute actions (API calls, web browsing), (4) Return results. Document your agent architecture.',
      submissionTypes: ['text', 'url', 'screenshot'],
      exampleSubmission: 'Built customer support agent using GPT + Zapier that handles Nigerian customer inquiries automatically.'
    }
  },

  // ==================== MORE ADVANCED COURSES ====================
  {
    id: 'advanced-react-patterns',
    title: 'Advanced React Patterns & Performance',
    description: 'Master advanced React patterns, performance optimization, custom hooks, and state management for production apps.',
    category: 'web-development',
    subcategory: 'React',
    level: 'Advanced',
    duration: '10 hours',
    durationMinutes: 600,
    thumbnail: 'https://img.youtube.com/vi/MdvzlDIdQ0o/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=MdvzlDIdQ0o',
    instructor: 'Jack Herrington',
    isFree: true,
    tags: ['react', 'advanced', 'patterns', 'performance', 'hooks'],
    sections: [
      {
        id: 'react-patterns-intro',
        title: 'Advanced Component Patterns',
        description: 'Compound components, render props, and HOCs',
        videoUrl: 'https://www.youtube.com/watch?v=MdvzlDIdQ0o&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'adv-react-q1',
            question: 'What is the primary benefit of compound components?',
            type: 'multiple_choice',
            options: [
              { text: 'They are faster', isCorrect: false },
              { text: 'They provide implicit state sharing between related components', isCorrect: true },
              { text: 'They use less memory', isCorrect: false },
              { text: 'They are easier to style', isCorrect: false }
            ],
            explanation: 'Compound components share implicit state, allowing flexible API design like <Tabs> and <Tab> components.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a Component Library',
      description: 'Create reusable React components',
      instructions: 'Build a mini component library with: (1) A compound component (e.g., Accordion), (2) A custom hook, (3) A performance-optimized list component. Document usage examples.',
      submissionTypes: ['url', 'text'],
      exampleSubmission: 'Built NaijaUI library with Accordion, Modal, and useDebounce hook.'
    }
  },
  {
    id: 'typescript-advanced',
    title: 'Advanced TypeScript for Professionals',
    description: 'Master TypeScript generics, utility types, conditional types, and advanced patterns for large-scale applications.',
    category: 'web-development',
    subcategory: 'JavaScript',
    level: 'Advanced',
    duration: '6 hours',
    durationMinutes: 360,
    thumbnail: 'https://img.youtube.com/vi/wD5WGkOEJRs/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=wD5WGkOEJRs',
    instructor: 'Matt Pocock',
    isFree: true,
    tags: ['typescript', 'advanced', 'generics', 'types'],
    sections: [
      {
        id: 'ts-generics',
        title: 'Generics Deep Dive',
        description: 'Understanding and using TypeScript generics',
        videoUrl: 'https://www.youtube.com/watch?v=wD5WGkOEJRs&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'ts-q1',
            question: 'What do generics in TypeScript allow you to do?',
            type: 'multiple_choice',
            options: [
              { text: 'Write faster code', isCorrect: false },
              { text: 'Create reusable components that work with multiple types', isCorrect: true },
              { text: 'Skip type checking', isCorrect: false },
              { text: 'Access private variables', isCorrect: false }
            ],
            explanation: 'Generics let you write flexible, reusable code that maintains type safety across different types.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Type-Safe API Client',
      description: 'Build a fully typed API wrapper',
      instructions: 'Create a type-safe API client library that: (1) Uses generics for responses, (2) Has proper error typing, (3) Supports different HTTP methods. Show type inference in action.',
      submissionTypes: ['url', 'text'],
      exampleSubmission: 'Built typed REST client for Nigerian bank APIs with full autocomplete support.'
    }
  },
  {
    id: 'advanced-python-automation',
    title: 'Python Automation & Scripting',
    description: 'Automate everything with Python. Web scraping, file automation, APIs, and building productivity tools.',
    category: 'data-analysis',
    subcategory: 'Python',
    level: 'Advanced',
    duration: '8 hours',
    durationMinutes: 480,
    thumbnail: 'https://img.youtube.com/vi/PXMJ6FS7llk/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=PXMJ6FS7llk',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['python', 'automation', 'scripting', 'web scraping'],
    sections: [
      {
        id: 'python-automation-basics',
        title: 'Automation Fundamentals',
        description: 'Setting up Python for automation tasks',
        videoUrl: 'https://www.youtube.com/watch?v=PXMJ6FS7llk&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'py-auto-q1',
            question: 'Which library is commonly used for web scraping in Python?',
            type: 'multiple_choice',
            options: [
              { text: 'Flask', isCorrect: false },
              { text: 'BeautifulSoup', isCorrect: true },
              { text: 'NumPy', isCorrect: false },
              { text: 'TensorFlow', isCorrect: false }
            ],
            explanation: 'BeautifulSoup is a popular library for parsing HTML and extracting data from web pages.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build an Automation Script',
      description: 'Create a useful automation tool',
      instructions: 'Build a Python automation script that solves a real problem: (1) Web scraper for Nigerian job sites, (2) PDF invoice generator, or (3) Social media poster. Document and share.',
      submissionTypes: ['url', 'file', 'text'],
      exampleSubmission: 'Built scraper that collects Lagos property listings and exports to Excel daily.'
    }
  },
  {
    id: 'advanced-motion-graphics',
    title: 'After Effects Motion Graphics',
    description: 'Create professional motion graphics, animations, and visual effects for videos, ads, and social content.',
    category: 'video-editing',
    subcategory: 'After Effects',
    level: 'Advanced',
    duration: '12 hours',
    durationMinutes: 720,
    thumbnail: 'https://img.youtube.com/vi/ItvYmlFR6cU/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=ItvYmlFR6cU',
    instructor: 'Ben Marriott',
    isFree: true,
    tags: ['after effects', 'motion graphics', 'animation', 'vfx'],
    sections: [
      {
        id: 'ae-basics',
        title: 'After Effects Fundamentals',
        description: 'Understanding the After Effects interface',
        videoUrl: 'https://www.youtube.com/watch?v=ItvYmlFR6cU&t=0s',
        durationMinutes: 90,
        quizQuestions: [
          {
            id: 'ae-q1',
            question: 'What is a "keyframe" in After Effects?',
            type: 'multiple_choice',
            options: [
              { text: 'A type of layer', isCorrect: false },
              { text: 'A marker for animation changes over time', isCorrect: true },
              { text: 'An export setting', isCorrect: false },
              { text: 'A camera type', isCorrect: false }
            ],
            explanation: 'Keyframes mark specific points in time where you set property values, and After Effects animates between them.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Create a Motion Graphics Project',
      description: 'Design animated content',
      instructions: 'Create a 15-30 second motion graphics piece: (1) Logo animation, (2) Animated infographic, or (3) Social media ad. Export as MP4 and GIF.',
      submissionTypes: ['url', 'file'],
      exampleSubmission: 'Created animated logo reveal for Lagos fintech startup.'
    }
  },
  {
    id: 'advanced-copywriting',
    title: 'High-Converting Copywriting',
    description: 'Master the art of persuasive writing. Sales pages, email sequences, ads, and content that converts.',
    category: 'writing',
    subcategory: 'Copywriting',
    level: 'Advanced',
    duration: '5 hours',
    durationMinutes: 300,
    thumbnail: 'https://img.youtube.com/vi/RQMABvXfLQ4/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=RQMABvXfLQ4',
    instructor: 'Alex Cattoni',
    isFree: true,
    tags: ['copywriting', 'sales', 'marketing', 'persuasion'],
    sections: [
      {
        id: 'copy-fundamentals',
        title: 'Copywriting Psychology',
        description: 'Understanding buyer psychology',
        videoUrl: 'https://www.youtube.com/watch?v=RQMABvXfLQ4&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'copy-q1',
            question: 'What is the AIDA framework in copywriting?',
            type: 'multiple_choice',
            options: [
              { text: 'A software tool', isCorrect: false },
              { text: 'Attention, Interest, Desire, Action', isCorrect: true },
              { text: 'A font style', isCorrect: false },
              { text: 'An AI writing model', isCorrect: false }
            ],
            explanation: 'AIDA guides copy structure: grab Attention, build Interest, create Desire, prompt Action.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Write Converting Copy',
      description: 'Create a sales page',
      instructions: 'Write a complete sales page for a Nigerian product/service: (1) Headline, (2) Problem/solution, (3) Benefits, (4) Testimonials section, (5) Call to action.',
      submissionTypes: ['text', 'url'],
      exampleSubmission: 'Wrote landing page for Lagos coding bootcamp with 3 headline variations.'
    }
  },

  // ==================== MOBILE DEVELOPMENT ====================
  {
    id: 'flutter-complete',
    title: 'Flutter Complete Course 2024',
    description: 'Build beautiful cross-platform mobile apps with Flutter. One codebase for iOS and Android.',
    category: 'mobile-development',
    subcategory: 'Flutter',
    level: 'Beginner',
    duration: '12 hours',
    durationMinutes: 720,
    thumbnail: 'https://img.youtube.com/vi/VPvVD8t02U8/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=VPvVD8t02U8',
    instructor: 'freeCodeCamp',
    isFree: true,
    tags: ['flutter', 'dart', 'mobile', 'ios', 'android'],
    sections: [
      {
        id: 'flutter-intro',
        title: 'Flutter Fundamentals',
        description: 'Setting up Flutter and understanding widgets',
        videoUrl: 'https://www.youtube.com/watch?v=VPvVD8t02U8&t=0s',
        durationMinutes: 90,
        quizQuestions: [
          {
            id: 'flutter-q1',
            question: 'What programming language does Flutter use?',
            type: 'multiple_choice',
            options: [
              { text: 'JavaScript', isCorrect: false },
              { text: 'Dart', isCorrect: true },
              { text: 'Swift', isCorrect: false },
              { text: 'Kotlin', isCorrect: false }
            ],
            explanation: 'Flutter uses Dart, a language developed by Google that compiles to native code.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a Flutter App',
      description: 'Create a cross-platform mobile app',
      instructions: 'Build a Flutter app with: (1) Multiple screens, (2) Navigation, (3) API integration or local storage. Target Nigerian use case (POS, delivery, etc.).',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Built expense tracker app for Nigerian small businesses with MPesa integration.'
    }
  },
  {
    id: 'react-native-2024',
    title: 'React Native Full Course',
    description: 'Build native mobile apps using React. Share code between React web and mobile applications.',
    category: 'mobile-development',
    subcategory: 'React Native',
    level: 'Intermediate',
    duration: '10 hours',
    durationMinutes: 600,
    thumbnail: 'https://img.youtube.com/vi/obH0Po_RdWk/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=obH0Po_RdWk',
    instructor: 'Academind',
    isFree: true,
    tags: ['react native', 'mobile', 'react', 'javascript'],
    sections: [
      {
        id: 'rn-basics',
        title: 'React Native Basics',
        description: 'Core concepts and components',
        videoUrl: 'https://www.youtube.com/watch?v=obH0Po_RdWk&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'rn-q1',
            question: 'What is the main advantage of React Native over traditional mobile development?',
            type: 'multiple_choice',
            options: [
              { text: 'It is faster', isCorrect: false },
              { text: 'Write once, run on both iOS and Android', isCorrect: true },
              { text: 'It uses less battery', isCorrect: false },
              { text: 'It has better graphics', isCorrect: false }
            ],
            explanation: 'React Native lets you write one JavaScript codebase that runs natively on both iOS and Android.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Build a React Native App',
      description: 'Create a cross-platform app',
      instructions: 'Build a React Native app with: (1) Bottom tab navigation, (2) At least 3 screens, (3) API integration. Test on both Android and iOS simulators.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Built food delivery app UI with React Native for Lagos restaurants.'
    }
  },

  // ==================== VIRTUAL ASSISTANCE ====================
  {
    id: 'va-complete',
    title: 'Virtual Assistant Masterclass',
    description: 'Learn everything to become a successful virtual assistant. Admin tasks, tools, client management.',
    category: 'virtual-assistant',
    subcategory: 'Admin Tasks',
    level: 'Beginner',
    duration: '4 hours',
    durationMinutes: 240,
    thumbnail: 'https://img.youtube.com/vi/qOWG3pT4x2E/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=qOWG3pT4x2E',
    instructor: 'VA Bootcamp',
    isFree: true,
    tags: ['virtual assistant', 'admin', 'remote work', 'productivity'],
    sections: [
      {
        id: 'va-basics',
        title: 'Getting Started as a VA',
        description: 'Understanding the VA industry',
        videoUrl: 'https://www.youtube.com/watch?v=qOWG3pT4x2E&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'va-q1',
            question: 'What is a key skill for virtual assistants?',
            type: 'multiple_choice',
            options: [
              { text: 'Programming', isCorrect: false },
              { text: 'Time management and organization', isCorrect: true },
              { text: 'Video editing', isCorrect: false },
              { text: 'Graphic design', isCorrect: false }
            ],
            explanation: 'VAs need excellent organizational and time management skills to handle multiple clients and tasks.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'VA Portfolio',
      description: 'Create your VA service offering',
      instructions: 'Create a professional VA portfolio: (1) List your services, (2) Set your rates, (3) Create a sample work schedule, (4) Write client communication templates.',
      submissionTypes: ['text', 'file'],
      exampleSubmission: 'Created VA portfolio specializing in social media management for Nigerian businesses.'
    }
  },

  // ==================== E-COMMERCE ====================
  {
    id: 'shopify-complete',
    title: 'Shopify Store Complete Guide',
    description: 'Build and launch a profitable Shopify store. Product selection, design, marketing, and scaling.',
    category: 'ecommerce',
    subcategory: 'Shopify',
    level: 'Beginner',
    duration: '6 hours',
    durationMinutes: 360,
    thumbnail: 'https://img.youtube.com/vi/qXWcH5fOYsY/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=qXWcH5fOYsY',
    instructor: 'Learn With Shopify',
    isFree: true,
    tags: ['shopify', 'ecommerce', 'dropshipping', 'online store'],
    sections: [
      {
        id: 'shopify-setup',
        title: 'Setting Up Your Store',
        description: 'Creating your Shopify store from scratch',
        videoUrl: 'https://www.youtube.com/watch?v=qXWcH5fOYsY&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'shopify-q1',
            question: 'What is Shopify?',
            type: 'multiple_choice',
            options: [
              { text: 'A social media platform', isCorrect: false },
              { text: 'An e-commerce platform for building online stores', isCorrect: true },
              { text: 'A payment processor', isCorrect: false },
              { text: 'A shipping company', isCorrect: false }
            ],
            explanation: 'Shopify is a complete e-commerce platform that lets you create, manage, and scale an online store.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Launch a Store',
      description: 'Create a Shopify store',
      instructions: 'Set up a Shopify store (free trial): (1) Add 5+ products, (2) Customize theme, (3) Set up payment, (4) Create 2 collections. Share store link.',
      submissionTypes: ['url', 'screenshot'],
      exampleSubmission: 'Launched Ankara fashion store: fashionnaija.myshopify.com'
    }
  },
  {
    id: 'dropshipping-advanced',
    title: 'Advanced Dropshipping Strategies',
    description: 'Scale your dropshipping business. Supplier relations, automation, branding, and six-figure scaling.',
    category: 'ecommerce',
    subcategory: 'Dropshipping',
    level: 'Advanced',
    duration: '5 hours',
    durationMinutes: 300,
    thumbnail: 'https://img.youtube.com/vi/lnUwF4t4gYc/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=lnUwF4t4gYc',
    instructor: 'Wholesale Ted',
    isFree: true,
    tags: ['dropshipping', 'ecommerce', 'scaling', 'business'],
    sections: [
      {
        id: 'drop-scaling',
        title: 'Scaling Strategies',
        description: 'How to scale past $10k/month',
        videoUrl: 'https://www.youtube.com/watch?v=lnUwF4t4gYc&t=0s',
        durationMinutes: 45,
        quizQuestions: [
          {
            id: 'drop-q1',
            question: 'What is a private label product in dropshipping?',
            type: 'multiple_choice',
            options: [
              { text: 'A product you manufacture yourself', isCorrect: false },
              { text: 'A product with your own branding on generic items', isCorrect: true },
              { text: 'A secret product no one knows about', isCorrect: false },
              { text: 'A product sold only in private', isCorrect: false }
            ],
            explanation: 'Private labeling means putting your brand on products made by others, creating brand identity.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Scaling Plan',
      description: 'Create a business scaling strategy',
      instructions: 'Create a complete scaling plan: (1) Product research (3 winning products), (2) Supplier comparison, (3) Branding strategy, (4) Marketing budget, (5) 6-month projection.',
      submissionTypes: ['text', 'file'],
      exampleSubmission: 'Created scaling plan for Nigerian tech accessories store with projected ₦2M monthly revenue.'
    }
  },

  // ==================== FINANCE ====================
  {
    id: 'bookkeeping-basics',
    title: 'Bookkeeping & Accounting Basics',
    description: 'Learn bookkeeping fundamentals. Record transactions, manage accounts, and understand financial statements.',
    category: 'finance',
    subcategory: 'Bookkeeping',
    level: 'Beginner',
    duration: '5 hours',
    durationMinutes: 300,
    thumbnail: 'https://img.youtube.com/vi/Kl8M1JrfOAo/maxresdefault.jpg',
    videoUrl: 'https://www.youtube.com/watch?v=Kl8M1JrfOAo',
    instructor: 'Accounting Stuff',
    isFree: true,
    tags: ['bookkeeping', 'accounting', 'finance', 'business'],
    sections: [
      {
        id: 'bookkeeping-basics',
        title: 'Bookkeeping Fundamentals',
        description: 'Understanding debits, credits, and ledgers',
        videoUrl: 'https://www.youtube.com/watch?v=Kl8M1JrfOAo&t=0s',
        durationMinutes: 60,
        quizQuestions: [
          {
            id: 'book-q1',
            question: 'In double-entry bookkeeping, every transaction affects:',
            type: 'multiple_choice',
            options: [
              { text: 'Only one account', isCorrect: false },
              { text: 'At least two accounts', isCorrect: true },
              { text: 'Only cash accounts', isCorrect: false },
              { text: 'Only expense accounts', isCorrect: false }
            ],
            explanation: 'Double-entry bookkeeping records each transaction in at least two accounts - a debit and a credit.'
          }
        ]
      }
    ],
    practicalTask: {
      title: 'Record Business Transactions',
      description: 'Practice bookkeeping entries',
      instructions: 'Create a simple ledger for a fictional Nigerian business. Record 20 transactions including: sales, purchases, expenses, and payments. Prepare a trial balance.',
      submissionTypes: ['file', 'screenshot'],
      exampleSubmission: 'Created complete ledger for Lagos bakery with monthly trial balance.'
    }
  }
];

// Helper functions
export const getCoursesByCategory = (categoryId: string): LearningCourse[] => {
  return learningCourses.filter(c => c.category === categoryId);
};

export const getCoursesByLevel = (level: 'Beginner' | 'Intermediate' | 'Advanced'): LearningCourse[] => {
  return learningCourses.filter(c => c.level === level);
};

export const searchLearningCourses = (query: string): LearningCourse[] => {
  const lowerQuery = query.toLowerCase();
  return learningCourses.filter(c =>
    c.title.toLowerCase().includes(lowerQuery) ||
    c.description.toLowerCase().includes(lowerQuery) ||
    c.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    c.subcategory.toLowerCase().includes(lowerQuery)
  );
};

export const getCourseById = (id: string): LearningCourse | undefined => {
  return learningCourses.find(c => c.id === id);
};
