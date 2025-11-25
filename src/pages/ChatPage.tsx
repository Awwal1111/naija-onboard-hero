import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus, Home, MessageCircle, Users as UsersIcon, Briefcase, DollarSign, Menu, Video } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import MessagesTab from '@/components/MessagesTab'
import GroupMessagesTab from '@/components/GroupMessagesTab'
import CreateGroupDialog from '@/components/CreateGroupDialog'
import { useAuth } from '@/hooks/useAuth'
import TopBannerAd from '@/components/TopBannerAd'
import { MoreMenuDrawer } from '@/components/MoreMenuDrawer'

const ChatPage: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [activeTab, setActiveTab] = useState('messages')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: UsersIcon, label: 'Expert', path: '/experts' },
    { icon: Video, label: 'Class', path: '/expert-class' },
    { icon: Briefcase, label: 'Gig', path: '/jobs' },
    { icon: DollarSign, label: 'Earn', path: '/earn' }
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <TopBannerAd />
      
      <div className="container mx-auto max-w-4xl p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-primary">Chats</h1>
          {activeTab === 'groups' && (
            <Button onClick={() => setShowCreateGroup(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="messages">Direct Messages</TabsTrigger>
            <TabsTrigger value="groups">Group Chats</TabsTrigger>
          </TabsList>
          
          <TabsContent value="messages" className="mt-0">
            <MessagesTab />
          </TabsContent>
          
          <TabsContent value="groups" className="mt-0">
            <GroupMessagesTab />
          </TabsContent>
        </Tabs>

        <CreateGroupDialog 
          open={showCreateGroup} 
          onOpenChange={setShowCreateGroup}
        />
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border z-50">
        <div className="flex justify-around items-center px-1 sm:px-4 py-1.5 sm:py-2 max-w-md mx-auto">
          {bottomNavItems.map((item) => (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors ${
                location.pathname === item.path
                  ? 'text-primary bg-primary/10'
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="text-[10px] sm:text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setMoreMenuOpen(true)}
            className="flex flex-col items-center gap-0.5 sm:gap-1 py-1.5 sm:py-2 px-2 sm:px-3 rounded-xl transition-colors text-text-secondary hover:text-primary hover:bg-primary/5"
          >
            <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            <span className="text-[10px] sm:text-xs font-medium">More</span>
          </button>
        </div>
      </nav>
      <MoreMenuDrawer open={moreMenuOpen} onOpenChange={setMoreMenuOpen} />
    </div>
  )
}

export default ChatPage