import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Smile, Send, UserX, UserCheck, Circle, X, Check, CheckCheck, Image as ImageIcon, Loader2, Mic, Phone, Lock, Play, Pause, Video, ShieldCheck } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { useBlockUser } from '@/hooks/useBlockUser'
import { useUserPresence } from '@/hooks/useUserPresence'
import { useWebRTC } from '@/hooks/useWebRTC'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import SafePayDialog from '@/components/SafePayDialog'
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [viewingImage, setViewingImage] = useState<string | null>(null)
  const [showCallHistory, setShowCallHistory] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [replyTo, setReplyTo] = useState<Message | null>(null)
  const [showBlockDialog, setShowBlockDialog] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({})

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
        replyTo?.id
      )
      
      setNewMessage('')
      setSelectedFile(null)
      setImagePreview(null)
      setReplyTo(null)
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
      console.log('Voice recording details:', {
        size: audioBlob.size,
        type: audioBlob.type,
        duration
      })

      // Create proper audio blob with correct MIME type
      const voiceBlob = new Blob([audioBlob], { type: 'audio/webm' })
      const fileName = `${user?.id}/voice-${Date.now()}.webm`
      
      console.log('Uploading voice message:', fileName)
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(fileName, voiceBlob, {
          contentType: 'audio/webm',
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Voice upload error:', uploadError)
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      console.log('Voice uploaded successfully:', uploadData)

      await sendMessage(
        `🎤 Voice message (${Math.floor(duration)}s)`,
        fileName,
        'audio/webm'
      )
      
      setShowVoiceRecorder(false)
      
      toast({
        title: "Voice message sent",
        description: "Your voice message has been delivered"
      })
    } catch (error: any) {
      console.error('Voice message error:', error)
      toast({
        title: "Failed to send voice message",
        description: error.message || "Please check your microphone permissions",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const [imageUrls, setImageUrls] = useState<Record<string, string>>({})
  const [loadingImages, setLoadingImages] = useState<Set<string>>(new Set())

  const getMediaUrl = async (mediaUrl: string, isAudio: boolean = false): Promise<string> => {
    try {
      const { data, error } = await supabase.storage
        .from('chat-media')
        .createSignedUrl(mediaUrl, 3600)
      
      if (error) {
        console.error('Error getting signed URL:', error)
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
      
      for (const message of messages) {
        if (message.media_url && 
            !imageUrls[message.media_url] && 
            !loadingImages.has(message.media_url)) {
          urlsToLoad.push(message.media_url)
        }
      }

      if (urlsToLoad.length === 0) return

      setLoadingImages(prev => {
        const newSet = new Set(prev)
        urlsToLoad.forEach(url => newSet.add(url))
        return newSet
      })

      const urls: Record<string, string> = {}
      await Promise.all(
        urlsToLoad.map(async (mediaUrl) => {
          const url = await getMediaUrl(mediaUrl, mediaUrl.includes('voice-'))
          if (url) urls[mediaUrl] = url
        })
      )

      if (Object.keys(urls).length > 0) {
        setImageUrls(prev => ({ ...prev, ...urls }))
      }
      
      setLoadingImages(prev => {
        const newSet = new Set(prev)
        urlsToLoad.forEach(url => newSet.delete(url))
        return newSet
      })
    }

    loadMediaUrls()
  }, [messages])

  const emojis = ['😀', '😂', '😍', '🤔', '😊', '👍', '👎', '❤️', '🔥', '💯']

  const playAudio = (messageId: string, audioUrl: string) => {
    // Pause all other audio
    Object.keys(audioRefs.current).forEach(id => {
      if (id !== messageId && audioRefs.current[id]) {
        audioRefs.current[id].pause()
      }
    })

    const audio = audioRefs.current[messageId]
    if (audio) {
      if (playingAudio === messageId) {
        audio.pause()
        setPlayingAudio(null)
      } else {
        audio.play()
        setPlayingAudio(messageId)
      }
    }
  }

  const handleBlockUser = async () => {
    try {
      await blockUser()
      setShowBlockDialog(false)
      toast({
        title: "User blocked",
        description: "You have blocked this user"
      })
    } catch (error) {
      toast({
        title: "Failed to block user",
        description: "Please try again",
        variant: "destructive"
      })
    }
  }

  const handleUnblockUser = async () => {
    try {
      await unblockUser()
      toast({
        title: "User unblocked",
        description: "You have unblocked this user"
      })
    } catch (error) {
      toast({
        title: "Failed to unblock user",
        description: "Please try again",
        variant: "destructive"
      })
    }
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
    <div className="min-h-screen bg-muted/30 flex flex-col max-h-screen">
      {/* WhatsApp-style Header */}
      <header className="bg-background px-4 py-2.5 flex items-center gap-3 shadow-sm">
        <button 
          onClick={() => navigate(-1)}
          className="p-1.5 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        
        {/* User Avatar & Info */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {otherUser?.profile_picture_url ? (
            <img 
              src={otherUser.profile_picture_url} 
              alt={otherUser.full_name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-semibold">
              {otherUser?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h1 className="font-medium text-foreground truncate">
              {otherUser?.full_name || 'Loading...'}
            </h1>
            {userId && (
              <p className={`text-xs ${getStatusColor(getOnlineStatus(userId))}`}>
                {getStatusText(getOnlineStatus(userId))}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {userId && !isBlocked && !isBlockedBy && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCallHistory(true)}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Call history"
            >
              <Phone className="h-5 w-5 text-primary" />
            </button>
            <div className="h-6 w-px bg-border" />
            <button
              onClick={() => startCall(userId, 'voice')}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Voice call"
            >
              <Phone className="h-5 w-5 text-green-600" />
            </button>
            <button
              onClick={() => startCall(userId, 'video')}
              className="p-2 hover:bg-muted rounded-full transition-colors"
              title="Video call"
            >
              <Video className="h-5 w-5 text-blue-600" />
            </button>
          </div>
        )}
      </header>

      {/* SafePay and Block/Unblock Bar (Below Header) */}
      {userId && otherUser && !isBlockedBy && (
        <div className="bg-background border-b border-border px-4 py-2 flex items-center justify-between shadow-sm">
          <SafePayDialog 
            otherUserId={userId}
            otherUserName={otherUser.full_name || 'User'}
          />
          
          {isBlocked ? (
            <BrandButton
              variant="outline"
              size="sm"
              onClick={handleUnblockUser}
              disabled={blockLoading}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Unblock User
            </BrandButton>
          ) : (
            <BrandButton
              variant="outline"
              size="sm"
              onClick={() => setShowBlockDialog(true)}
              disabled={blockLoading}
              className="gap-2"
            >
              <UserX className="h-4 w-4" />
              Block User
            </BrandButton>
          )}
        </div>
      )}

      {/* WhatsApp-style Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-2" style={{ 
        backgroundImage: 'linear-gradient(to bottom, rgba(0,0,0,0.02) 1px, transparent 1px)',
        backgroundSize: '100% 20px'
      }}>
        {isBlockedBy && (
          <div className="text-center text-muted-foreground py-12">
            <UserX className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>You cannot send messages to this user.</p>
          </div>
        )}
        {isBlocked && (
          <div className="text-center text-muted-foreground py-12">
            <UserX className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>You have blocked this user.</p>
          </div>
        )}
        {!isBlockedBy && !isBlocked && messages.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">
            <p>Send a message to start chatting</p>
          </div>
        ) : (!isBlockedBy && !isBlocked &&
          Object.entries(messageGroups).map(([date, msgs]) => (
            <div key={date} className="space-y-1 mb-4">
              {/* Date Divider */}
              <div className="flex justify-center my-3">
                <div className="bg-background/90 px-3 py-1 rounded-md shadow-sm">
                  <span className="text-xs text-muted-foreground font-medium">
                    {date === new Date().toLocaleDateString() ? 'TODAY' : date.toUpperCase()}
                  </span>
                </div>
              </div>

              {msgs.map((message) => {
                const isOwn = message.sender_id === user?.id
                const hasMedia = Boolean(message.media_url)
                const isAudio = message.media_type?.startsWith('audio/')
                const isImage = message.media_type?.startsWith('image/')
                
                return (
                  <div
                    key={message.id}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1 group`}
                    onContextMenu={(e) => {
                      e.preventDefault()
                      setReplyTo(message)
                    }}
                  >
                    <div className={`relative max-w-[75%] sm:max-w-[65%] ${
                      isOwn 
                        ? 'bg-[#dcf8c6] rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                        : 'bg-background rounded-tl-lg rounded-tr-lg rounded-br-lg'
                    } shadow-sm`}>
                      
                      {/* Reply preview */}
                      {message.reply_to_id && message.reply_to_content && (
                        <div className={`mx-2 mt-2 px-2 py-1.5 rounded border-l-4 ${
                          isOwn ? 'bg-white/50 border-green-600' : 'bg-muted/50 border-primary'
                        }`}>
                          <p className="text-xs font-medium text-muted-foreground">
                            {message.reply_to_sender}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {message.reply_to_content}
                          </p>
                        </div>
                      )}
                      
                      {/* Media Content */}
                      {hasMedia && (
                        <div className={message.content && message.content !== '🎤 Voice message' ? 'mb-1' : ''}>
                          {isAudio ? (
                            // Voice Message Player
                            <div className="p-2 flex items-center gap-2 min-w-[200px]">
                              <button
                                onClick={() => playAudio(message.id, imageUrls[message.media_url!] || '')}
                                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  isOwn ? 'bg-[#128c7e] hover:bg-[#0f7a6c]' : 'bg-primary hover:bg-primary/90'
                                } text-white transition-colors`}
                              >
                                {playingAudio === message.id ? (
                                  <Pause className="h-5 w-5" />
                                ) : (
                                  <Play className="h-5 w-5 ml-0.5" />
                                )}
                              </button>
                              
                              {/* Waveform */}
                              <div className="flex-1 h-8 flex items-center gap-px">
                                {Array.from({ length: 25 }).map((_, i) => (
                                  <div 
                                    key={i}
                                    className={`w-1 rounded-full ${
                                      isOwn ? 'bg-[#128c7e]' : 'bg-primary'
                                    } opacity-60`}
                                    style={{ height: `${20 + Math.random() * 60}%` }}
                                  />
                                ))}
                              </div>
                              
                               {/* Hidden audio element */}
                              <audio 
                                ref={(el) => {
                                  if (el) {
                                    audioRefs.current[message.id] = el
                                    console.log('Audio element created for:', message.id, imageUrls[message.media_url!])
                                  }
                                }}
                                src={imageUrls[message.media_url!] || ''} 
                                onEnded={() => setPlayingAudio(null)}
                                onLoadedMetadata={(e) => {
                                  console.log('Audio loaded successfully:', message.id)
                                }}
                                onError={(e) => {
                                  console.error('Audio playback error:', {
                                    messageId: message.id,
                                    mediaUrl: message.media_url,
                                    signedUrl: imageUrls[message.media_url!],
                                    error: e
                                  })
                                  toast({
                                    title: "Audio playback error",
                                    description: "Could not play voice message",
                                    variant: "destructive"
                                  })
                                }}
                                preload="metadata"
                              />
                            </div>
                          ) : isImage ? (
                            // Image Message
                            <div 
                              className="cursor-pointer rounded-t-lg overflow-hidden"
                              onClick={() => setViewingImage(imageUrls[message.media_url!])}
                            >
                              {loadingImages.has(message.media_url!) ? (
                                <div className="w-[200px] h-[150px] flex items-center justify-center bg-muted">
                                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                              ) : imageUrls[message.media_url!] ? (
                                <img 
                                  src={imageUrls[message.media_url!]} 
                                  alt="Shared"
                                  className="max-w-[250px] max-h-[250px] object-cover"
                                  onError={(e) => {
                                    console.error('Image load error:', message.media_url)
                                  }}
                                />
                              ) : (
                                <div className="w-[200px] h-[150px] flex items-center justify-center bg-muted text-muted-foreground text-xs">
                                  Failed to load
                                </div>
                              )}
                            </div>
                          ) : null}
                        </div>
                      )}

                      {/* Text Content */}
                      {message.content && message.content !== '📷 Image' && message.content !== '🎤 Voice message' && (
                        <div className="px-3 py-2">
                          <p className={`text-[15px] break-words ${isOwn ? 'text-gray-900' : 'text-foreground'}`}>
                            {message.content}
                          </p>
                        </div>
                      )}

                      {/* Timestamp & Status */}
                      <div className={`flex items-center justify-end gap-1 px-3 pb-1.5 ${!message.content || message.content === '🎤 Voice message' ? 'pt-1' : ''}`}>
                        <span className={`text-[11px] ${isOwn ? 'text-gray-600' : 'text-muted-foreground'}`}>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {isOwn && (
                          message.read_at ? (
                            <CheckCheck className="h-4 w-4 text-blue-500" />
                          ) : (
                            <Check className="h-4 w-4 text-gray-600" />
                          )
                        )}
                      </div>
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

      {/* End-to-End Encryption Footer */}
      <div className="bg-muted/30 px-3 py-1.5 flex items-center justify-center gap-1.5">
        <Lock className="h-3 w-3 text-muted-foreground" />
        <p className="text-[11px] text-muted-foreground">
          Messages are end-to-end encrypted
        </p>
      </div>

      {/* WhatsApp-style Message Input */}
      <div className="bg-background border-t border-border">
        {/* Reply Preview */}
        {replyTo && (
          <div className="px-3 pt-2 pb-1 border-b border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-primary">
                  Replying to {replyTo.sender_id === user?.id ? 'yourself' : otherUser?.full_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyTo.content}
                </p>
              </div>
              <button
                onClick={() => setReplyTo(null)}
                className="p-1 hover:bg-muted rounded-full ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="px-3 pt-3 pb-2">
            <div className="relative inline-block">
              <img 
                src={imagePreview} 
                alt="Preview" 
                className="max-h-24 rounded-lg"
              />
              <button
                onClick={() => {
                  setImagePreview(null)
                  setSelectedFile(null)
                  if (fileInputRef.current) fileInputRef.current.value = ''
                }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

        {canSendMessage ? (
          <form onSubmit={handleSendMessage} className="p-2 flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Emoji Picker */}
            <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0"
                  disabled={uploading}
                >
                  <Smile className="h-6 w-6 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start" side="top">
                <div className="grid grid-cols-5 gap-1">
                  {emojis.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setNewMessage(prev => prev + emoji)
                        setShowEmojiPicker(false)
                      }}
                      className="text-2xl hover:bg-muted p-2 rounded"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            
            {/* Message Input */}
            <div className="flex-1 min-w-0 bg-background rounded-full border border-border px-4 py-1.5">
              <input
                ref={inputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Message"
                className="w-full bg-transparent border-none outline-none text-sm"
                disabled={uploading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSendMessage(e)
                  }
                }}
              />
            </div>

            {/* Action Buttons */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-muted rounded-full transition-colors flex-shrink-0"
              disabled={uploading}
              title="Attach image"
            >
              <ImageIcon className="h-6 w-6 text-muted-foreground" />
            </button>

            {newMessage.trim() || selectedFile ? (
              <button
                type="submit"
                disabled={uploading}
                className="p-2.5 bg-primary hover:bg-primary/90 rounded-full transition-colors flex-shrink-0"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 text-primary-foreground animate-spin" />
                ) : (
                  <Send className="h-5 w-5 text-primary-foreground" />
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowVoiceRecorder(true)}
                className="p-2.5 bg-primary hover:bg-primary/90 rounded-full transition-colors flex-shrink-0"
                disabled={uploading}
                title="Record voice message"
              >
                <Mic className="h-5 w-5 text-primary-foreground" />
              </button>
            )}
          </form>
        ) : (
          <div className="text-center text-muted-foreground py-6">
            <p className="text-sm">
              {isBlockedBy 
                ? "You cannot send messages to this user" 
                : "You have blocked this user"}
            </p>
          </div>
        )}
      </div>

      {/* Image Viewer */}
      {viewingImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setViewingImage(null)}
        >
          <button
            onClick={() => setViewingImage(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full"
          >
            <X className="h-6 w-6 text-white" />
          </button>
          <img 
            src={viewingImage} 
            alt="Full size" 
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Call History Modal */}
      {showCallHistory && userId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="font-semibold text-lg">Call History</h2>
              <button
                onClick={() => setShowCallHistory(false)}
                className="p-1 hover:bg-muted rounded-full"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-64px)]">
              <CallHistory />
            </div>
          </div>
        </div>
      )}

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block this user?</AlertDialogTitle>
            <AlertDialogDescription>
              Blocked users cannot send you messages or call you. You can unblock them later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBlockUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Block User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default Chat