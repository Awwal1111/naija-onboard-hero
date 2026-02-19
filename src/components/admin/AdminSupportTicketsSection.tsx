import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import {
  MessageSquare, Clock, CheckCircle, AlertCircle, Loader2,
  RefreshCw, Send, User, Mail, AlertTriangle, Ticket
} from 'lucide-react'

interface SupportTicket {
  id: string
  user_id: string | null
  name: string
  email: string
  category: string
  subject: string
  description: string
  priority: string
  status: string
  admin_response: string | null
  responded_by: string | null
  responded_at: string | null
  created_at: string
  updated_at: string
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  open: { label: 'Open', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300', icon: <Clock className="h-3 w-3" /> },
  urgent: { label: 'Urgent', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300', icon: <AlertTriangle className="h-3 w-3" /> },
  in_progress: { label: 'In Progress', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300', icon: <AlertCircle className="h-3 w-3" /> },
  resolved: { label: 'Resolved', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300', icon: <CheckCircle className="h-3 w-3" /> },
  closed: { label: 'Closed', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300', icon: <CheckCircle className="h-3 w-3" /> },
}

const PRIORITY_CONFIG: Record<string, string> = {
  low: 'bg-slate-100 text-slate-700',
  medium: 'bg-blue-100 text-blue-700',
  normal: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
}

export function AdminSupportTicketsSection() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [adminResponse, setAdminResponse] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchTickets()
  }, [statusFilter])

  const fetchTickets = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('support_tickets')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200)

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      setTickets((data || []) as SupportTicket[])
    } catch (error) {
      console.error('Error fetching tickets:', error)
      toast.error('Failed to load support tickets')
    } finally {
      setLoading(false)
    }
  }

  const openDetail = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setAdminResponse(ticket.admin_response || '')
    setShowDetail(true)
  }

  const updateTicket = async (id: string, updates: Record<string, any>) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', id)

      if (error) throw error
      toast.success('Ticket updated')
      fetchTickets()
      if (selectedTicket?.id === id) {
        setSelectedTicket({ ...selectedTicket, ...updates } as SupportTicket)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const handleRespond = async () => {
    if (!selectedTicket || !adminResponse.trim()) return

    await updateTicket(selectedTicket.id, {
      admin_response: adminResponse,
      responded_by: user?.id,
      responded_at: new Date().toISOString(),
      status: 'resolved',
      updated_at: new Date().toISOString()
    })
  }

  const openCount = tickets.filter(t => t.status === 'open' || t.status === 'urgent').length
  const inProgressCount = tickets.filter(t => t.status === 'in_progress').length
  const resolvedCount = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{openCount}</p>
              <p className="text-xs text-muted-foreground">Open / Urgent</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold">{resolvedCount}</p>
              <p className="text-xs text-muted-foreground">Resolved</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tickets</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchTickets}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Tickets List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : tickets.length === 0 ? (
        <Card className="p-8 text-center">
          <Ticket className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No support tickets found</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {tickets.map(ticket => {
            const statusConf = STATUS_CONFIG[ticket.status] || STATUS_CONFIG.open
            return (
              <Card
                key={ticket.id}
                className="p-4 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openDetail(ticket)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-medium">{ticket.subject}</span>
                      <Badge className={`text-xs gap-1 ${statusConf.color}`}>
                        {statusConf.icon}
                        {statusConf.label}
                      </Badge>
                      <Badge className={`text-xs ${PRIORITY_CONFIG[ticket.priority] || PRIORITY_CONFIG.medium}`}>
                        {ticket.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" /> {ticket.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {ticket.email}
                      </span>
                      <Badge variant="outline" className="text-xs">{ticket.category}</Badge>
                    </div>
                    <p className="text-sm mt-1 text-muted-foreground line-clamp-1">{ticket.description}</p>
                  </div>
                  <div className="text-right ml-4 shrink-0">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                    </span>
                    {ticket.admin_response && (
                      <Badge variant="outline" className="text-xs mt-1 gap-1">
                        <CheckCircle className="h-3 w-3" /> Responded
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Support Ticket
            </DialogTitle>
          </DialogHeader>

          {selectedTicket && (
            <div className="space-y-4">
              {/* Ticket Info */}
              <div>
                <h3 className="font-semibold text-lg">{selectedTicket.subject}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge className={STATUS_CONFIG[selectedTicket.status]?.color || ''}>
                    {STATUS_CONFIG[selectedTicket.status]?.label || selectedTicket.status}
                  </Badge>
                  <Badge className={PRIORITY_CONFIG[selectedTicket.priority] || ''}>
                    {selectedTicket.priority} priority
                  </Badge>
                  <Badge variant="outline">{selectedTicket.category}</Badge>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <User className="h-4 w-4" /> {selectedTicket.name}
                </span>
                <a href={`mailto:${selectedTicket.email}`} className="flex items-center gap-1 text-primary hover:underline">
                  <Mail className="h-4 w-4" /> {selectedTicket.email}
                </a>
              </div>

              {/* Description */}
              <div>
                <Label className="text-muted-foreground">Customer Message</Label>
                <div className="mt-1 p-3 bg-muted/50 rounded-lg text-sm whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Status Update */}
              <div>
                <Label>Update Status</Label>
                <Select
                  value={selectedTicket.status}
                  onValueChange={(v) => updateTicket(selectedTicket.id, { status: v, updated_at: new Date().toISOString() })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Response */}
              <div>
                <Label>Admin Response</Label>
                <Textarea
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  placeholder="Type your response to the customer..."
                  className="mt-1"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  This response will be visible to the user in their "My Tickets" section.
                </p>
                <Button
                  className="mt-2 gap-2"
                  onClick={handleRespond}
                  disabled={saving || !adminResponse.trim()}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Response & Resolve
                </Button>
              </div>

              {/* Existing Response */}
              {selectedTicket.admin_response && selectedTicket.responded_at && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-xs font-medium text-primary mb-1">
                    Previous Response • {formatDistanceToNow(new Date(selectedTicket.responded_at), { addSuffix: true })}
                  </p>
                  <p className="text-sm whitespace-pre-wrap">{selectedTicket.admin_response}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
