import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, AlertCircle, FileText, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

export default function Emergency() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    reason: "",
    amount_requested: "",
  });

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["emergency-requests"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("emergency_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("emergency_requests").insert({
        user_id: user.id,
        reason: data.reason,
        amount_requested: parseFloat(data.amount_requested),
        status: "pending",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ 
        title: "Emergency request submitted!", 
        description: "Check your email for next steps to submit required documents."
      });
      queryClient.invalidateQueries({ queryKey: ["emergency-requests"] });
      setCreateDialogOpen(false);
      setFormData({ reason: "", amount_requested: "" });
    },
    onError: () => {
      toast({ title: "Failed to submit emergency request", variant: "destructive" });
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved": return "bg-green-500";
      case "rejected": return "bg-red-500";
      case "disbursed": return "bg-blue-500";
      default: return "bg-yellow-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Emergency Funds</h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Apply
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Apply for Emergency Funds</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Reason</Label>
                  <Textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    placeholder="Explain your emergency situation"
                    rows={5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount Requested (₦NC)</Label>
                  <Input
                    type="number"
                    value={formData.amount_requested}
                    onChange={(e) => setFormData({ ...formData, amount_requested: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createRequestMutation.mutate(formData)}
                  disabled={createRequestMutation.isPending}
                >
                  Submit Application
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm">Emergency Fund Information</h3>
              <p className="text-xs text-muted-foreground">
                Submit your emergency request for admin review. Approved requests will be processed within 24-48 hours.
              </p>
            </div>
          </div>
        </div>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-base">Required Documents for Fund Release</h3>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
              <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                📋 IMPORTANT: Document Submission Requirements
              </p>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                After your emergency request is approved, you MUST submit the following documents before funds can be released:
              </p>
            </div>
            <ul className="text-sm space-y-2 ml-4 list-disc text-foreground">
              <li><strong>Video explanation</strong> of your emergency situation</li>
              <li><strong>Police report</strong> (if applicable to your emergency)</li>
              <li><strong>Supporting documents</strong> (medical reports, bills, receipts, etc.)</li>
            </ul>
            <div className="bg-background border border-primary/20 p-4 rounded-lg space-y-3 mt-3">
              <p className="text-sm font-semibold text-foreground">📤 Submit Your Documents Here:</p>
              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm bg-green-50 dark:bg-green-900/20 p-3 rounded-md">
                  <Phone className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-900 dark:text-green-100">WhatsApp (Recommended)</p>
                    <a href="https://wa.me/2348167140857" target="_blank" rel="noopener noreferrer" className="text-green-700 dark:text-green-300 hover:underline font-medium">
                      +234 816 714 0857
                    </a>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">Send your video and documents here</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                  <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-900 dark:text-blue-100">Email (Alternative)</p>
                    <a href="mailto:support@naijalancers.name.ng" className="text-blue-700 dark:text-blue-300 hover:underline font-medium break-all">
                      support@naijalancers.name.ng
                    </a>
                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Attach all documents to your email</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm font-semibold text-red-900 dark:text-red-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Critical Notice
              </p>
              <p className="text-xs text-red-800 dark:text-red-200 mt-1">
                ⚠️ Funds will ONLY be released AFTER admin verifies your submitted documents. Incomplete submissions will delay processing.
              </p>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No emergency requests yet</div>
        ) : (
          <div className="space-y-3">
            {requests.map((request: any) => (
              <Card key={request.id}>
                <CardHeader className="p-3">
                  <div className="flex items-center justify-between">
                    <Badge className={getStatusColor(request.status)}>{request.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(request.created_at), "MMM dd, yyyy")}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 space-y-2">
                  <p className="text-sm">{request.reason}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">₦{request.amount_requested}NC</span>
                    {request.admin_notes && (
                      <span className="text-xs text-muted-foreground">Admin reviewed</span>
                    )}
                  </div>
                  {request.admin_notes && (
                    <div className="bg-muted p-2 rounded text-xs">
                      <span className="font-semibold">Admin Note: </span>
                      {request.admin_notes}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
