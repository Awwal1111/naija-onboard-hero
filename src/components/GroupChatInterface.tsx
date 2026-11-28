import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Send, Paperclip, Users, Pin, X, Check, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'
import { useFileUpload } from '@/hooks/useFileUpload'
import { LocationShareButton } from '@/components/chat/LocationShareButton'
import { LocationMessage, parseLocationMessage, createLocationMessageContent } from '@/components/chat/LocationMessage'

interface GroupMessage {
  id: string
  content: string
  sender_id: string
  message_type: string
  media_url?: string
  media_type?: string | null
  is_pinned: boolean
  created_at: string
  profiles?: {
    full_name: string
    profile_picture_url?: string
  }
  reactions_summary?: Record<string, number>
  user_reaction?: string
}

interface Group {
  id: string
  name: string
  category: string
  state_name: string
  lga_name: string
  area: string
  member_count: number
  group_lead_id: string
}

const GroupChatInterface: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  const [group, setGroup] = useState<Group | null>(null)
  const [messages, setMessages] = useState<GroupMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set())
  const [isUserTyping, setIsUserTyping] = useState(false)
  const { uploadFile, uploadProgress } = useFileUpload()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const typingChannelRef = useRef<any>(null)

  useEffect(() => {
    if (!groupId || !user) return

    setLoading(true)
    void fetchGroup()
    void fetchMessages()
    const unsubscribeMessages = subscribeToMessages()
    const unsubscribeTyping = subscribeToTyping()

    return () => {
      unsubscribeMessages?.()
      unsubscribeTyping?.()
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      typingChannelRef.current = null
    }
  }, [groupId, user?.id])

  useEffect(() => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const fetchGroup = async () => {
    if (!groupId) return

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .eq('id', groupId)
        .single()

      if (error) throw error
      setGroup(data)
    } catch (error) {
      console.error('Error fetching group:', error)
      toast({
        title: "Error",
        description: "Failed to load group details",
        variant: "destructive"
      })
    }
  }

  const fetchMessages = async () => {
    if (!groupId) return

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from('group_messages')
        .select('id, content, sender_id, message_type, media_url, media_type, is_pinned, created_at')
        .eq('group_id', groupId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })

      if (messagesError) throw messagesError

      if (!messagesData || messagesData.length === 0) {
        setMessages([])
        setLoading(false)
        return
      }

      // Fetch sender profiles separately
      const senderIds = [...new Set(messagesData.map(m => m.sender_id))]
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, profile_picture_url')
        .in('user_id', senderIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      }

      // Create a map of user_id to profile
      const profilesMap = new Map(
        (profilesData || []).map(profile => [profile.user_id, profile])
      )

      // Combine messages with profiles
      const processedMessages = messagesData.map(message => ({
        ...message,
        profiles: profilesMap.get(message.sender_id) || { 
          full_name: 'Unknown User',
          profile_picture_url: null 
        }
      }))

      setMessages(processedMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const subscribeToMessages = () => {
    if (!groupId) return

    const channel = supabase
      .channel(`group-messages-${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `group_id=eq.${groupId}`
        },
        async (payload) => {
          const newMessage = payload.new as GroupMessage
          
          // Only add if not already in the list (avoid duplicates)
          setMessages(prev => {
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev
            }

            // Fetch the sender's profile
            supabase
              .from('profiles')
              .select('full_name, profile_picture_url')
              .eq('user_id', newMessage.sender_id)
              .single()
              .then(({ data: profile }) => {
                setMessages(current => 
                  current.map(msg => 
                    msg.id === newMessage.id 
                      ? { ...msg, profiles: profile || { full_name: 'Unknown User', profile_picture_url: null } }
                      : msg
                  )
                )
              })

            return [...prev, {
              ...newMessage,
              profiles: { full_name: 'Loading...', profile_picture_url: null }
            }]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }

  const subscribeToTyping = () => {
    if (!groupId || !user) return

    const channel = supabase.channel(`typing-${groupId}`, {
      config: { presence: { key: user.id } }
    })
    typingChannelRef.current = channel

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const typingUserIds = new Set<string>()
        
        Object.keys(state).forEach(key => {
          const presences = state[key] as any[]
          presences.forEach(presence => {
            if (presence.typing && presence.user_id !== user.id) {
              typingUserIds.add(presence.user_id)
            }
          })
        })
        
        setTypingUsers(typingUserIds)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, typing: false })
        }
      })

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      typingChannelRef.current = null
      void supabase.removeChannel(channel)
    }
  }

  const handleTyping = (value: string) => {
    setNewMessage(value)
    const channel = typingChannelRef.current
    if (!channel || !user) return

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)

    if (value.trim()) {
      setIsUserTyping(true)
      void channel.track({ user_id: user.id, typing: true }).catch((error: unknown) => {
        console.error('Unable to update group typing presence:', error)
      })
      typingTimeoutRef.current = setTimeout(() => {
        setIsUserTyping(false)
        void channel.track({ user_id: user.id, typing: false }).catch((error: unknown) => {
          console.error('Unable to clear group typing presence:', error)
        })
      }, 2500)
    } else if (isUserTyping) {
      setIsUserTyping(false)
      void channel.track({ user_id: user.id, typing: false }).catch((error: unknown) => {
        console.error('Unable to clear group typing presence:', error)
      })
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const maxSize = 20 * 1024 * 1024 // 20MB
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "File size must be less than 20MB",
        variant: "destructive"
      })
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const removeFile = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedFile) || !groupId || !user || sending) return

    setSending(true)
    try {
      let mediaUrl = null
      let mediaType = null

      // Upload file if selected
      if (selectedFile) {
        const uploadResult = await uploadFile(selectedFile, 'group-uploads', `${groupId}/${Date.now()}-${selectedFile.name}`)
        
        if (uploadResult.error) {
          toast({
            title: "Upload failed",
            description: uploadResult.error,
            variant: "destructive"
          })
          setSending(false)
          return
        }
        
        mediaUrl = uploadResult.url
        mediaType = selectedFile.type
      }

      const { data: insertedMessage, error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: newMessage.trim() || (selectedFile ? '📎 Attachment' : ''),
          message_type: selectedFile
            ? (mediaType?.startsWith('image/') ? 'image' : mediaType?.startsWith('video/') ? 'video' : 'file')
            : 'text',
          media_url: mediaUrl,
          media_type: mediaType
        })
        .select('id')
        .single()

      if (error) throw error

      // Moderation is best-effort and always receives the exact inserted message ID.
      if (newMessage.trim() && insertedMessage?.id) {
        void supabase.functions.invoke('ai-moderation', {
          body: {
            groupId,
            messageId: insertedMessage.id,
            userId: user.id,
            content: newMessage.trim()
          }
        }).catch((moderationError) => {
          console.error('Moderation error:', moderationError)
        })
      }

      setNewMessage('')
      removeFile()
      
      // Clear typing presence on the already-subscribed channel.
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = null
      }
      if (typingChannelRef.current && user) {
        void typingChannelRef.current.track({ user_id: user.id, typing: false })
      }
      setIsUserTyping(false)
      
      toast({
        title: "Sent",
        description: "Message sent successfully"
      })
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    } finally {
      setSending(false)
    }
  }

  // Handle location share in group
  const handleLocationShare = async (location: { lat: number; lng: number; address: string }) => {
    if (!groupId || !user || sending) return;
    
    setSending(true);
    try {
      const locationContent = createLocationMessageContent(location);
      
      const { error } = await supabase
        .from('group_messages')
        .insert({
          group_id: groupId,
          sender_id: user.id,
          content: locationContent,
          message_type: 'location'
        });

      if (error) throw error;
      
      toast({
        title: "Location shared",
        description: "Your location has been sent to the group"
      });
    } catch (error) {
      console.error('Error sharing location:', error);
      toast({
        title: "Error",
        description: "Failed to share location",
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading group chat...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/chat')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex-1">
            <h1 className="font-semibold text-text-primary">
              {group?.name}
            </h1>
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Badge variant="outline" className="text-xs">
                {group?.category}
              </Badge>
              <span>{group?.area}, {group?.lga_name}</span>
              <Users className="h-3 w-3" />
              <span>{group?.member_count} members</span>
            </div>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-text-secondary py-8">
            <MessageSquare className="h-16 w-16 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No messages yet</h3>
            <p>Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-2">
              {message.is_pinned && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Pin className="h-3 w-3" />
                  <span>Pinned message</span>
                </div>
              )}
              
              <div className={`flex gap-3 ${message.sender_id === user?.id ? 'flex-row-reverse' : ''}`}>
                {message.sender_id !== user?.id && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={message.profiles?.profile_picture_url} />
                    <AvatarFallback className="text-xs">
                      {message.profiles?.full_name?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                )}
                
                <div className={`max-w-[min(78%,42rem)] min-w-0 ${message.sender_id === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                  {message.sender_id !== user?.id && (
                    <span className="text-xs text-text-secondary mb-1">
                      {message.profiles?.full_name}
                    </span>
                  )}
                  
                  {/* Check if this is a location message */}
                  {(() => {
                    const locationData = parseLocationMessage(message.content);
                    if (locationData) {
                      return <LocationMessage location={locationData} isOwn={message.sender_id === user?.id} />;
                    }
                    
                    return (
                      <Card className={`${
                        message.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      } ${message.is_pinned ? 'ring-2 ring-yellow-500' : ''}`}>
                        <CardContent className="p-3">
                          <p className="text-sm">{message.content}</p>
                          
                          {message.media_url && (
                            <div className="mt-2">
                              {message.media_type?.startsWith('image/') || message.message_type === 'image' ? (
                                <img
                                  src={message.media_url}
                                  alt="Shared image"
                                  loading="lazy"
                                  className="max-w-full max-h-80 rounded-lg object-contain"
                                />
                              ) : message.media_type?.startsWith('video/') || message.message_type === 'video' ? (
                                <video
                                  src={message.media_url}
                                  controls
                                  preload="metadata"
                                  className="w-full max-h-80 rounded-lg"
                                />
                              ) : (
                                <a
                                  href={message.media_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-background/10 rounded underline"
                                >
                                  <Paperclip className="h-4 w-4" />
                                  <span className="text-sm break-all">{message.media_type || 'Open attachment'}</span>
                                </a>
                              )}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs opacity-70">
                                {formatTime(message.created_at)}
                              </span>
                              {message.sender_id === user?.id && (
                                <Check className="h-3 w-3 opacity-70" />
                              )}
                            </div>
                            
                            {/* Reaction summary */}
                            {message.reactions_summary && Object.keys(message.reactions_summary).length > 0 && (
                              <div className="flex gap-1">
                                {Object.entries(message.reactions_summary).map(([reaction, count]) => (
                                  <span key={reaction} className="text-xs bg-background/20 px-1 rounded">
                                    {reaction === 'like' && '👍'} {count as number}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Typing Indicator */}
        {typingUsers.size > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-2">
            <div className="flex gap-1">
              <span className="animate-bounce" style={{ animationDelay: '0ms' }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: '150ms' }}>●</span>
              <span className="animate-bounce" style={{ animationDelay: '300ms' }}>●</span>
            </div>
            <span>{typingUsers.size === 1 ? 'Someone is typing...' : 'Several people are typing...'}</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      {/* File Preview */}
      {previewUrl && selectedFile && (
        <div className="px-4 py-2 border-t border-border bg-muted/20">
          <div className="relative inline-block">
            {selectedFile.type.startsWith('image/') ? (
              <img src={previewUrl} alt="Preview" className="max-h-20 max-w-20 rounded border" />
            ) : (
              <div className="flex items-center p-2 bg-muted rounded border">
                <Paperclip className="h-4 w-4 mr-2" />
                <span className="text-sm truncate max-w-40">{selectedFile.name}</span>
              </div>
            )}
            <button
              onClick={removeFile}
              className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1"
            >
              <X className="h-2 w-2" />
            </button>
          </div>
        </div>
      )}

      {/* Message Input */}
      <div className="shrink-0 border-t border-border p-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={sending || uploadProgress.isUploading}
          >
            <Paperclip className="h-4 w-4" />
          </Button>
          
          {/* Location Share Button */}
          <LocationShareButton
            onLocationSelect={handleLocationShare}
            disabled={sending || uploadProgress.isUploading}
          />
          
          <div className="flex-1">
            <Input
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              placeholder={selectedFile ? "Add a caption..." : "Type a message..."}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              disabled={sending || uploadProgress.isUploading}
            />
          </div>
          
          <Button 
            onClick={sendMessage}
            disabled={(!newMessage.trim() && !selectedFile) || sending || uploadProgress.isUploading}
            size="sm"
          >
            {sending || uploadProgress.isUploading ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        
        {uploadProgress.isUploading && (
          <div className="mt-2 text-xs text-text-secondary">
            Uploading... {Math.round(uploadProgress.progress)}%
          </div>
        )}
      </div>
    </div>
  )
}

export default GroupChatInterface