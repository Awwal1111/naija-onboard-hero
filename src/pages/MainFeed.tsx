import React from 'react'
import { Search, MessageCircle, Users, DollarSign, Briefcase, User } from 'lucide-react'
import { BrandInput } from '@/components/ui/brand-input'

const MainFeed = () => {
  const stories = [
    { id: 1, author: 'John D.', content: 'Just completed a web design project!' },
    { id: 2, author: 'Sarah M.', content: 'Looking for React developers' },
    { id: 3, author: 'Ahmed K.', content: 'New to freelancing, excited to start!' }
  ]

  const navItems = [
    { icon: MessageCircle, label: 'Chat', count: 3 },
    { icon: Users, label: 'Experts', count: null },
    { icon: DollarSign, label: 'Earn', count: null },
    { icon: Briefcase, label: 'Jobs', count: 12 },
    { icon: User, label: 'Profile', count: null }
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4">
        <h1 className="text-2xl font-bold text-text-primary">NaijaLancers</h1>
      </header>

      <div className="px-6 py-4">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 h-4 w-4 text-text-secondary" />
          <BrandInput
            placeholder="Search experts, jobs, or tasks..."
            className="pl-10"
          />
        </div>

        {/* Stories/Updates Section */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Latest Updates</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {stories.map((story) => (
              <div
                key={story.id}
                className="min-w-[280px] bg-card border border-border rounded-lg p-4"
              >
                <div className="font-medium text-text-primary mb-2">{story.author}</div>
                <p className="text-sm text-text-secondary">{story.content}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Navigation List */}
        <div className="space-y-3">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between p-4 bg-card border border-border rounded-lg hover:bg-accent cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-primary" />
                <span className="font-medium text-text-primary">{item.label}</span>
              </div>
              {item.count && (
                <span className="bg-primary text-primary-foreground text-sm px-2 py-1 rounded-full">
                  {item.count}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-6 py-3">
        <div className="flex justify-around">
          {navItems.map((item) => (
            <div key={item.label} className="flex flex-col items-center gap-1 cursor-pointer">
              <item.icon className="h-5 w-5 text-text-secondary" />
              <span className="text-xs text-text-secondary">{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default MainFeed