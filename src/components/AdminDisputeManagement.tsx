import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle, XCircle, Clock, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export const AdminDisputeManagement = () => {
  const [disputes, setDisputes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDispute, setSelectedDispute] = useState<any>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchDisputes()

    // Set up real-time subscription for new disputes
    const channel = supabase
      .channel('transaction-disputes-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transaction_disputes'
        },
        (payload) => {
          console.log('Dispute real-time update:', payload)
          fetchDisputes() // Refresh disputes when changes occur
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchDisputes = async () => {
    try {
      console.log('Fetching disputes...');
      const { data, error } = await supabase
        .from("transaction_disputes")
        .select(`
          *,
          profiles:user_id(full_name, phone_number)
        `)
        .order("created_at", { ascending: false });

      console.log('Disputes fetch result:', { data, error });
      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Setting disputes:', data?.length || 0, 'disputes found');
      setDisputes(data || []);
    } catch (error: any) {
      console.error("Error fetching disputes:", error);
      toast({
        title: "Error",
        description: `Failed to fetch disputes: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDisputeStatus = async (
    id: string,
    status: string,
    response?: string
  ) => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (response) {
        updateData.admin_response = response;
      }

      if (status === "resolved" || status === "rejected") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolved_by = user?.id;
      }

      const { error } = await supabase
        .from("transaction_disputes")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Dispute ${status} successfully`,
      });

      fetchDisputes();
      setSelectedDispute(null);
      setAdminResponse("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "resolved":
        return "bg-green-500";
      case "rejected":
        return "bg-red-500";
      case "investigating":
        return "bg-blue-500";
      default:
        return "bg-yellow-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "rejected":
        return <XCircle className="h-4 w-4" />;
      case "investigating":
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading disputes...</div>;
  }

  if (disputes.length === 0) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-text-secondary">No disputes found</p>
      </div>
    );
  }

  return (
    <>
      <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
        <div className="mb-4 p-4 bg-muted/30 rounded-lg grid grid-cols-4 gap-4 sticky top-0 z-10">
          <div>
            <p className="text-sm text-text-secondary">Total</p>
            <p className="text-2xl font-bold">{disputes.length}</p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Pending</p>
            <p className="text-2xl font-bold text-yellow-500">
              {disputes.filter((d) => d.status === "pending").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Investigating</p>
            <p className="text-2xl font-bold text-blue-500">
              {disputes.filter((d) => d.status === "investigating").length}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-secondary">Resolved</p>
            <p className="text-2xl font-bold text-green-500">
              {disputes.filter((d) => d.status === "resolved").length}
            </p>
          </div>
        </div>

        {disputes.map((dispute) => (
          <Card
            key={dispute.id}
            className="border-l-4 border-l-red-500 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelectedDispute(dispute)}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start gap-4">
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
                  <h3 className="font-semibold text-text-primary mb-1">
                    {dispute.dispute_reason}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    User: {dispute.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Transaction ID: {dispute.transaction_id.substring(0, 8)}...
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Dispute Detail Dialog */}
      <Dialog
        open={!!selectedDispute}
        onOpenChange={() => {
          setSelectedDispute(null);
          setAdminResponse("");
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Dispute Details</DialogTitle>
          </DialogHeader>
          {selectedDispute && (
            <div className="space-y-4">
              <div>
                <Badge className={getStatusColor(selectedDispute.status)}>
                  {selectedDispute.status}
                </Badge>
              </div>

              <div>
                <Label>User</Label>
                <p className="text-sm">
                  {selectedDispute.profiles?.full_name || "Unknown"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {selectedDispute.profiles?.phone_number}
                </p>
              </div>

              <div>
                <Label>Transaction ID</Label>
                <p className="text-sm font-mono">{selectedDispute.transaction_id}</p>
              </div>

              <div>
                <Label>Dispute Reason</Label>
                <p className="text-sm">{selectedDispute.dispute_reason}</p>
              </div>

              {selectedDispute.dispute_details && (
                <div>
                  <Label>Additional Details</Label>
                  <p className="text-sm">{selectedDispute.dispute_details}</p>
                </div>
              )}

              <div>
                <Label>Submitted</Label>
                <p className="text-sm">
                  {format(new Date(selectedDispute.created_at), "PPpp")}
                </p>
              </div>

              {selectedDispute.admin_response && (
                <div className="bg-muted p-3 rounded-lg">
                  <Label>Admin Response</Label>
                  <p className="text-sm mt-1">{selectedDispute.admin_response}</p>
                </div>
              )}

              {selectedDispute.status !== "resolved" &&
                selectedDispute.status !== "rejected" && (
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <Label>Admin Response</Label>
                      <Textarea
                        value={adminResponse}
                        onChange={(e) => setAdminResponse(e.target.value)}
                        placeholder="Enter your response to the user..."
                        rows={4}
                      />
                    </div>

                    <div className="flex gap-2">
                      {selectedDispute.status === "pending" && (
                        <Button
                          onClick={() =>
                            updateDisputeStatus(
                              selectedDispute.id,
                              "investigating",
                              adminResponse || "Under investigation"
                            )
                          }
                          disabled={isSubmitting}
                          variant="outline"
                          className="flex-1"
                        >
                          Mark as Investigating
                        </Button>
                      )}
                      <Button
                        onClick={() =>
                          updateDisputeStatus(
                            selectedDispute.id,
                            "resolved",
                            adminResponse
                          )
                        }
                        disabled={isSubmitting || !adminResponse.trim()}
                        className="flex-1"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                      <Button
                        onClick={() =>
                          updateDisputeStatus(
                            selectedDispute.id,
                            "rejected",
                            adminResponse
                          )
                        }
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

// Also need to add CheckCircle import to Loan.tsx
