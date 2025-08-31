import React from 'react'
import { Search, MessageCircle, Users, DollarSign, Briefcase, User, Home, Plus } from 'lucide-react'
import { BrandInput } from '@/components/ui/brand-input'
import { BrandButton } from '@/components/ui/brand-button'
import { Link, useNavigate } from 'react-router-dom'

const MainFeed = () => {
  const navigate = useNavigate()
  
  const stories = [
    { id: 1, author: 'John D.', content: 'Just completed a web design project!', avatar: '/api/placeholder/40/40' },
    { id: 2, author: 'Sarah M.', content: 'Looking for React developers', avatar: '/api/placeholder/40/40' },
    { id: 3, author: 'Ahmed K.', content: 'New to freelancing, excited to start!', avatar: '/api/placeholder/40/40' },
    { id: 4, author: 'Fatima A.', content: 'Successfully delivered my first project', avatar: '/api/placeholder/40/40' }
  ]

  const navItems = [
    { icon: MessageCircle, label: 'Chat', count: 3, path: '/chat' },
    { icon: Users, label: 'Experts', count: null, path: '/experts' },
    { icon: DollarSign, label: 'Earn', count: null, path: '/earn' },
    { icon: Briefcase, label: 'Jobs', count: 12, path: '/jobs' },
    { icon: Users, label: 'Market', count: null, path: '/market' },
    { icon: Briefcase, label: 'Course', count: null, path: '/course' }
  ]

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed', active: true },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: DollarSign, label: 'Earn', path: '/earn' },
    { icon: User, label: 'Profile', path: '/profile' }
  ]

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Modern Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">NaijaLancers</h1>
          <BrandButton 
            size="sm" 
            onClick={() => navigate('/post-job')}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Post Job
          </BrandButton>
        </div>
      </header>

      <div className="px-6 py-4">
        {/* Modern Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
          <BrandInput
            placeholder="Search experts, jobs, or tasks..."
            className="pl-10 rounded-full border-2 border-border focus:border-primary"
          />
        </div>

        {/* Stories/Updates Section - Modern Horizontal Scroll */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Latest Updates</h2>
          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {stories.map((story) => (
              <div
                key={story.id}
                className="min-w-[300px] bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-2xl p-5 hover:shadow-lg transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white font-semibold">
                    {story.author.charAt(0)}
                  </div>
                  <div>
                    <div className="font-semibold text-text-primary text-sm">{story.author}</div>
                    <div className="text-xs text-text-secondary">2 hours ago</div>
                  </div>
                </div>
                <p className="text-sm text-text-primary leading-relaxed">{story.content}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Quick Actions</h2>
          {navItems.map((item) => (
            <div
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex items-center justify-between p-5 bg-card border border-border rounded-2xl hover:bg-primary/5 hover:border-primary/30 cursor-pointer transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <item.icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <span className="font-semibold text-text-primary">{item.label}</span>
                  <div className="text-sm text-text-secondary">
                    {item.label === 'Chat' && 'Connect with professionals'}
                    {item.label === 'Experts' && 'Find verified professionals'}
                    {item.label === 'Earn' && 'Start earning today'}
                    {item.label === 'Jobs' && 'Explore opportunities'}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.count && (
                  <span className="bg-primary text-primary-foreground text-sm px-3 py-1 rounded-full font-medium">
                    {item.count}
                  </span>
                )}
                <div className="text-text-secondary">→</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modern Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
                item.active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MainFeed