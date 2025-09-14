import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import MessagesTab from '@/components/MessagesTab'
import GroupMessagesTab from '@/components/GroupMessagesTab'
import CreateGroupDialog from '@/components/CreateGroupDialog'
import { useAuth } from '@/hooks/useAuth'

const ChatPage: React.FC = () => {
  const { user } = useAuth()
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [activeTab, setActiveTab] = useState('messages')

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-text-primary">Chat</h1>
          {activeTab === 'groups' && (
            <Button onClick={() => setShowCreateGroup(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Group
            </Button>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="messages">Messages</TabsTrigger>
            <TabsTrigger value="groups">Group Messages</TabsTrigger>
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
    </div>
  )
}

export default ChatPage