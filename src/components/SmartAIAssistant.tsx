import React, { useState, useRef, useEffect, useCallback } from 'react'
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

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface SmartAIAssistantProps {
  context?: string
}

const SmartAIAssistant: React.FC<SmartAIAssistantProps> = ({ context }) => {
  const { user } = useAuth()
  const { profile } = useProfile()
  const { toast } = useToast()
  const location = useLocation()
  
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  // Initialize position in top-right area
  const [position, setPosition] = useState({ x: 0, y: 100 })
  const [suggestions] = useState([
    "How do I post a job?",
    "How can I become an expert?",
    "What tasks can I do to earn money?",
    "How does the wallet system work?",
    "How do I connect with other professionals?"
  ])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Add welcome message based on current page context
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

  // Dragging functionality with refs for immediate updates
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current) return
      
      const newX = e.clientX - dragStartRef.current.x
      const newY = e.clientY - dragStartRef.current.y
      
      // Keep within viewport bounds
      const maxX = window.innerWidth - 320
      const maxY = window.innerHeight - 400
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      })
    }

    const handleMouseUp = () => {
      isDraggingRef.current = false
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('button')) return
    
    e.preventDefault()
    isDraggingRef.current = true
    const rect = cardRef.current?.getBoundingClientRect()
    if (rect) {
      dragStartRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      }
    }
  }

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
            wallet_balance: profile?.wallet_balance,
            connections_count: profile?.connections_count
          }
        }
      })

      if (error) {
        throw error
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || 'I apologize, but I encountered an issue processing your request. Please try asking in a different way!',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (error) {
      console.error('Error sending message to AI:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I\'m having trouble connecting right now. Please try again in a moment! 😊',
        timestamp: new Date()
      }

      setMessages(prev => [...prev, errorMessage])
      
      toast({
        title: "Connection Error",
        description: "Unable to reach the AI assistant. Please try again.",
        variant: "destructive"
      })
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

  return (
    <>
      {/* Floating AI Button - always visible */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <Bot className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </Button>
        </div>
      )}

      {/* AI Chat Window - draggable */}
      {isOpen && (
        <div 
          ref={cardRef}
          className="fixed z-50 transition-none"
          style={{
            left: position.x === 0 ? 'auto' : `${position.x}px`,
            right: position.x === 0 ? '1.5rem' : 'auto',
            top: `${position.y}px`,
          }}
        >
          <Card className={`w-80 shadow-2xl border-primary/20 ${isMinimized ? 'h-16' : 'h-96'} transition-all duration-300`}>
        <CardHeader 
          className="py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          style={{ touchAction: 'none' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 text-white/70" />
              <div className="relative">
                <Bot className="h-5 w-5" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-sm font-medium">NaijaLancers AI</CardTitle>
                <div className="text-xs opacity-90">Drag me anywhere!</div>
              </div>
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
          <CardContent className="p-0 flex flex-col h-80">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20">
              {messages.length === 0 && (
                <div className="text-center py-4">
                  <Sparkles className="h-8 w-8 text-primary mx-auto mb-2" />
                  <p className="text-sm text-text-secondary">Start a conversation with your AI assistant!</p>
                </div>
              )}
              
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    msg.type === 'user'
                      ? 'bg-primary text-white'
                      : 'bg-white border border-border text-text-primary'
                  }`}>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className={`text-xs mt-1 opacity-70 ${
                      msg.type === 'user' ? 'text-white' : 'text-text-secondary'
                    }`}>
                      {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-border rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="flex space-x-1">
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                        <div className="w-1 h-1 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      </div>
                      <span className="text-text-secondary">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestions */}
            {messages.length <= 1 && (
              <div className="px-4 py-2 border-t border-border">
                <div className="text-xs text-text-secondary mb-2">Quick suggestions:</div>
                <div className="flex flex-wrap gap-1">
                  {suggestions.slice(0, 3).map((suggestion, index) => (
                    <Badge
                      key={index}
                      variant="outline"
                      className="cursor-pointer text-xs py-1 px-2 hover:bg-primary hover:text-white transition-colors"
                      onClick={() => handleSuggestionClick(suggestion)}
                    >
                      {suggestion}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t border-border bg-background">
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
                    className="text-xs text-text-secondary hover:text-primary transition-colors"
                  >
                    Clear chat
                  </button>
                  <div className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-text-secondary">AI Online</span>
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