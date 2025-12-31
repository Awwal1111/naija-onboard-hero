import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGigOrders, GigOrder, OrderMessage } from '@/hooks/useGigOrders';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Send,
  FileText,
  Calendar,
  DollarSign,
  MessageSquare,
  Truck,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

const OrderDetail = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, loading, updateOrderStatus, sendMessage, getOrderMessages } = useGigOrders();
  const { toast } = useToast();
  
  const [messages, setMessages] = useState<OrderMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showDeliverDialog, setShowDeliverDialog] = useState(false);
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const order = orders.find(o => o.id === orderId);
  const isSeller = order?.seller_id === user?.id;
  const isBuyer = order?.buyer_id === user?.id;

  useEffect(() => {
    if (orderId) {
      loadMessages();
    }
  }, [orderId]);

  const loadMessages = async () => {
    if (!orderId) return;
    const msgs = await getOrderMessages(orderId);
    setMessages(msgs);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !orderId) return;
    
    setSendingMessage(true);
    const result = await sendMessage(orderId, newMessage.trim());
    
    if (result.success) {
      setNewMessage('');
      loadMessages();
    } else {
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive'
      });
    }
    setSendingMessage(false);
  };

  const handleStatusUpdate = async (status: GigOrder['status'], additionalData?: Partial<GigOrder>) => {
    if (!orderId) return;
    
    setActionLoading(true);
    const result = await updateOrderStatus(orderId, status, additionalData);
    
    if (!result.success) {
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive'
      });
    }
    setActionLoading(false);
    setShowCancelDialog(false);
    setShowDeliverDialog(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center gap-3 mb-6">
          <Skeleton className="h-10 w-10 rounded-full" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-lg mb-4" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Order Not Found</h2>
            <p className="text-muted-foreground mb-4">This order doesn't exist or you don't have access</p>
            <Button onClick={() => navigate('/orders')}>View All Orders</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: GigOrder['status']) => {
    const statusConfig = {
      pending: { label: 'Pending Acceptance', variant: 'secondary' as const, icon: Clock },
      accepted: { label: 'Accepted', variant: 'default' as const, icon: CheckCircle2 },
      in_progress: { label: 'In Progress', variant: 'default' as const, icon: Package },
      delivered: { label: 'Delivered', variant: 'default' as const, icon: Truck },
      revision_requested: { label: 'Revision Requested', variant: 'secondary' as const, icon: RotateCcw },
      completed: { label: 'Completed', variant: 'default' as const, icon: CheckCircle2 },
      cancelled: { label: 'Cancelled', variant: 'destructive' as const, icon: XCircle },
      disputed: { label: 'Disputed', variant: 'destructive' as const, icon: AlertTriangle }
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const renderActions = () => {
    const actions: React.ReactNode[] = [];

    if (isSeller) {
      if (order.status === 'pending') {
        actions.push(
          <Button key="accept" onClick={() => handleStatusUpdate('accepted')} disabled={actionLoading}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Accept Order
          </Button>
        );
        actions.push(
          <Button key="decline" variant="outline" onClick={() => setShowCancelDialog(true)} disabled={actionLoading}>
            <XCircle className="h-4 w-4 mr-2" />
            Decline
          </Button>
        );
      }

      if (order.status === 'accepted') {
        actions.push(
          <Button key="start" onClick={() => handleStatusUpdate('in_progress')} disabled={actionLoading}>
            <Package className="h-4 w-4 mr-2" />
            Start Working
          </Button>
        );
      }

      if (order.status === 'in_progress' || order.status === 'revision_requested') {
        actions.push(
          <Button key="deliver" onClick={() => setShowDeliverDialog(true)} disabled={actionLoading}>
            <Truck className="h-4 w-4 mr-2" />
            Deliver Order
          </Button>
        );
      }
    }

    if (isBuyer) {
      if (order.status === 'delivered') {
        actions.push(
          <Button key="complete" onClick={() => handleStatusUpdate('completed')} disabled={actionLoading}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Accept Delivery
          </Button>
        );
        if (order.revision_count < order.max_revisions) {
          actions.push(
            <Button 
              key="revision" 
              variant="outline" 
              onClick={() => handleStatusUpdate('revision_requested', { revision_count: order.revision_count + 1 })} 
              disabled={actionLoading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Request Revision ({order.max_revisions - order.revision_count} left)
            </Button>
          );
        }
      }

      if (order.status === 'pending') {
        actions.push(
          <Button key="cancel" variant="outline" onClick={() => setShowCancelDialog(true)} disabled={actionLoading}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Order
          </Button>
        );
      }
    }

    return actions.length > 0 ? (
      <div className="flex flex-wrap gap-2 mt-4">{actions}</div>
    ) : null;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/orders')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold line-clamp-1">{order.title}</h1>
            <p className="text-xs text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
          </div>
          {getStatusBadge(order.status)}
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Order Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Order Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-3">
              {order.gig?.photo_urls?.[0] ? (
                <img 
                  src={order.gig.photo_urls[0]} 
                  alt={order.title}
                  className="w-20 h-20 rounded-lg object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center">
                  <Package className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm text-muted-foreground line-clamp-3">
                  {order.description || order.buyer_notes || 'No description provided'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Amount</p>
                  <p className="font-semibold">₦{order.amount.toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p className="font-medium text-sm">
                    {order.delivery_deadline 
                      ? format(new Date(order.delivery_deadline), 'MMM d, yyyy')
                      : 'Not set'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Participants */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Buyer</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={order.buyer?.profile_picture_url} />
                    <AvatarFallback>{order.buyer?.full_name?.[0] || 'B'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{order.buyer?.full_name || 'Unknown'}</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Seller</p>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={order.seller?.profile_picture_url} />
                    <AvatarFallback>{order.seller?.full_name?.[0] || 'S'}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{order.seller?.full_name || 'Unknown'}</span>
                </div>
              </div>
            </div>

            {renderActions()}
          </CardContent>
        </Card>

        {/* Messages */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Messages ({messages.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Message List */}
            <div className="space-y-3 max-h-64 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No messages yet. Start the conversation!
                </p>
              ) : (
                messages.map(msg => (
                  <div 
                    key={msg.id}
                    className={`flex gap-2 ${msg.sender_id === user?.id ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="h-7 w-7 flex-shrink-0">
                      <AvatarImage src={msg.sender?.profile_picture_url} />
                      <AvatarFallback>{msg.sender?.full_name?.[0] || '?'}</AvatarFallback>
                    </Avatar>
                    <div 
                      className={`rounded-lg px-3 py-2 max-w-[75%] ${
                        msg.sender_id === user?.id 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className={`text-xs mt-1 ${
                        msg.sender_id === user?.id ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      }`}>
                        {format(new Date(msg.created_at), 'h:mm a')}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Send Message */}
            {order.status !== 'completed' && order.status !== 'cancelled' && (
              <div className="flex gap-2">
                <Textarea
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="min-h-[40px] resize-none"
                  rows={1}
                />
                <Button 
                  size="icon" 
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Order</DialogTitle>
            <DialogDescription>
              Please provide a reason for cancellation
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter cancellation reason..."
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              Go Back
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => handleStatusUpdate('cancelled', { cancellation_reason: cancelReason })}
              disabled={actionLoading}
            >
              Confirm Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deliver Dialog */}
      <Dialog open={showDeliverDialog} onOpenChange={setShowDeliverDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deliver Order</DialogTitle>
            <DialogDescription>
              Add any delivery notes for the buyer
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Enter delivery notes (optional)..."
            value={deliveryNotes}
            onChange={(e) => setDeliveryNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeliverDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => handleStatusUpdate('delivered', { seller_notes: deliveryNotes })}
              disabled={actionLoading}
            >
              <Truck className="h-4 w-4 mr-2" />
              Mark as Delivered
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrderDetail;
