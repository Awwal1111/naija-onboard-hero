import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface GigOrder {
  id: string;
  gig_id: string;
  buyer_id: string;
  seller_id: string;
  title: string;
  description: string;
  amount: number;
  platform_fee: number;
  status: 'pending' | 'accepted' | 'in_progress' | 'delivered' | 'revision_requested' | 'completed' | 'cancelled' | 'disputed';
  delivery_deadline: string | null;
  delivered_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  buyer_notes: string | null;
  seller_notes: string | null;
  delivery_files: string[] | null;
  revision_count: number;
  max_revisions: number;
  created_at: string;
  updated_at: string;
  // Joined data
  gig?: {
    title: string;
    photo_urls: string[];
    category: string;
  };
  buyer?: {
    full_name: string;
    profile_picture_url: string;
  };
  seller?: {
    full_name: string;
    profile_picture_url: string;
  };
}

export interface OrderMessage {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  attachments: string[] | null;
  created_at: string;
  sender?: {
    full_name: string;
    profile_picture_url: string;
  };
}

export const useGigOrders = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [orders, setOrders] = useState<GigOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOrders = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('gig_orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch related data for each order
      const ordersWithDetails = await Promise.all(
        (data || []).map(async (order: any) => {
          // Fetch gig details
          const { data: gig } = await supabase
            .from('jobs_services')
            .select('title, photo_urls, category')
            .eq('id', order.gig_id)
            .single();

          // Fetch buyer profile
          const { data: buyer } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', order.buyer_id)
            .single();

          // Fetch seller profile
          const { data: seller } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', order.seller_id)
            .single();

          return {
            ...order,
            gig,
            buyer,
            seller
          };
        })
      );

      setOrders(ordersWithDetails);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const createOrder = async (gigId: string, sellerId: string, title: string, description: string, amount: number, deliveryDays: number) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const platformFee = amount * 0.1; // 10% platform fee
      const deliveryDeadline = new Date();
      deliveryDeadline.setDate(deliveryDeadline.getDate() + deliveryDays);

      const { data, error } = await supabase
        .from('gig_orders')
        .insert({
          gig_id: gigId,
          buyer_id: user.id,
          seller_id: sellerId,
          title,
          description,
          amount,
          platform_fee: platformFee,
          delivery_deadline: deliveryDeadline.toISOString(),
          buyer_notes: description
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Order Created',
        description: 'Your order has been sent to the seller'
      });

      fetchOrders();
      return { success: true, order: data };
    } catch (error: any) {
      console.error('Error creating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to create order',
        variant: 'destructive'
      });
      return { error: error.message };
    }
  };

  const updateOrderStatus = async (orderId: string, status: GigOrder['status'], additionalData?: Partial<GigOrder>) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const updateData: any = { status, ...additionalData };

      if (status === 'delivered') {
        updateData.delivered_at = new Date().toISOString();
      } else if (status === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (status === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('gig_orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: 'Order Updated',
        description: `Order status changed to ${status.replace('_', ' ')}`
      });

      fetchOrders();
      return { success: true };
    } catch (error: any) {
      console.error('Error updating order:', error);
      toast({
        title: 'Error',
        description: 'Failed to update order',
        variant: 'destructive'
      });
      return { error: error.message };
    }
  };

  const sendMessage = async (orderId: string, message: string, attachments?: string[]) => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { error } = await supabase
        .from('gig_order_messages')
        .insert({
          order_id: orderId,
          sender_id: user.id,
          message,
          attachments: attachments || []
        });

      if (error) throw error;

      return { success: true };
    } catch (error: any) {
      console.error('Error sending message:', error);
      return { error: error.message };
    }
  };

  const getOrderMessages = async (orderId: string) => {
    try {
      const { data, error } = await supabase
        .from('gig_order_messages')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Fetch sender profiles
      const messagesWithSenders = await Promise.all(
        (data || []).map(async (msg: any) => {
          const { data: sender } = await supabase
            .from('profiles')
            .select('full_name, profile_picture_url')
            .eq('user_id', msg.sender_id)
            .single();

          return { ...msg, sender };
        })
      );

      return messagesWithSenders;
    } catch (error) {
      console.error('Error fetching messages:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  return {
    orders,
    loading,
    createOrder,
    updateOrderStatus,
    sendMessage,
    getOrderMessages,
    refetch: fetchOrders
  };
};

export default useGigOrders;
