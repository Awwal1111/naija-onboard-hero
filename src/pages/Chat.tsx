import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Paperclip, Smile, Send, UserX, UserCheck, Circle, Reply, X, MoreVertical, Copy, Trash2, Check, CheckCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { useBlockUser } from '@/hooks/useBlockUser'
import { useUserPresence } from '@/hooks/useUserPresence'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Card } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import SafePayDialog from '@/components/SafePayDialog'
import BlockConfirmationDialog from '@/components/BlockConfirmationDialog'
import { useToast } from '@/hooks/use-toast'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  reply_to_id?: string
  reply_to_content?: string
  reply_to_sender?: string
}

const Chat = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const { messages, sendMessage, otherUser, loading } = useChat(userId!)
  const { isBlocked, isBlockedBy, canSendMessage, blockUser, unblockUser, loading: blockLoading } = useBlockUser(userId!)
  const { getOnlineStatus } = useUserPresence()
  const { toast } = useToast()
  const [newMessage, setNewMessage] = useState('')
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newMessage.trim() && userId && canSendMessage) {
      try {
        await sendMessage(newMessage.trim(), null, null, replyingTo?.id)
        setNewMessage('')
        setReplyingTo(null)
        inputRef.current?.focus()
      } catch (error) {
        // Error already shown by useChat hook
        console.error('Failed to send message:', error)
      }
    }
  }

  const handleReply = (message: Message) => {
    setReplyingTo(message)
    inputRef.current?.focus()
  }

  const handleCopyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: "Copied",
      description: "Message copied to clipboard",
    })
  }

  const emojis = ['😀', '😂', '😍', '🤔', '😊', '👍', '👎', '❤️', '🔥', '💯']

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

  const groupMessagesByDate = (messages: any[]) => {
    const groups: { [key: string]: any[] } = {}
    messages.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString()
      if (!groups[date]) groups[date] = []
      groups[date].push(msg)
    })
    return groups
  }

  const messageGroups = groupMessagesByDate(messages)

  return (
    <div className="min-h-screen bg-background flex flex-col max-h-screen">
      {/* Sticky Header */}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-50 shadow-sm">
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
      <div className="flex-1 overflow-y-auto px-4 py-4">
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
          Object.entries(messageGroups).map(([date, msgs]) => (
            <div key={date} className="space-y-3 mb-6">
              {/* Date Separator */}
              <div className="flex items-center justify-center my-4">
                <div className="bg-muted px-3 py-1 rounded-full">
                  <span className="text-xs text-muted-foreground">
                    {date === new Date().toLocaleDateString() ? 'Today' : date}
                  </span>
                </div>
              </div>

              {msgs.map((message) => {
                const isOwn = message.sender_id === user?.id
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                  >
                    <div className="flex items-end gap-2 max-w-[85%] md:max-w-[75%]">
                      {!isOwn && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="start">
                            <button
                              onClick={() => handleReply(message)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded"
                            >
                              <Reply className="h-4 w-4" />
                              Reply
                            </button>
                            <button
                              onClick={() => handleCopyMessage(message.content)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                          </PopoverContent>
                        </Popover>
                      )}

                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-primary text-primary-foreground rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}
                      >
                        {/* Reply Preview */}
                        {message.reply_to_content && (
                          <div className={`mb-2 pb-2 border-l-2 pl-2 ${isOwn ? 'border-primary-foreground/30' : 'border-border'}`}>
                            <p className="text-xs opacity-70 font-medium">
                              {message.reply_to_sender === user?.id ? 'You' : otherUser?.full_name}
                            </p>
                            <p className="text-xs opacity-60 truncate">
                              {message.reply_to_content}
                            </p>
                          </div>
                        )}

                         <p className="text-sm break-words">{message.content}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <p className="text-xs opacity-70">
                            {new Date(message.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                          {isOwn && (
                            message.read_at ? (
                              <CheckCheck className="h-3 w-3 opacity-70" />
                            ) : (
                              <Check className="h-3 w-3 opacity-70" />
                            )
                          )}
                        </div>
                      </div>

                      {isOwn && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-accent rounded">
                              <MoreVertical className="h-4 w-4 text-muted-foreground" />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent className="w-40 p-1" align="end">
                            <button
                              onClick={() => handleReply(message)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded"
                            >
                              <Reply className="h-4 w-4" />
                              Reply
                            </button>
                            <button
                              onClick={() => handleCopyMessage(message.content)}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent rounded"
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </button>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className="border-t border-border bg-background">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="px-3 md:px-4 pt-3 pb-2 flex items-center gap-2 bg-muted/30">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Reply className="h-3 w-3 text-primary" />
                <span className="text-xs font-medium text-primary">
                  Replying to {replyingTo.sender_id === user?.id ? 'yourself' : otherUser?.full_name}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {replyingTo.content}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 hover:bg-accent rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="p-3 md:p-4">
          {canSendMessage ? (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-2 hover:bg-accent rounded-full flex-shrink-0"
                  >
                    <Smile className="h-5 w-5 text-muted-foreground" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2" align="start" side="top">
                  <div className="grid grid-cols-5 gap-2">
                    {emojis.map((emoji, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => {
                          setNewMessage(prev => prev + emoji)
                          setShowEmojiPicker(false)
                        }}
                        className="text-2xl hover:bg-accent p-2 rounded"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
              
              <div className="flex-1 min-w-0">
                <BrandInput
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="border-0 bg-muted min-h-[40px] py-2 w-full"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage(e)
                    }
                  }}
                />
              </div>
              
              <BrandButton
                type="submit"
                size="sm"
                disabled={!newMessage.trim()}
                className="rounded-full w-10 h-10 p-0 flex-shrink-0"
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