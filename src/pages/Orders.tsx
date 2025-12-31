import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useGigOrders, GigOrder } from '@/hooks/useGigOrders';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ArrowLeft, 
  Package, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  MessageSquare,
  ShoppingBag,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

const Orders = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { orders, loading } = useGigOrders();
  const [activeTab, setActiveTab] = useState('all');

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view orders</h2>
            <p className="text-muted-foreground mb-4">You need to be logged in to manage your orders</p>
            <Button onClick={() => navigate('/login')}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const buyerOrders = orders.filter(o => o.buyer_id === user.id);
  const sellerOrders = orders.filter(o => o.seller_id === user.id);

  const getStatusBadge = (status: GigOrder['status']) => {
    const statusConfig = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      accepted: { label: 'Accepted', variant: 'default' as const, icon: CheckCircle2 },
      in_progress: { label: 'In Progress', variant: 'default' as const, icon: Package },
      delivered: { label: 'Delivered', variant: 'default' as const, icon: CheckCircle2 },
      revision_requested: { label: 'Revision', variant: 'secondary' as const, icon: AlertTriangle },
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

  const OrderCard = ({ order, isSeller }: { order: GigOrder; isSeller: boolean }) => {
    const otherParty = isSeller ? order.buyer : order.seller;
    const role = isSeller ? 'Buyer' : 'Seller';

    return (
      <Card 
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => navigate(`/orders/${order.id}`)}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {order.gig?.photo_urls?.[0] ? (
              <img 
                src={order.gig.photo_urls[0]} 
                alt={order.title}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <Package className="h-6 w-6 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-sm line-clamp-1">{order.title}</h3>
                {getStatusBadge(order.status)}
              </div>

              <div className="flex items-center gap-2 mt-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={otherParty?.profile_picture_url} />
                  <AvatarFallback>{otherParty?.full_name?.[0] || '?'}</AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {role}: {otherParty?.full_name || 'Unknown'}
                </span>
              </div>

              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-semibold text-primary">
                  ₦{order.amount.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(order.created_at), 'MMM d, yyyy')}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderOrderList = (orderList: GigOrder[], isSeller: boolean, emptyMessage: string) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (orderList.length === 0) {
      return (
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">{emptyMessage}</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {orderList.map(order => (
          <OrderCard key={order.id} order={order} isSeller={isSeller} />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Orders</h1>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="buying" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Buying ({buyerOrders.length})
            </TabsTrigger>
            <TabsTrigger value="selling" className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Selling ({sellerOrders.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="buying" className="mt-4">
            {renderOrderList(buyerOrders, false, "You haven't placed any orders yet")}
          </TabsContent>

          <TabsContent value="selling" className="mt-4">
            {renderOrderList(sellerOrders, true, "You haven't received any orders yet")}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Orders;
