import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Paperclip, Smile, Send, UserX, UserCheck, Circle } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { useBlockUser } from '@/hooks/useBlockUser'
import { useUserPresence } from '@/hooks/useUserPresence'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import SafePayDialog from '@/components/SafePayDialog'
import BlockConfirmationDialog from '@/components/BlockConfirmationDialog'

const Chat = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const { messages, sendMessage, otherUser, loading } = useChat(userId!)
  const { isBlocked, isBlockedBy, canSendMessage, blockUser, unblockUser, loading: blockLoading } = useBlockUser(userId!)
  const { getOnlineStatus } = useUserPresence()
  const [newMessage, setNewMessage] = useState('')
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && userId && canSendMessage) {
      await sendMessage(newMessage.trim())
      setNewMessage('')
    }
  }

  const handleBlockUser = () => {
    setShowBlockDialog(true)
  }

  const confirmBlock = async () => {
    await blockUser()
    setShowBlockDialog(false)
  }

  const getStatusColor = (status: 'online' | 'offline' | 'recently_active') => {
    switch (status) {
      case 'online': return 'text-green-500'
      case 'recently_active': return 'text-yellow-500'
      default: return 'text-gray-400'
    }
  }

  const getStatusText = (status: 'online' | 'offline' | 'recently_active') => {
    switch (status) {
      case 'online': return 'Online'
      case 'recently_active': return 'Active recently'
      default: return 'Offline'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-accent rounded-full"
        >
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        
        <div className="flex-1">
          <h1 className="font-semibold text-text-primary">
            {otherUser?.full_name || 'Loading...'}
          </h1>
          {userId && (
            <div className="flex items-center gap-1">
              <Circle className={`h-2 w-2 fill-current ${getStatusColor(getOnlineStatus(userId))}`} />
              <p className={`text-sm ${getStatusColor(getOnlineStatus(userId))}`}>
                {getStatusText(getOnlineStatus(userId))}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* SafePay and Block Actions */}
      {otherUser && (
        <div className="border-b border-border px-4 py-2 flex justify-between items-center bg-muted/30">
          <SafePayDialog 
            otherUserId={userId!} 
            otherUserName={otherUser.full_name} 
          />
          
          <BrandButton
            variant="outline"
            size="sm"
            onClick={isBlocked ? unblockUser : handleBlockUser}
            disabled={blockLoading}
            className="flex items-center gap-2"
          >
            {isBlocked ? (
              <>
                <UserCheck className="h-4 w-4" />
                Unblock
              </>
            ) : (
              <>
                <UserX className="h-4 w-4" />
                Block
              </>
            )}
          </BrandButton>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {isBlockedBy && (
          <div className="text-center text-text-secondary py-8">
            <UserX className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p>You cannot send messages to this user.</p>
          </div>
        )}
        {isBlocked && (
          <div className="text-center text-text-secondary py-8">
            <UserX className="h-8 w-8 mx-auto mb-2 text-red-500" />
            <p>You have blocked this user. They cannot message you.</p>
          </div>
        )}
        {!isBlockedBy && !isBlocked && messages.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <p>Start a conversation!</p>
          </div>
        ) : (!isBlockedBy && !isBlocked &&
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_id === user?.id ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] px-4 py-2 rounded-2xl ${
                  message.sender_id === user?.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className="text-xs opacity-70 mt-1">
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border p-4">
        {canSendMessage ? (
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              className="p-2 hover:bg-accent rounded-full"
            >
              <Paperclip className="h-5 w-5 text-text-secondary" />
            </button>
            
            <button
              type="button"
              className="p-2 hover:bg-accent rounded-full"
            >
              <Smile className="h-5 w-5 text-text-secondary" />
            </button>
            
            <div className="flex-1">
              <BrandInput
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                className="border-0 bg-muted"
              />
            </div>
            
            <BrandButton
              type="submit"
              size="sm"
              disabled={!newMessage.trim()}
              className="rounded-full w-10 h-10 p-0"
            >
              <Send className="h-4 w-4" />
            </BrandButton>
          </form>
        ) : (
          <div className="text-center py-4">
            <p className="text-text-secondary">
              {isBlocked ? "You have blocked this user" : "You cannot send messages to this user"}
            </p>
          </div>
        )}
      </div>

      {/* Block Confirmation Dialog */}
      <BlockConfirmationDialog
        open={showBlockDialog}
        onOpenChange={setShowBlockDialog}
        userName={otherUser?.full_name || 'User'}
        onConfirm={confirmBlock}
        loading={blockLoading}
      />
    </div>
  )
}

export default Chat