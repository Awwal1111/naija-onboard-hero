import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, MessageCircle, HelpCircle, Zap, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandInput } from '@/components/ui/brand-input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { useLocation } from 'react-router-dom'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SmartAIAssistantProps {
  context?: string
}

/**
 * CRITICAL: In MiniPay, this component is HIDDEN
 * The floating AI button causes re-renders that trigger flickering
 */
const SmartAIAssistant: React.FC<SmartAIAssistantProps> = ({ context }) => {
  // CRITICAL: Return null BEFORE any hooks in MiniPay
  if (isMiniPayEnv) {
    return null;
  }

  return <SmartAIAssistantInternal context={context} />;
};

// Internal component - only renders in non-MiniPay environments
const SmartAIAssistantInternal: React.FC<SmartAIAssistantProps> = ({ context }) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { toast } = useToast()
  const location = useLocation()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [position, setPosition] = useState({ x: window.innerWidth - 380, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [suggestions] = useState([
    "How do I post a job?",
    "How can I become an expert?",
    "What tasks can I do to earn money?",
    "How does the wallet system work?",
    "How do I connect with other professionals?"
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Scroll to bottom when chat opens or un-minimizes
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(scrollToBottom, 100)
    }
  }, [isOpen, isMinimized])

  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    // Add welcome message based on current page context - only when user opens it
    if (isOpen && messages.length === 0) {
      const pageContext = getPageContext()
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Hello! 👋 I'm your NaijaLancers AI assistant. I'm here to help you ${pageContext}. What would you like to know?`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, location.pathname])

  const getPageContext = () => {
    const path = location.pathname
    switch (path) {
      case '/feed':
        return 'navigate the feed, create posts, and connect with professionals'
      case '/experts':
        return 'find experts and understand their services'
      case '/jobs':
        return 'explore job opportunities and apply for positions'
      case '/earn':
        return 'discover ways to earn money on the platform'
      case '/profile':
        return 'manage your profile and showcase your skills'
      case '/post-job':
        return 'create compelling job posts to find the right freelancers'
      case '/expert-application':
        return 'with your expert application process'
      case '/chat':
        return 'communicate effectively with other users'
      default:
        return 'make the most of the NaijaLancers platform'
    }
  }

  const getCurrentContext = () => {
    const path = location.pathname
    let contextInfo = `Current page: ${path}`
    
    if (context) {
      contextInfo += ` | Additional context: ${context}`
    }
    
    // Add user role context
    if (profile?.is_expert) {
      contextInfo += ' | User is a verified expert'
    }
    
    if (profile?.profession) {
      contextInfo += ` | User profession: ${profile.profession}`
    }
    
    return contextInfo
  }

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: message.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setMessage('')
    setIsLoading(true)

    try {
      const { data, error } = await supabase.functions.invoke('ai-assistant', {
        body: {
          message: userMessage.content,
          context: getCurrentContext(),
          userProfile: {
            full_name: profile?.full_name,
            profession: profile?.profession,
            is_expert: profile?.is_expert,
          }
        }
      })

      if (error) throw error

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || data.error || 'Sorry, I couldn\'t process that. Try again! 😊',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('AI error:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Connection issue. Please try again! 😊',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setMessage(suggestion)
    inputRef.current?.focus()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([])
    const welcomeMessage: Message = {
      id: Date.now().toString(),
      type: 'assistant',
      content: `Chat cleared! How can I help you with NaijaLancers today? 😊`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return // Disable dragging on mobile
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, Math.min(e.clientX - dragOffset.x, window.innerWidth - 350))
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - 100))
        setPosition({ x: newX, y: newY })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <>
      {/* Floating AI Button - positioned higher to avoid bottom nav */}
      {!isOpen && (
        <div className="fixed bottom-24 md:bottom-8 right-4 md:right-6 z-[60]">
          <Button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-xl hover:shadow-2xl transition-all duration-300 group border-2 border-white/20"
          >
            <Bot className="h-6 w-6 md:h-7 md:w-7 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 md:w-5 md:h-5 bg-green-500 rounded-full animate-pulse border-2 border-white" />
          </Button>
        </div>
      )}

      {/* AI Chat Window - responsive positioning */}
      {isOpen && (
        <div 
          ref={dragRef}
          className={`fixed z-[70] ${
            isMobile 
              ? 'inset-x-2 bottom-20 top-16' // Mobile: full screen with padding
              : ''
          }`}
          style={!isMobile ? { 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'default'
          } : undefined}
          onMouseDown={handleMouseDown}
        >
          <Card className={`${
            isMobile ? 'w-full h-full' : 'w-96'
          } shadow-2xl border-2 border-primary/30 bg-background ${
            isMinimized ? 'h-16' : isMobile ? 'h-full' : 'h-[500px]'
          } transition-all duration-300 flex flex-col overflow-hidden`}>
        <CardHeader className={`drag-handle py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white ${
          isMobile ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
        } select-none flex-shrink-0`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {!isMobile && <GripVertical className="h-4 w-4 opacity-70" />}
              <Bot className="h-5 w-5" />
              <CardTitle className="text-sm md:text-base font-medium">NaijaLancers AI</CardTitle>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsOpen(false)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {!isMinimized && (
          <CardContent className={`p-0 flex flex-col ${isMobile ? 'flex-1' : 'h-80'}`}>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 bg-muted/20">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Start a conversation with your AI assistant!</p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] md:max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border text-foreground'
                  }`}>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                    <div className={`text-xs mt-1 opacity-70 ${
                      msg.type === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-card border border-border rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-muted-foreground">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <div className="px-3 md:px-4 py-2 border-t border-border flex-shrink-0">
                <div className="text-xs text-muted-foreground mb-2">Quick suggestions:</div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.slice(0, isMobile ? 2 : 3).map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer text-xs py-1 px-2 hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-3 md:p-4 border-t border-border bg-background flex-shrink-0">
              <div className="flex items-center gap-2">
                <BrandInput
                  ref={inputRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about NaijaLancers..."
                  disabled={isLoading}
                  className="flex-1 text-sm"
                />
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || isLoading}
                  size="sm"
                  className="px-3"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              
              {messages.length > 0 && (
                <div className="flex justify-between items-center mt-2">
                  <button
                    onClick={clearChat}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Clear chat
                  </button>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-muted-foreground">AI Online</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
        </div>
      )}
    </>
  )
}

export default SmartAIAssistant