import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { 
  Users, Mail, Phone, Building, MessageSquare, 
  Clock, CheckCircle, XCircle, Loader2, RefreshCw,
  TrendingUp, ExternalLink
} from 'lucide-react'

interface APIInquiry {
  id: string
  user_id: string | null
  company_name: string | null
  contact_name: string
  email: string
  phone: string | null
  use_case: string | null
  expected_volume: string | null
  message: string | null
  status: string
  admin_notes: string | null
  created_at: string
  updated_at: string
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-800 border-blue-200',
  contacted: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  in_progress: 'bg-purple-100 text-purple-800 border-purple-200',
  closed: 'bg-gray-100 text-gray-800 border-gray-200',
  converted: 'bg-green-100 text-green-800 border-green-200'
}

export default function AdminAPISalesSection() {
  const [inquiries, setInquiries] = useState<APIInquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInquiry, setSelectedInquiry] = useState<APIInquiry | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchInquiries()
  }, [statusFilter])

  const fetchInquiries = async () => {
    try {
      let query = supabase
        .from('api_sales_inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setInquiries((data || []) as APIInquiry[])
    } catch (error) {
      console.error('Error fetching inquiries:', error)
      toast.error('Failed to load API inquiries')
    } finally {
      setLoading(false)
    }
  }

  const updateInquiry = async (id: string, updates: Partial<APIInquiry>) => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('api_sales_inquiries')
        .update(updates)
        .eq('id', id)

      if (error) throw error

      toast.success('Inquiry updated')
      fetchInquiries()
      
      if (selectedInquiry?.id === id) {
        setSelectedInquiry({ ...selectedInquiry, ...updates } as APIInquiry)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setSaving(false)
    }
  }

  const openDetail = (inquiry: APIInquiry) => {
    setSelectedInquiry(inquiry)
    setAdminNotes(inquiry.admin_notes || '')
    setShowDetail(true)
  }

  const newCount = inquiries.filter(i => i.status === 'new').length
  const inProgressCount = inquiries.filter(i => i.status === 'in_progress' || i.status === 'contacted').length
  const convertedCount = inquiries.filter(i => i.status === 'converted').length

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{newCount}</p>
              <p className="text-xs text-muted-foreground">New Inquiries</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <MessageSquare className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{convertedCount}</p>
              <p className="text-xs text-muted-foreground">Converted</p>
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
            <SelectItem value="all">All Inquiries</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchInquiries}>
          <RefreshCw className="h-4 w-4 mr-1" /> Refresh
        </Button>
      </div>

      {/* Inquiries List */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : inquiries.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No API sales inquiries yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Inquiries from the Developer Docs page will appear here
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {inquiries.map(inquiry => (
            <Card 
              key={inquiry.id} 
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => openDetail(inquiry)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{inquiry.contact_name}</span>
                    {inquiry.company_name && (
                      <span className="text-muted-foreground">• {inquiry.company_name}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {inquiry.email}
                    </span>
                    {inquiry.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {inquiry.phone}
                      </span>
                    )}
                  </div>
                  {inquiry.use_case && (
                    <p className="text-sm mt-2 text-muted-foreground line-clamp-1">
                      {inquiry.use_case}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge className={STATUS_COLORS[inquiry.status]}>
                    {inquiry.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(inquiry.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>API Sales Inquiry</DialogTitle>
          </DialogHeader>
          
          {selectedInquiry && (
            <div className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{selectedInquiry.contact_name}</span>
                </div>
                {selectedInquiry.company_name && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedInquiry.company_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${selectedInquiry.email}`} className="text-primary hover:underline">
                    {selectedInquiry.email}
                  </a>
                </div>
                {selectedInquiry.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <a href={`tel:${selectedInquiry.phone}`} className="text-primary hover:underline">
                      {selectedInquiry.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Use Case */}
              {selectedInquiry.use_case && (
                <div>
                  <Label className="text-muted-foreground">Use Case</Label>
                  <p className="mt-1">{selectedInquiry.use_case}</p>
                </div>
              )}

              {/* Expected Volume */}
              {selectedInquiry.expected_volume && (
                <div>
                  <Label className="text-muted-foreground">Expected API Volume</Label>
                  <p className="mt-1">{selectedInquiry.expected_volume}</p>
                </div>
              )}

              {/* Message */}
              {selectedInquiry.message && (
                <div>
                  <Label className="text-muted-foreground">Message</Label>
                  <p className="mt-1 whitespace-pre-wrap">{selectedInquiry.message}</p>
                </div>
              )}

              {/* Status Update */}
              <div>
                <Label>Status</Label>
                <Select 
                  value={selectedInquiry.status} 
                  onValueChange={(v) => updateInquiry(selectedInquiry.id, { status: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Admin Notes */}
              <div>
                <Label>Admin Notes</Label>
                <Textarea 
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about this inquiry..."
                  className="mt-1"
                  rows={3}
                />
                <Button 
                  size="sm" 
                  className="mt-2"
                  onClick={() => updateInquiry(selectedInquiry.id, { admin_notes: adminNotes })}
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  Save Notes
                </Button>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => window.open(`mailto:${selectedInquiry.email}`, '_blank')}
                >
                  <Mail className="h-4 w-4 mr-1" /> Email
                </Button>
                {selectedInquiry.phone && (
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => window.open(`https://wa.me/${selectedInquiry.phone.replace(/\D/g, '')}`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" /> WhatsApp
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
