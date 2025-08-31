import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Paperclip, Smile, Send } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'

const Chat = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const { messages, sendMessage, otherUser, loading } = useChat(userId!)
  const [newMessage, setNewMessage] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && userId) {
      await sendMessage(newMessage.trim())
      setNewMessage('')
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
          <p className="text-sm text-primary">Online</p>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <p>Start a conversation!</p>
          </div>
        ) : (
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
      </div>
    </div>
  )
}

export default Chat