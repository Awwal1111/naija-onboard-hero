import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Paperclip, Smile, Send, UserX, UserCheck, Circle, Reply, X, MoreVertical, Copy, Trash2, Check, CheckCheck, Image as ImageIcon, Loader2, Mic, Phone } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { useBlockUser } from '@/hooks/useBlockUser'
import { useUserPresence } from '@/hooks/useUserPresence'
import { useWebRTC } from '@/hooks/useWebRTC'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Card } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import SafePayDialog from '@/components/SafePayDialog'
import BlockConfirmationDialog from '@/components/BlockConfirmationDialog'
import CallControls from '@/components/CallControls'
import ActiveCallInterface from '@/components/ActiveCallInterface'
import CallHistory from '@/components/CallHistory'
import VoiceRecorder from '@/components/VoiceRecorder'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface Message {
  id: string
  content: string
  sender_id: string
  created_at: string
  reply_to_id?: string
  reply_to_content?: string
  reply_to_sender?: string
  media_url?: string | null
  media_type?: string | null
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
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // WebRTC for voice/video calls
  const {
    callState,
    localStream,
    remoteStream,
    isMuted,
    isVideoOff,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchToAudioOnly
  } = useWebRTC()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file",
          description: "Please select an image file",
          variant: "destructive"
        })
        return
      }
      
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Please select an image under 5MB",
          variant: "destructive"
        })
        return
      }
      
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !userId || !canSendMessage) return

    setUploading(true)
    try {
      let mediaUrl = null
      let mediaType = null

      // Upload image if present
      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${user?.id}/${Date.now()}.${fileExt}`
        
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, selectedFile)

        if (uploadError) throw uploadError

        mediaUrl = fileName
        mediaType = selectedFile.type
      }

      await sendMessage(
        newMessage.trim() || '📷 Image',
        mediaUrl,
        mediaType,
        replyingTo?.id
      )
      
      setNewMessage('')
      setReplyingTo(null)
      setSelectedFile(null)
      setImagePreview(null)
      inputRef.current?.focus()
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    if (!userId || !canSendMessage) return

    setUploading(true)
    try {
      const fileName = `${user?.id}/${Date.now()}.webm`
      
      const { error: uploadError } = await supabase.storage
        .from('chat-uploads')
        .upload(fileName, audioBlob, {
          contentType: 'audio/webm'
        })

      if (uploadError) throw uploadError

      await sendMessage(
        `🎤 Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
        fileName,
        'audio/webm'
      )
      
      toast({
        title: "Sent",
        description: "Voice message sent successfully"
      })
    } catch (error: any) {
      toast({
        title: "Failed to send voice message",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const getImageUrl = async (mediaUrl: string): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(mediaUrl, 3600) // 1 hour expiry
      
      if (error) {
        console.error('Error getting signed URL:', error)
        toast({
          title: "Image load failed",
          description: "Could not load image",
          variant: "destructive"
        })
        return ''
      }
      return data.signedUrl
    } catch (error) {
      console.error('Exception getting signed URL:', error)
      return ''
    }
  }

  useEffect(() => {
    const loadMediaUrls = async () => {
      const urlsToLoad: string[] = []
      
      // Find all media that needs loading
      for (const message of messages) {
        if (message.media_url && 
            !imageUrls[message.media_url] && 
            !loadingImages.has(message.media_url)) {
          urlsToLoad.push(message.media_url)
        }
      }

      if (urlsToLoad.length === 0) return

      // Mark as loading
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        urlsToLoad.forEach(url => newSet.add(url))
        return newSet
      })

      // Load all URLs from both buckets
      const urls: Record<string, string> = {}
      await Promise.all(
        urlsToLoad.map(async (mediaUrl) => {
          // Try chat-media bucket first
          let url = await getImageUrl(mediaUrl)
          
          // If not found, try chat-uploads bucket (for voice messages)
          if (!url) {
            try {
              const { data, error } = await supabase.storage
                .from('chat-uploads')
                .createSignedUrl(mediaUrl, 3600)
              
              if (!error && data) {
                url = data.signedUrl
              }
            } catch (err) {
              console.error('Error loading from chat-uploads:', err)
            }
          }
          
          if (url) urls[mediaUrl] = url
        })
      )

      // Update state
      if (Object.keys(urls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...urls }))
      }
      
      // Clear loading state
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        urlsToLoad.forEach(url => newSet.delete(url))
        return newSet
      })
    }

    loadMediaUrls()
  }, [messages])

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

  // Show active call interface if in call
  if (callState.isInCall) {
    return (
      <ActiveCallInterface
        localStream={localStream}
        remoteStream={remoteStream}
        callType={callState.callType!}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        remoteUserName={otherUser?.full_name || 'User'}
        remoteUserAvatar={otherUser?.profile_picture_url}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchToAudioOnly={switchToAudioOnly}
        callStatus={callState.status}
      />
    )
  }

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

        {/* Call Controls */}
        {userId && !isBlocked && !isBlockedBy && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCallHistory(true)}
              className="p-2 hover:bg-accent rounded-full transition-colors"
              title="View call history"
            >
              <Phone className="h-5 w-5 text-primary" />
            </button>
            <div className="h-6 w-px bg-border" />
            <CallControls
              onStartVoiceCall={() => startCall(userId, 'voice')}
              onStartVideoCall={() => startCall(userId, 'video')}
            />
          </div>
        )}
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

                        {message.media_url && (
                          <div className="mb-2">
                            {message.media_type?.startsWith('audio/') ? (
                              <audio 
                                controls 
                                src={imageUrls[message.media_url] || ''} 
                                className="max-w-[250px]"
                                onError={(e) => {
                                  console.error('Audio failed to load:', message.media_url)
                                }}
                              />
                            ) : loadingImages.has(message.media_url) ? (
                              <div className="max-w-[250px] h-32 bg-muted rounded-lg flex items-center justify-center">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                              </div>
                            ) : imageUrls[message.media_url] ? (
                              <div 
                                className="cursor-pointer"
                                onClick={() => setViewingImage(imageUrls[message.media_url!])}
                              >
                                <img 
                                  src={imageUrls[message.media_url]} 
                                  alt="Shared image"
                                  className="max-w-[250px] rounded-lg"
                                  onError={(e) => {
                                    console.error('Image failed to load:', message.media_url)
                                    e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="250" height="150"%3E%3Crect fill="%23ddd"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage failed%3C/text%3E%3C/svg%3E'
                                  }}
                                />
                              </div>
                            ) : (
                              <div className="max-w-[250px] h-32 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                                Failed to load image
                              </div>
                            )}
                          </div>
                        )}

                        {message.content && message.content !== '📷 Image' && (
                          <p className="text-sm break-words">{message.content}</p>
                        )}
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

      {/* Voice Recorder Overlay */}
      {showVoiceRecorder && (
        <VoiceRecorder
          onSendVoiceMessage={handleSendVoiceMessage}
          onCancel={() => setShowVoiceRecorder(false)}
          autoStart={true}
        />
      )}

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
          {/* Image Preview */}
          {imagePreview && (
            <div className="mb-3 relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-32 rounded-lg"
              />
              <button
                onClick={() => {
                  setImagePreview(null)
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {canSendMessage ? (
            <form onSubmit={handleSendMessage} className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="p-2 hover:bg-destructive/10 rounded-full flex-shrink-0 active:scale-95 transition-all group"
                disabled={uploading}
                title="Record voice message"
              >
                <Mic className="h-5 w-5 text-destructive group-hover:text-destructive/90" />
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="p-2 hover:bg-accent rounded-full flex-shrink-0"
                disabled={uploading}
                title="Send image"
              >
                <ImageIcon className="h-5 w-5 text-muted-foreground" />
              </button>

              <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="p-2 hover:bg-accent rounded-full flex-shrink-0"
                    disabled={uploading}
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
                  disabled={uploading}
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
                disabled={(!newMessage.trim() && !selectedFile) || uploading}
                className="rounded-full w-10 h-10 p-0 flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
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

      {/* Call History Dialog */}
      <Dialog open={showCallHistory} onOpenChange={setShowCallHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Call History</DialogTitle>
          </DialogHeader>
          <CallHistory />
        </DialogContent>
      </Dialog>

      {/* Image Viewer Dialog */}
      <Dialog open={!!viewingImage} onOpenChange={() => setViewingImage(null)}>
        <DialogContent className="max-w-4xl p-0 bg-transparent border-0">
          <div className="relative">
            <button
              onClick={() => setViewingImage(null)}
              className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-2 hover:bg-black/70 z-10"
            >
              <X className="h-5 w-5" />
            </button>
            {viewingImage && (
              <img 
                src={viewingImage} 
                alt="Full size" 
                className="w-full h-auto max-h-[90vh] object-contain rounded-lg"
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Chat