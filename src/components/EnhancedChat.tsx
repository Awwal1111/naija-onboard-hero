import React, { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Paperclip, Smile, Send, X, Image as ImageIcon, FileText, Video, ShieldOff, Mic, Zap, MapPin } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useChat } from '@/hooks/useChat'
import { useBlockUser } from '@/hooks/useBlockUser'
import { useSecureFileUpload } from '@/hooks/useSecureFileUpload'
import { useWebRTCContext } from '@/contexts/WebRTCContext'
import { useTypingIndicator } from '@/hooks/useTypingIndicator'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { useToast } from '@/hooks/use-toast'
import { Card } from '@/components/ui/card'
import CallControls from '@/components/CallControls'
import ActiveCallInterface from '@/components/ActiveCallInterface'
import VoiceRecorder from '@/components/VoiceRecorder'
import ChatContextBadge from '@/components/ChatContextBadge'
import { TypingIndicator } from '@/components/TypingIndicator'
import { ReadReceipt } from '@/components/ReadReceipt'
import { QuickReplyTemplates } from '@/components/QuickReplyTemplates'
import { LocationShareButton } from '@/components/chat/LocationShareButton'
import { LocationMessage, parseLocationMessage, createLocationMessageContent } from '@/components/chat/LocationMessage'

// Simple emoji picker component
const EmojiPicker = ({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) => {
  const emojis = ['😀', '😂', '😍', '🤔', '😊', '👍', '👎', '❤️', '🔥', '💯', '🎉', '✨', '👏', '🙌', '💪', '🤝']
  
  return (
    <Card className="absolute bottom-12 right-0 p-3 z-10 bg-background border shadow-lg">
      <div className="flex flex-wrap gap-2 w-48">
        {emojis.map((emoji, index) => (
          <button
            key={index}
            onClick={() => onSelect(emoji)}
            className="text-xl hover:bg-accent p-1 rounded"
          >
            {emoji}
          </button>
        ))}
      </div>
      <button
        onClick={onClose}
        className="absolute top-1 right-1 p-1 hover:bg-accent rounded"
      >
        <X className="h-3 w-3" />
      </button>
    </Card>
  )
}

const MediaPreview = ({ url, type, onRemove }: { url: string; type: string; onRemove: () => void }) => {
  return (
    <div className="relative inline-block m-1">
      {type.startsWith('image/') ? (
        <img src={url} alt="Preview" className="max-h-20 max-w-20 rounded border" />
      ) : type.startsWith('video/') ? (
        <video src={url} className="max-h-20 max-w-20 rounded border" controls />
      ) : (
        <div className="flex items-center p-2 bg-muted rounded border max-w-20">
          <FileText className="h-4 w-4 mr-1" />
          <span className="text-xs truncate">File</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-1"
      >
        <X className="h-2 w-2" />
      </button>
    </div>
  )
}

const EnhancedChat = () => {
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user } = useAuth()
  const { messages, sendMessage, otherUser, loading, chat } = useChat(userId!)
  const { isBlocked, isBlockedBy, canSendMessage } = useBlockUser(userId!)
  const { uploadFile, uploadProgress } = useSecureFileUpload()
  const { isOtherTyping, setTyping } = useTypingIndicator(chat?.id || null, userId!)
  const { toast } = useToast()
  
  const [newMessage, setNewMessage] = useState('')
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false)
  const [showQuickReplies, setShowQuickReplies] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // WebRTC for voice/video calls - use shared context
  const {
    callState,
    localStream,
    remoteStream,
    screenStream,
    isMuted,
    isVideoOff,
    isScreenSharing,
    startCall,
    answerCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
    switchToAudioOnly,
    startScreenShare,
    stopScreenShare,
    canScreenShare
  } = useWebRTCContext()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Clean up preview URLs
  useEffect(() => {
    return () => {
      previewUrls.forEach(url => URL.revokeObjectURL(url))
    }
  }, [previewUrls])

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    const maxFiles = 5
    const maxSize = 20 * 1024 * 1024 // 20MB
    
    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast({
          title: "File too large",
          description: `${file.name} is larger than 20MB`,
          variant: "destructive"
        })
        return false
      }
      return true
    }).slice(0, maxFiles)

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles].slice(0, maxFiles))
      
      // Create preview URLs
      validFiles.forEach(file => {
        const url = URL.createObjectURL(file)
        setPreviewUrls(prev => [...prev, url])
      })
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && selectedFiles.length === 0) || uploading) return

    setUploading(true)
    
    try {
      let mediaUrl = null
      let mediaType = null

      // Upload files if any
      if (selectedFiles.length > 0) {
        const file = selectedFiles[0] // For now, send one file at a time
        const uploadResult = await uploadFile(file, 'chat-uploads', `${user?.id}/${userId}/${Date.now()}-${file.name}`)
        
        if (uploadResult.error) {
          toast({
            title: "Upload failed",
            description: uploadResult.error,
            variant: "destructive"
          })
          return
        }
        
        mediaUrl = uploadResult.url
        mediaType = file.type
      }

      // Send message with media
      await sendMessage(newMessage.trim() || '📎 Attachment', mediaUrl, mediaType)
      
      // Clear form
      setNewMessage('')
      setSelectedFiles([])
      setPreviewUrls(prev => {
        prev.forEach(url => URL.revokeObjectURL(url))
        return []
      })
      
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji)
    setShowEmojiPicker(false)
  }

  const handleSendVoiceMessage = async (audioBlob: Blob, duration: number) => {
    setUploading(true)
    
    try {
      // Upload audio file
      const fileName = `voice-${Date.now()}.webm`
      const uploadResult = await uploadFile(
        new File([audioBlob], fileName, { type: 'audio/webm' }),
        'chat-uploads',
        `${user?.id}/${userId}/${fileName}`
      )
      
      if (uploadResult.error) {
        toast({
          title: "Upload failed",
          description: uploadResult.error,
          variant: "destructive"
        })
        return
      }
      
      // Send message with voice note
      await sendMessage(
        `🎤 Voice message (${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')})`,
        uploadResult.url,
        'audio/webm'
      )
      
      // Show success message
      toast({
        title: "Voice message sent",
        description: "Your voice message was sent successfully"
      })
      
      setShowVoiceRecorder(false)
      
    } catch (error) {
      console.error('Error sending voice message:', error)
      toast({
        title: "Error",
        description: "Failed to send voice message",
        variant: "destructive"
      })
    } finally {
      setUploading(false)
    }
  }

  // Handle location share
  const handleLocationShare = async (location: { lat: number; lng: number; address: string }) => {
    const locationContent = createLocationMessageContent(location);
    try {
      await sendMessage(locationContent, null, 'location');
      toast({
        title: "Location shared",
        description: "Your location has been sent"
      });
    } catch (error) {
      console.error('Error sharing location:', error);
      toast({
        title: "Error",
        description: "Failed to share location",
        variant: "destructive"
      });
    }
  };

  const renderMessage = (message: any) => {
    const isOwn = message.sender_id === user?.id
    const hasContext = message.payload?.context
    
    // Check if this is a location message
    const locationData = parseLocationMessage(message.content);
    
    return (
      <div
        key={message.id}
        className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-4`}
      >
        {/* Context Badge - Show above message for context messages */}
        {hasContext && (
          <ChatContextBadge 
            payload={message.payload} 
            className={`mb-1 ${isOwn ? 'mr-2' : 'ml-2'}`}
          />
        )}
        
        {/* Location Message */}
        {locationData ? (
          <LocationMessage location={locationData} isOwn={isOwn} />
        ) : (
          <div
            className={`max-w-[70%] px-4 py-2 rounded-2xl ${
              isOwn
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}
          >
            {/* Media content */}
            {message.media_url && (
              <div className="mb-2">
                {message.media_type?.startsWith('image/') ? (
                  <img 
                    src={message.media_url} 
                    alt="Shared image" 
                    className="max-w-full rounded-lg cursor-pointer"
                    onClick={() => window.open(message.media_url, '_blank')}
                  />
                ) : message.media_type?.startsWith('video/') ? (
                  <video 
                    src={message.media_url} 
                    className="max-w-full rounded-lg" 
                    controls 
                  />
                ) : message.media_type?.startsWith('audio/') ? (
                  <audio 
                    src={message.media_url} 
                    controls 
                    className="max-w-full"
                  />
                ) : (
                  <a 
                    href={message.media_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 bg-background/20 rounded border"
                  >
                    <FileText className="h-4 w-4" />
                    <span className="text-sm">Download file</span>
                  </a>
                )}
              </div>
            )}
            
            {/* Text content */}
            {message.content && !locationData && (
              <p className="text-sm">{message.content}</p>
            )}
            
            <div className="flex items-center justify-end gap-1 mt-1">
              <span className="text-xs opacity-70">
                {new Date(message.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
              {/* Read receipt for own messages */}
              {isOwn && <ReadReceipt isRead={!!message.read_at} />}
            </div>
          </div>
        )}
      </div>
    )
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

  // Show active call interface if in call
  if (callState.isInCall) {
    return (
      <ActiveCallInterface
        localStream={localStream}
        remoteStream={remoteStream}
        screenStream={screenStream}
        callType={callState.callType!}
        isMuted={isMuted}
        isVideoOff={isVideoOff}
        isScreenSharing={isScreenSharing}
        remoteUserName={otherUser?.full_name || 'User'}
        remoteUserAvatar={otherUser?.profile_picture_url}
        onEndCall={endCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchToAudioOnly={switchToAudioOnly}
        onStartScreenShare={canScreenShare ? startScreenShare : undefined}
        onStopScreenShare={stopScreenShare}
        callStatus={callState.status}
      />
    )
  }

  // Show blocked UI if either party has blocked the other
  if (isBlocked || isBlockedBy) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="bg-background border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
          </button>
          
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-text-primary truncate">
              {otherUser?.full_name || 'User'}
            </h1>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center max-w-md">
            <ShieldOff className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {isBlocked ? "You blocked this user" : "This user has blocked you"}
            </h2>
            <p className="text-text-secondary">
              {isBlocked 
                ? "You cannot send or receive messages from this user. Unblock them to restore messaging."
                : "You cannot send messages to this user."
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-background border-b border-border px-4 py-3 flex items-center gap-3 sticky top-0 z-20">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-accent rounded-full"
        >
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-text-primary truncate">
            {otherUser?.full_name || 'Loading...'}
          </h1>
          <p className="text-sm text-primary">Online</p>
        </div>

        {/* Call Controls */}
        {userId && !isBlocked && !isBlockedBy && (
          <CallControls
            onStartVoiceCall={() => startCall(userId, 'voice')}
            onStartVideoCall={() => startCall(userId, 'video')}
          />
        )}
      </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="text-center text-text-secondary py-8">
            <p>Start a conversation!</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        
        {/* Typing Indicator */}
        {isOtherTyping && (
          <div className="flex items-start mb-4">
            <div className="bg-muted px-4 py-2 rounded-2xl">
              <TypingIndicator userName={otherUser?.full_name?.split(' ')[0]} />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <div className="px-4 py-2 border-t border-border">
          <VoiceRecorder
            onSendVoiceMessage={handleSendVoiceMessage}
            onCancel={() => setShowVoiceRecorder(false)}
          />
        </div>
      )}

      {/* File Previews */}
      {selectedFiles.length > 0 && (
        <div className="px-4 py-2 border-t border-border bg-muted/20">
          <div className="flex flex-wrap">
            {selectedFiles.map((file, index) => (
              <MediaPreview
                key={index}
                url={previewUrls[index]}
                type={file.type}
                onRemove={() => removeFile(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Reply Templates */}
      {showQuickReplies && (
        <div className="px-4 py-2 border-t border-border">
          <QuickReplyTemplates 
            onSelect={(text) => {
              setNewMessage(text);
              setShowQuickReplies(false);
            }}
            context="general"
          />
        </div>
      )}

      {/* Message Input */}
      <div className="border-t border-border p-4 relative">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2 hover:bg-accent rounded-full"
              disabled={uploading}
            >
              <Paperclip className="h-5 w-5 text-text-secondary" />
            </button>
            
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 hover:bg-accent rounded-full"
            >
              <Smile className="h-5 w-5 text-text-secondary" />
            </button>

            <button
              type="button"
              onClick={() => setShowVoiceRecorder(!showVoiceRecorder)}
              className="p-2 hover:bg-accent rounded-full"
              disabled={uploading || showVoiceRecorder}
            >
              <Mic className={`h-5 w-5 ${showVoiceRecorder ? 'text-destructive' : 'text-text-secondary'}`} />
            </button>
            
            {/* Quick Replies Toggle */}
            <button
              type="button"
              onClick={() => setShowQuickReplies(!showQuickReplies)}
              className={`p-2 hover:bg-accent rounded-full ${showQuickReplies ? 'bg-primary/10' : ''}`}
              title="Quick Replies"
            >
              <Zap className={`h-5 w-5 ${showQuickReplies ? 'text-primary' : 'text-text-secondary'}`} />
            </button>
            
            {/* Location Share Button */}
            <LocationShareButton
              onLocationSelect={handleLocationShare}
              disabled={uploading || !canSendMessage}
            />
          </div>
          
          <div className="flex-1">
            <BrandInput
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                // Trigger typing indicator
                if (e.target.value.length > 0) {
                  setTyping(true);
                }
              }}
              onBlur={() => setTyping(false)}
              placeholder="Type a message..."
              className="border-0 bg-muted resize-none"
              disabled={uploading}
            />
          </div>
          
          <BrandButton
            type="submit"
            size="sm"
            disabled={(!newMessage.trim() && selectedFiles.length === 0) || uploading || !canSendMessage}
            className="rounded-full w-10 h-10 p-0"
          >
            {uploading ? (
              <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </BrandButton>
        </form>
        
        {/* Upload Progress */}
        {uploadProgress.isUploading && (
          <div className="mt-2 text-xs text-text-secondary">
            Uploading... {Math.round(uploadProgress.progress)}%
          </div>
        )}

        {/* Emoji Picker */}
        {showEmojiPicker && (
          <EmojiPicker
            onSelect={handleEmojiSelect}
            onClose={() => setShowEmojiPicker(false)}
          />
        )}
      </div>
    </div>
  )
}

export default EnhancedChat