import React from 'react'
import { useParams } from 'react-router-dom'
import GroupChatInterface from '@/components/GroupChatInterface'
import ResponsiveLayout from '@/components/ResponsiveLayout'

const GroupChat = () => {
  const { groupId } = useParams<{ groupId: string }>()

  if (!groupId) {
    return (
      <ResponsiveLayout>
        <div className="container mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Group Not Found</h1>
            <p className="text-muted-foreground">The group you're looking for doesn't exist.</p>
          </div>
        </div>
      </ResponsiveLayout>
    )
  }

  return (
    <ResponsiveLayout>
      <div className="h-full">
        <GroupChatInterface />
      </div>
    </ResponsiveLayout>
  )
}

export default GroupChat