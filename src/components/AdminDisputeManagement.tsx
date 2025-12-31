import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  AlertTriangle, CheckCircle, XCircle, Clock, MessageSquare, 
  ArrowUpRight, ArrowDownLeft, Wallet, DollarSign, User, History,
  RefreshCw, Loader2
} from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UserTransactionData {
  profile: any;
  transactions: any[];
  safepayTransactions: any[];
  totalSent: number;
  totalReceived: number;
}

export const AdminDisputeManagement = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [userAData, setUserAData] = useState<UserTransactionData | null>(null);
  const [userBData, setUserBData] = useState<UserTransactionData | null>(null);
  const [adminWalletBalance, setAdminWalletBalance] = useState<number>(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchDisputes();
    fetchAdminWallet();

    const channel = supabase
      .channel('transaction-disputes-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transaction_disputes' }, () => fetchDisputes())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchAdminWallet = async () => {
    const { data } = await supabase.from('admin_wallet').select('balance').eq('id', 1).single();
    setAdminWalletBalance(data?.balance || 0);
  };

  const fetchDisputes = async () => {
    try {
      const { data: disputesData, error } = await supabase
        .from("transaction_disputes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!disputesData || disputesData.length === 0) {
        setDisputes([]);
        return;
      }

      const userIds = [...new Set(disputesData.map(d => d.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone_number, wallet_balance, balance_withdrawable')
        .in('user_id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      const enrichedDisputes = disputesData.map(dispute => ({
        ...dispute,
        profiles: profilesMap.get(dispute.user_id) || null
      }));

      setDisputes(enrichedDisputes);
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTransactionData = async (userId: string): Promise<UserTransactionData | null> => {
    try {
      const [profileRes, txRes, safepayRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).single(),
        supabase.from('wallet_transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50),
        supabase.from('safepay_transactions').select('*').or(`buyer_id.eq.${userId},seller_id.eq.${userId}`).order('created_at', { ascending: false }).limit(20)
      ]);

      const transactions = txRes.data || [];
      const totalSent = transactions.filter(t => t.amount < 0).reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const totalReceived = transactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);

      return {
        profile: profileRes.data,
        transactions,
        safepayTransactions: safepayRes.data || [],
        totalSent,
        totalReceived
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const loadDisputeDetails = async (dispute: any) => {
    setSelectedDispute(dispute);
    setLoadingDetails(true);
    setUserAData(null);
    setUserBData(null);

    try {
      // Fetch disputer's data
      const disputerData = await fetchUserTransactionData(dispute.user_id);
      setUserAData(disputerData);

      // Try to find the other party from SafePay or transaction
      if (dispute.safepay_id) {
        const { data: safepay } = await supabase
          .from('safepay_transactions')
          .select('*')
          .eq('id', dispute.safepay_id)
          .single();

        if (safepay) {
          const otherPartyId = safepay.buyer_id === dispute.user_id ? safepay.seller_id : safepay.buyer_id;
          const otherData = await fetchUserTransactionData(otherPartyId);
          setUserBData(otherData);
        }
      } else if (dispute.transaction_id) {
        // Try to find related transaction and other party from metadata
        const { data: tx } = await supabase
          .from('wallet_transactions')
          .select('*')
          .eq('id', dispute.transaction_id)
          .single();

        // Check metadata for recipient info
        const metadata = tx?.metadata as any;
        if (metadata?.recipient_id) {
          const otherData = await fetchUserTransactionData(metadata.recipient_id);
          setUserBData(otherData);
        }
      }
    } catch (error) {
      console.error('Error loading dispute details:', error);
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateDisputeStatus = async (id: string, status: string, response?: string) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = { status, updated_at: new Date().toISOString() };
      if (response) updateData.admin_response = response;
      if (status === "resolved" || status === "rejected") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase.from("transaction_disputes").update(updateData).eq("id", id);
      if (error) throw error;

      toast({ title: "Success", description: `Dispute ${status} successfully` });
      fetchDisputes();
      setSelectedDispute(null);
      setAdminResponse("");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      resolved: "bg-green-500", rejected: "bg-red-500", investigating: "bg-blue-500"
    };
    return colors[status] || "bg-yellow-500";
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, JSX.Element> = {
      resolved: <CheckCircle className="h-4 w-4" />,
      rejected: <XCircle className="h-4 w-4" />,
      investigating: <MessageSquare className="h-4 w-4" />
    };
    return icons[status] || <Clock className="h-4 w-4" />;
  };

  const UserTransactionPanel = ({ data, title }: { data: UserTransactionData | null; title: string }) => {
    if (!data) return <div className="text-center py-8 text-muted-foreground">No data available</div>;

    return (
      <div className="space-y-4">
        {/* User Info Card */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold">{data.profile?.full_name || 'Unknown User'}</p>
                <p className="text-xs text-muted-foreground">{data.profile?.phone_number}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-background rounded-lg p-2">
                <Wallet className="h-4 w-4 mx-auto text-primary mb-1" />
                <p className="text-xs text-muted-foreground">Balance</p>
                <p className="font-bold text-sm">₦{data.profile?.wallet_balance?.toLocaleString() || 0}</p>
              </div>
              <div className="bg-background rounded-lg p-2">
                <ArrowUpRight className="h-4 w-4 mx-auto text-red-500 mb-1" />
                <p className="text-xs text-muted-foreground">Sent</p>
                <p className="font-bold text-sm text-red-500">₦{data.totalSent.toLocaleString()}</p>
              </div>
              <div className="bg-background rounded-lg p-2">
                <ArrowDownLeft className="h-4 w-4 mx-auto text-green-500 mb-1" />
                <p className="text-xs text-muted-foreground">Received</p>
                <p className="font-bold text-sm text-green-500">₦{data.totalReceived.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <div>
          <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
            <History className="h-4 w-4" />
            Recent Transactions
          </h4>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {data.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No transactions</p>
              ) : (
                data.transactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg text-sm">
                    <div className="flex items-center gap-2">
                      {tx.amount >= 0 ? (
                        <ArrowDownLeft className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-red-500" />
                      )}
                      <div>
                        <p className="font-medium capitalize">{tx.kind?.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {tx.amount >= 0 ? '+' : ''}₦{Math.abs(tx.amount).toLocaleString()}
                      </p>
                      <Badge variant="outline" className="text-xs">{tx.status}</Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* SafePay Transactions */}
        {data.safepayTransactions.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              SafePay Transactions
            </h4>
            <ScrollArea className="h-[150px]">
              <div className="space-y-2">
                {data.safepayTransactions.map((sp: any) => (
                  <div key={sp.id} className="p-2 bg-muted/30 rounded-lg text-sm">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">₦{sp.amount?.toLocaleString()}</p>
                      <Badge variant={sp.status === 'complete' ? 'default' : 'secondary'}>
                        {sp.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(sp.created_at), 'MMM d, yyyy HH:mm')}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
    );
  };

  if (loading) return <div className="text-center py-8">Loading disputes...</div>;

  if (disputes.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No disputes found</p>
      </div>
    );
  }

  return (
    <>
      {/* Admin Wallet Card */}
      <Card className="mb-4 bg-gradient-to-r from-primary/10 to-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Wallet className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Admin Wallet Balance</p>
                <p className="text-2xl font-bold">₦{adminWalletBalance.toLocaleString()}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchAdminWallet}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="mb-4 p-4 bg-muted/30 rounded-lg grid grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-2xl font-bold">{disputes.length}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className="text-2xl font-bold text-yellow-500">
            {disputes.filter(d => d.status === "pending").length}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Investigating</p>
          <p className="text-2xl font-bold text-blue-500">
            {disputes.filter(d => d.status === "investigating").length}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Resolved</p>
          <p className="text-2xl font-bold text-green-500">
            {disputes.filter(d => d.status === "resolved").length}
          </p>
        </div>
      </div>

      {/* Disputes List */}
      <div className="max-h-[500px] overflow-y-auto pr-2 space-y-4">
        {disputes.map(dispute => (
          <Card
            key={dispute.id}
            className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => loadDisputeDetails(dispute)}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(dispute.status)}>
                      {getStatusIcon(dispute.status)}
                      <span className="ml-1">{dispute.status}</span>
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(dispute.created_at), "PPp")}
                    </span>
                  </div>
                  <h3 className="font-semibold mb-1">{dispute.dispute_reason}</h3>
                  <p className="text-sm text-muted-foreground">
                    User: {dispute.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    TX: {dispute.transaction_id?.substring(0, 12)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enhanced Dispute Detail Dialog */}
      <Dialog open={!!selectedDispute} onOpenChange={() => { setSelectedDispute(null); setAdminResponse(""); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Dispute Investigation
            </DialogTitle>
          </DialogHeader>
          
          {selectedDispute && (
            <div className="space-y-4">
              {/* Dispute Summary */}
              <Card className="bg-red-500/5 border-red-500/20">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={getStatusColor(selectedDispute.status)}>{selectedDispute.status}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(selectedDispute.created_at), "PPpp")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg">{selectedDispute.dispute_reason}</h3>
                  {selectedDispute.dispute_details && (
                    <p className="text-sm text-muted-foreground mt-2">{selectedDispute.dispute_details}</p>
                  )}
                </CardContent>
              </Card>

              {/* Transaction History Tabs */}
              {loadingDetails ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2">Loading transaction history...</span>
                </div>
              ) : (
                <Tabs defaultValue="disputer" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="disputer">
                      Disputer ({userAData?.profile?.full_name || 'Loading...'})
                    </TabsTrigger>
                    <TabsTrigger value="other" disabled={!userBData}>
                      Other Party ({userBData?.profile?.full_name || 'N/A'})
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="disputer" className="mt-4">
                    <UserTransactionPanel data={userAData} title="Disputer" />
                  </TabsContent>
                  <TabsContent value="other" className="mt-4">
                    <UserTransactionPanel data={userBData} title="Other Party" />
                  </TabsContent>
                </Tabs>
              )}

              {/* Admin Response */}
              {selectedDispute.admin_response && (
                <Card className="bg-muted">
                  <CardContent className="pt-4">
                    <Label className="text-sm font-medium">Previous Admin Response</Label>
                    <p className="text-sm mt-1">{selectedDispute.admin_response}</p>
                  </CardContent>
                </Card>
              )}

              {/* Actions */}
              {selectedDispute.status !== "resolved" && selectedDispute.status !== "rejected" && (
                <div className="space-y-3 pt-4 border-t">
                  <div>
                    <Label>Admin Response / Ruling</Label>
                    <Textarea
                      value={adminResponse}
                      onChange={(e) => setAdminResponse(e.target.value)}
                      placeholder="Enter your investigation findings and ruling..."
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    {selectedDispute.status === "pending" && (
                      <Button
                        onClick={() => updateDisputeStatus(selectedDispute.id, "investigating", adminResponse || "Under investigation")}
                        disabled={isSubmitting}
                        variant="outline"
                        className="flex-1"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        Investigate
                      </Button>
                    )}
                    <Button
                      onClick={() => updateDisputeStatus(selectedDispute.id, "resolved", adminResponse)}
                      disabled={isSubmitting || !adminResponse.trim()}
                      className="flex-1"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolve
                    </Button>
                    <Button
                      onClick={() => updateDisputeStatus(selectedDispute.id, "rejected", adminResponse)}
                      disabled={isSubmitting || !adminResponse.trim()}
                      variant="destructive"
                      className="flex-1"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
