import { useMemo } from 'react'
import { useUserMode } from './useUserMode'
import {
  Home,
  MessageCircle,
  Users,
  Briefcase,
  DollarSign,
  GraduationCap,
  ShoppingBag,
  Award,
  BarChart3,
  FileText,
  Video,
  Trophy,
  Wallet,
  Settings,
  User,
  PlusCircle,
  Search,
  BookOpen,
  Target,
  Sparkles,
  Bot,
  LucideIcon
} from 'lucide-react'

export interface FeatureItem {
  id: string
  label: string
  path: string
  icon: LucideIcon
  description?: string
  roles: ('freelancer' | 'client' | 'both')[] // Which roles can see this
  priority?: number // For sorting (lower = higher priority)
}

// ===== FEATURE DEFINITIONS =====
// Each feature specifies which roles can access it

// Bottom Navigation Items (main nav)
export const BOTTOM_NAV_FEATURES: FeatureItem[] = [
  { 
    id: 'feed', 
    label: 'Feed', 
    path: '/feed', 
    icon: Home, 
    roles: ['freelancer', 'client', 'both'],
    priority: 1
  },
  { 
    id: 'chat', 
    label: 'Chat', 
    path: '/chat', 
    icon: MessageCircle, 
    roles: ['freelancer', 'client', 'both'],
    priority: 2
  },
  { 
    id: 'experts', 
    label: 'Expert', 
    path: '/experts', 
    icon: Users, 
    roles: ['client', 'both'], // Clients browse experts
    description: 'Find and hire experts',
    priority: 3
  },
  { 
    id: 'jobs', 
    label: 'Jobs', 
    path: '/jobs', 
    icon: Briefcase, 
    roles: ['freelancer', 'both'], // Freelancers browse jobs
    description: 'Find work opportunities',
    priority: 3
  },
  { 
    id: 'gigs', 
    label: 'Gigs', 
    path: '/jobs', 
    icon: Briefcase, 
    roles: ['client'], // Clients see gigs to hire from
    description: 'Browse services to hire',
    priority: 3
  },
  { 
    id: 'earn', 
    label: 'Earn', 
    path: '/earn', 
    icon: DollarSign, 
    roles: ['freelancer', 'both'], // Freelancers earn
    priority: 4
  },
  { 
    id: 'dashboard', 
    label: 'Hub', 
    path: '/client-dashboard', 
    icon: BarChart3, 
    roles: ['client'], // Clients see their hiring hub
    description: 'Manage your projects',
    priority: 4
  }
]

// Quick Actions (displayed in dashboard/profile menus)
export const QUICK_ACTION_FEATURES: FeatureItem[] = [
  // Freelancer-focused
  { 
    id: 'my-gigs', 
    label: 'My Gigs', 
    path: '/my-gigs', 
    icon: Briefcase, 
    roles: ['freelancer', 'both'],
    description: 'Manage your services'
  },
  { 
    id: 'find-jobs', 
    label: 'Find Jobs', 
    path: '/jobs', 
    icon: Search, 
    roles: ['freelancer', 'both'],
    description: 'Browse job listings'
  },
  { 
    id: 'orders', 
    label: 'Orders', 
    path: '/orders', 
    icon: FileText, 
    roles: ['freelancer', 'client', 'both'],
    description: 'Track your orders'
  },
  { 
    id: 'analytics', 
    label: 'Analytics', 
    path: '/dashboard', 
    icon: BarChart3, 
    roles: ['freelancer', 'both'],
    description: 'View your performance'
  },
  { 
    id: 'expert-class', 
    label: 'Teach', 
    path: '/expert-class', 
    icon: Video, 
    roles: ['freelancer', 'both'],
    description: 'Create live classes'
  },
  { 
    id: 'courses-create', 
    label: 'Create Course', 
    path: '/courses', 
    icon: GraduationCap, 
    roles: ['freelancer', 'both'],
    description: 'Sell your knowledge'
  },
  { 
    id: 'products', 
    label: 'Sell Products', 
    path: '/digital-products', 
    icon: ShoppingBag, 
    roles: ['freelancer', 'both'],
    description: 'Sell digital products'
  },
  { 
    id: 'contests', 
    label: 'Contests', 
    path: '/contests', 
    icon: Trophy, 
    roles: ['freelancer', 'both'],
    description: 'Compete for prizes'
  },
  
  // Client-focused
  { 
    id: 'post-job', 
    label: 'Post Job', 
    path: '/post-job', 
    icon: PlusCircle, 
    roles: ['client', 'both'],
    description: 'Hire freelancers'
  },
  { 
    id: 'find-experts', 
    label: 'Find Experts', 
    path: '/experts', 
    icon: Users, 
    roles: ['client', 'both'],
    description: 'Browse verified experts'
  },
  { 
    id: 'ai-hire', 
    label: 'AI Hire', 
    path: '/ai-hire', 
    icon: Bot, 
    roles: ['client', 'both'],
    description: 'Get AI hiring assistance'
  },
  { 
    id: 'client-dashboard', 
    label: 'Hiring Hub', 
    path: '/client-dashboard', 
    icon: Target, 
    roles: ['client', 'both'],
    description: 'Manage your hires'
  },
  { 
    id: 'create-contest', 
    label: 'Create Contest', 
    path: '/contests', 
    icon: Award, 
    roles: ['client', 'both'],
    description: 'Run a design contest'
  },
  
  // Shared
  { 
    id: 'learn', 
    label: 'Learn', 
    path: '/learn', 
    icon: BookOpen, 
    roles: ['freelancer', 'client', 'both'],
    description: 'Take courses'
  },
  { 
    id: 'wallet', 
    label: 'Wallet', 
    path: '/earn', 
    icon: Wallet, 
    roles: ['freelancer', 'client', 'both'],
    description: 'Manage your funds'
  },
  { 
    id: 'connections', 
    label: 'Network', 
    path: '/connections', 
    icon: Users, 
    roles: ['freelancer', 'client', 'both'],
    description: 'Your connections'
  }
]

// More Menu Items (accessible via hamburger/more button)
export const MORE_MENU_FEATURES: FeatureItem[] = [
  { 
    id: 'profile', 
    label: 'Profile', 
    path: '/profile', 
    icon: User, 
    roles: ['freelancer', 'client', 'both']
  },
  { 
    id: 'settings', 
    label: 'Settings', 
    path: '/settings', 
    icon: Settings, 
    roles: ['freelancer', 'client', 'both']
  },
  { 
    id: 'workrooms', 
    label: 'Workrooms', 
    path: '/workrooms', 
    icon: Video, 
    roles: ['freelancer', 'client', 'both'],
    description: 'Collaborate on projects'
  },
  { 
    id: 'work-diary', 
    label: 'Work Diary', 
    path: '/work-diary', 
    icon: FileText, 
    roles: ['freelancer', 'both'],
    description: 'Track your work time'
  },
  { 
    id: 'expert-verification', 
    label: 'Get Verified', 
    path: '/expert-verification', 
    icon: Award, 
    roles: ['freelancer', 'both'],
    description: 'Become a verified expert'
  },
  { 
    id: 'fundraising', 
    label: 'Fundraising', 
    path: '/fundraising', 
    icon: Sparkles, 
    roles: ['freelancer', 'client', 'both']
  },
  { 
    id: 'leaderboard', 
    label: 'Leaderboard', 
    path: '/leaderboard', 
    icon: Trophy, 
    roles: ['freelancer', 'both']
  },
  { 
    id: 'referrals', 
    label: 'Referrals', 
    path: '/referrals', 
    icon: Users, 
    roles: ['freelancer', 'client', 'both']
  }
]

// Onboarding tour steps per role
export const ONBOARDING_STEPS = {
  freelancer: [
    { title: 'Find Jobs & Gigs', description: 'Browse thousands of job opportunities posted by clients.', icon: 'Briefcase', path: '/jobs' },
    { title: 'Create Your Gigs', description: 'Showcase your services and let clients find you.', icon: 'Plus', path: '/my-gigs' },
    { title: 'Your Wallet', description: 'Track earnings, withdraw funds, and manage your finances.', icon: 'Wallet', path: '/earn' },
    { title: 'Skills Verification', description: 'Get verified badges to stand out from the crowd.', icon: 'Award', path: '/expert-verification' },
    { title: 'Earn Rewards', description: 'Complete tasks, refer friends, and earn NC coins!', icon: 'Award', path: '/earn' }
  ],
  client: [
    { title: 'Find Experts', description: 'Discover verified professionals for your projects.', icon: 'Users', path: '/experts' },
    { title: 'Post a Job', description: 'Describe your project and receive proposals.', icon: 'Plus', path: '/post-job' },
    { title: 'AI Hiring Assistant', description: 'Let our AI help you find the perfect freelancer.', icon: 'Bot', path: '/ai-hire' },
    { title: 'Your Hiring Hub', description: 'Track spending, manage orders, and review applications.', icon: 'BarChart3', path: '/client-dashboard' },
    { title: 'SafePay Escrow', description: 'Secure payments with milestone-based releases.', icon: 'Shield', path: '/orders' }
  ],
  both: [
    { title: 'Find Jobs & Experts', description: 'Browse jobs or find experts for your projects.', icon: 'Briefcase', path: '/jobs' },
    { title: 'Create & Hire', description: 'Offer your services or post jobs to hire talent.', icon: 'Plus', path: '/my-gigs' },
    { title: 'Your Wallet', description: 'Deposit, withdraw, and transfer funds securely.', icon: 'Wallet', path: '/earn' },
    { title: 'Chat & Connect', description: 'Message other users and grow your network.', icon: 'MessageCircle', path: '/chat' },
    { title: 'Earn & Learn', description: 'Complete tasks, take courses, and level up!', icon: 'Award', path: '/earn' }
  ]
}

// Weekly digest content per role
export const DIGEST_SECTIONS = {
  freelancer: ['job_recommendations', 'trending_skills', 'earnings_summary', 'profile_views', 'skill_tips'],
  client: ['top_experts', 'applications_received', 'spending_summary', 'project_status', 'hiring_tips'],
  both: ['job_recommendations', 'top_experts', 'earnings_summary', 'spending_summary', 'platform_updates']
}

/**
 * Hook to get role-filtered features
 */
export const useRoleFeatures = () => {
  const { mode, isFreelancer, isClient, isLoading } = useUserMode()
  
  const filterByRole = (features: FeatureItem[]): FeatureItem[] => {
    return features.filter(feature => {
      // 'both' mode sees everything
      if (mode === 'both') return true
      // Check if current mode is in the feature's allowed roles
      return feature.roles.includes(mode) || feature.roles.includes('both')
    }).sort((a, b) => (a.priority || 99) - (b.priority || 99))
  }
  
  const bottomNavItems = useMemo(() => {
    const filtered = filterByRole(BOTTOM_NAV_FEATURES)
    // Deduplicate by path (e.g., jobs vs gigs both go to /jobs)
    const seen = new Set<string>()
    return filtered.filter(item => {
      if (seen.has(item.path)) return false
      seen.add(item.path)
      return true
    }).slice(0, 5) // Max 5 items in bottom nav
  }, [mode])
  
  const quickActions = useMemo(() => filterByRole(QUICK_ACTION_FEATURES), [mode])
  const moreMenuItems = useMemo(() => filterByRole(MORE_MENU_FEATURES), [mode])
  const onboardingSteps = useMemo(() => ONBOARDING_STEPS[mode] || ONBOARDING_STEPS.both, [mode])
  const digestSections = useMemo(() => DIGEST_SECTIONS[mode] || DIGEST_SECTIONS.both, [mode])
  
  return {
    mode,
    isFreelancer,
    isClient,
    isLoading,
    bottomNavItems,
    quickActions,
    moreMenuItems,
    onboardingSteps,
    digestSections,
    filterByRole
  }
}

export default useRoleFeatures
