import React, { useState } from 'react'
import { ArrowLeft, HelpCircle, MessageSquare, Send, Search, ChevronDown, ChevronUp, Ticket, CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'

// FAQ Data
const faqCategories = [
  {
    category: 'Getting Started',
    questions: [
      { q: 'How do I create an account?', a: 'Click "Sign Up" on the welcome page, enter your email, password, and name. Complete your profile to access all features.' },
      { q: 'What is NC (NaijaCoin)?', a: 'NC is our platform currency. 1 NC = ₦1. Earn through tasks, referrals, and work. Use for purchases or withdraw to bank.' },
      { q: 'How do I become a verified expert?', a: 'Go to Expert Application, fill your details and portfolio. Admin reviews within 3-5 business days.' },
    ]
  },
  {
    category: 'Payments & Wallet',
    questions: [
      { q: 'How do I deposit money?', a: 'Go to Wallet → Deposit, enter amount, pay via Paystack. Funds are credited instantly.' },
      { q: 'How do I withdraw?', a: 'Wallet → Withdraw, enter bank details and amount (min ₦1000). Processed within 24-48 hours.' },
      { q: 'What is SafePay?', a: 'Escrow system that holds payment until work is delivered and approved. Protects both buyers and sellers.' },
    ]
  },
  {
    category: 'Orders & Services',
    questions: [
      { q: 'How do I hire a freelancer?', a: 'Browse experts, view profiles, then click "Hire" to see their services or send a custom request.' },
      { q: 'What if I\'m not satisfied with the work?', a: 'Request revisions first. If issues persist, contact support for dispute resolution.' },
      { q: 'How long until my order is delivered?', a: 'Delivery time is set by the seller. Check the gig description for the timeline.' },
    ]
  },
  {
    category: 'Account & Security',
    questions: [
      { q: 'How do I reset my password?', a: 'Click "Forgot Password" on login page, enter your email, and follow the reset link.' },
      { q: 'How do I set up a PIN?', a: 'Go to Settings → Security → Set Transaction PIN. Required for wallet operations.' },
      { q: 'How do I delete my account?', a: 'Contact support with your request. Note: This action cannot be undone.' },
    ]
  }
]

const ticketCategories = [
  'Payment Issue',
  'Order Problem',
  'Account Access',
  'Refund Request',
  'Report User',
  'Technical Bug',
  'Feature Request',
  'Other'
]

const HelpCenter = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { profile } = useProfile()
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('faq')
  
  // Ticket form state
  const [ticketForm, setTicketForm] = useState({
    name: profile?.full_name || '',
    email: user?.email || '',
    category: '',
    subject: '',
    description: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Fetch user's tickets
  const { data: myTickets = [], refetch: refetchTickets } = useQuery({
    queryKey: ['my-support-tickets', user?.id],
    queryFn: async () => {
      if (!user) return []
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data || []
    },
    enabled: !!user
  })

  // Filter FAQs based on search
  const filteredFaqs = faqCategories.map(cat => ({
    ...cat,
    questions: cat.questions.filter(q => 
      q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.questions.length > 0)

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!ticketForm.category || !ticketForm.subject || !ticketForm.description) {
      toast.error('Please fill in all required fields')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user?.id || null,
          name: ticketForm.name,
          email: ticketForm.email,
          category: ticketForm.category,
          subject: ticketForm.subject,
          description: ticketForm.description,
          priority: ticketForm.category === 'Payment Issue' || ticketForm.category === 'Refund Request' ? 'high' : 'medium'
        })

      if (error) throw error

      toast.success('Support ticket submitted!', {
        description: 'We\'ll respond within 24-48 hours.'
      })

      setTicketForm(prev => ({
        ...prev,
        category: '',
        subject: '',
        description: ''
      }))

      refetchTickets()
    } catch (error) {
      console.error('Error submitting ticket:', error)
      toast.error('Failed to submit ticket. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Open</Badge>
      case 'in_progress':
        return <Badge className="gap-1 bg-yellow-500"><AlertCircle className="h-3 w-3" /> In Progress</Badge>
      case 'resolved':
        return <Badge className="gap-1 bg-green-500"><CheckCircle className="h-3 w-3" /> Resolved</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Back</span>
          </button>
          <Logo />
          <div className="w-16" />
        </div>
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Help Center</h1>
          <p className="text-muted-foreground">Find answers or get support from our team</p>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="faq" className="gap-2">
              <HelpCircle className="h-4 w-4" />
              FAQ
            </TabsTrigger>
            <TabsTrigger value="ticket" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Submit Ticket
            </TabsTrigger>
            <TabsTrigger value="my-tickets" className="gap-2">
              <Ticket className="h-4 w-4" />
              My Tickets
              {myTickets.length > 0 && (
                <Badge variant="secondary" className="ml-1">{myTickets.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search help articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* FAQ List */}
            {filteredFaqs.map((category) => (
              <Card key={category.category}>
                <CardHeader>
                  <CardTitle className="text-lg">{category.category}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {category.questions.map((faq, idx) => {
                    const faqId = `${category.category}-${idx}`
                    const isExpanded = expandedFaq === faqId
                    
                    return (
                      <div key={idx} className="border rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedFaq(isExpanded ? null : faqId)}
                          className="w-full text-left p-4 hover:bg-accent/50 transition-colors flex items-center justify-between"
                        >
                          <span className="font-medium">{faq.q}</span>
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                        {isExpanded && (
                          <div className="px-4 pb-4 text-muted-foreground text-sm">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            ))}

            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Can't find what you're looking for?{' '}
                  <button 
                    onClick={() => setActiveTab('ticket')}
                    className="text-primary hover:underline font-medium"
                  >
                    Submit a support ticket
                  </button>
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Submit Ticket Tab */}
          <TabsContent value="ticket">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Submit a Support Ticket
                </CardTitle>
                <CardDescription>
                  Describe your issue and we'll get back to you within 24-48 hours
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitTicket} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Your Name *</Label>
                      <Input
                        id="name"
                        value={ticketForm.name}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Full name"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={ticketForm.email}
                        onChange={(e) => setTicketForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={ticketForm.category}
                      onValueChange={(value) => setTicketForm(prev => ({ ...prev, category: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {ticketCategories.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject *</Label>
                    <Input
                      id="subject"
                      value={ticketForm.subject}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Brief description of your issue"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description *</Label>
                    <Textarea
                      id="description"
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Please provide as much detail as possible. Include order IDs, screenshots info, etc."
                      rows={5}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full gap-2" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        Submit Ticket
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* My Tickets Tab */}
          <TabsContent value="my-tickets">
            {!user ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground mb-4">Please log in to view your support tickets</p>
                  <Button onClick={() => navigate('/login')}>Log In</Button>
                </CardContent>
              </Card>
            ) : myTickets.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center">
                  <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">You haven't submitted any support tickets yet</p>
                  <Button onClick={() => setActiveTab('ticket')}>Submit Your First Ticket</Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {myTickets.map((ticket: any) => (
                  <Card key={ticket.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">{ticket.subject}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{ticket.category}</Badge>
                            {getStatusBadge(ticket.status)}
                          </CardDescription>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground line-clamp-2">{ticket.description}</p>
                      {ticket.admin_response && (
                        <div className="mt-3 p-3 bg-primary/5 rounded-lg border border-primary/20">
                          <p className="text-xs font-medium text-primary mb-1">Admin Response:</p>
                          <p className="text-sm">{ticket.admin_response}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Contact */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Need Immediate Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open('https://wa.me/2348167140857', '_blank')}
              >
                WhatsApp: 08167140857
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => window.open('mailto:support@naijalancers.name.ng', '_blank')}
              >
                Email: Support@Naijalancers.name.ng
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default HelpCenter
