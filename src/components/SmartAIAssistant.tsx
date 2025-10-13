import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, Minimize2, Maximize2, Sparkles, MessageCircle, HelpCircle, Zap, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { BrandInput } from '@/components/ui/brand-input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
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
  const [hasInteracted, setHasInteracted] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [position, setPosition] = useState({ x: window.innerWidth - 350, y: 100 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [hasBeenDragged, setHasBeenDragged] = useState(false)
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

  // Auto-open after 1 minute of no interaction
  useEffect(() => {
    if (!hasInteracted) {
      const timer = setTimeout(() => {
        setIsOpen(true)
        setHasInteracted(true)
      }, 60000) // 1 minute

      return () => clearTimeout(timer)
    }
  }, [hasInteracted])

  useEffect(() => {
    // Add welcome message based on current page context - only when user opens it
    if (isOpen && messages.length === 0 && hasInteracted) {
      const pageContext = getPageContext()
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'assistant',
        content: `Hello! 👋 I'm your NaijaLancers AI assistant. I'm here to help you ${pageContext}. What would you like to know?`,
        timestamp: new Date()
      }
      setMessages([welcomeMessage])
    }
  }, [isOpen, location.pathname, hasInteracted])

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

    // Create placeholder for streaming assistant response
    const assistantId = (Date.now() + 1).toString()
    const assistantMessage: Message = {
      id: assistantId,
      type: 'assistant',
      content: '',
      timestamp: new Date()
    }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const STREAM_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`
      
      // Prepare conversation history in proper format
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }))

      const response = await fetch(STREAM_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          messages: [
            ...conversationHistory,
            { role: 'user', content: userMessage.content }
          ],
          context: getCurrentContext(),
          userProfile: {
            full_name: profile?.full_name,
            profession: profile?.profession,
            is_expert: profile?.is_expert,
            wallet_balance: profile?.wallet_balance,
            connections_count: profile?.connections_count
          }
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        
        if (response.status === 429) {
          throw new Error(errorData.message || 'Rate limit exceeded. Please wait a moment.')
        }
        if (response.status === 402) {
          throw new Error(errorData.message || 'AI service temporarily unavailable.')
        }
        throw new Error(errorData.message || 'Failed to connect to AI')
      }

      if (!response.body) throw new Error('No response stream')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let textBuffer = ''
      let accumulatedContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        textBuffer += decoder.decode(value, { stream: true })

        // Process line by line for token-by-token rendering
        let newlineIndex: number
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex)
          textBuffer = textBuffer.slice(newlineIndex + 1)

          if (line.endsWith('\r')) line = line.slice(0, -1)
          if (line.startsWith(':') || line.trim() === '') continue
          if (!line.startsWith('data: ')) continue

          const jsonStr = line.slice(6).trim()
          if (jsonStr === '[DONE]') break

          try {
            const parsed = JSON.parse(jsonStr)
            const content = parsed.choices?.[0]?.delta?.content

            if (content) {
              accumulatedContent += content
              // Update the assistant message with accumulated content
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ))
            }
          } catch (parseError) {
            // Partial JSON - put it back and wait for more data
            textBuffer = line + '\n' + textBuffer
            break
          }
        }
      }

      // Final flush for any remaining buffered content
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw || raw.startsWith(':') || !raw.startsWith('data: ')) continue
          const jsonStr = raw.slice(6).trim()
          if (jsonStr === '[DONE]') continue
          try {
            const parsed = JSON.parse(jsonStr)
            const content = parsed.choices?.[0]?.delta?.content
            if (content) {
              accumulatedContent += content
              setMessages(prev => prev.map(msg => 
                msg.id === assistantId 
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ))
            }
          } catch {}
        }
      }

      // If no content was received, show error
      if (!accumulatedContent) {
        throw new Error('No response received from AI')
      }

    } catch (error) {
      console.error('Error streaming AI response:', error)
      
      const errorContent = error instanceof Error 
        ? error.message 
        : 'I\'m having trouble connecting right now. Please try again! 😊'

      // Update the assistant message with error
      setMessages(prev => prev.map(msg => 
        msg.id === assistantId 
          ? { ...msg, content: errorContent }
          : msg
      ))
      
      toast({
        title: "Connection Issue",
        description: errorContent,
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      console.log('🎯 Drag started')
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
        const newY = Math.max(0, Math.min(e.clientY - dragOffset.y, window.innerHeight - (isMinimized ? 80 : 420)))
        setPosition({ x: newX, y: newY })
        
        if (!hasBeenDragged) {
          console.log('✅ AI Assistant is now draggable!')
          toast({
            title: "AI Assistant Moved",
            description: "You can drag me anywhere on the screen!",
          })
          setHasBeenDragged(true)
        }
      }
    }

    const handleMouseUp = () => {
      if (isDragging) {
        console.log('🎯 Drag ended at position:', position)
        setIsDragging(false)
      }
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset, isMinimized, hasBeenDragged, position, toast])

  return (
    <>
      {/* Floating AI Button - always visible */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => {
              setIsOpen(true)
              setHasInteracted(true)
            }}
            className="w-14 h-14 rounded-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300 group"
          >
            <Bot className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
          </Button>
        </div>
      )}

      {/* AI Chat Window - floating above content */}
      {isOpen && (
        <div 
          ref={dragRef}
          className="fixed z-50"
          style={{ 
            left: `${position.x}px`, 
            top: `${position.y}px`,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
          onMouseDown={handleMouseDown}
        >
          <Card className={`w-80 shadow-2xl border-primary/20 ${isMinimized ? 'h-16' : 'h-96'} transition-all duration-300`}>
        <CardHeader className="drag-handle py-3 px-4 bg-gradient-to-r from-primary to-primary/80 text-white cursor-grab active:cursor-grabbing select-none">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GripVertical className="h-4 w-4 opacity-50" />
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