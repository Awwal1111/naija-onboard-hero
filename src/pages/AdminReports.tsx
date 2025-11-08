import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Flag, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminReports = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<"pending" | "resolved" | "dismissed">("pending");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<"resolve" | "dismiss" | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports", statusFilter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select(`
          *,
          reporter:profiles!reports_reporter_id_fkey(full_name, profile_picture),
          reported_user:profiles!reports_reported_user_id_fkey(full_name, profile_picture)
        `)
        .eq("status", statusFilter)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const { error } = await supabase
        .from("reports")
        .update({ status, reviewed_at: new Date().toISOString() })
        .eq("id", reportId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
      setActionDialog(null);
      setSelectedReport(null);
      toast({
        title: "Report updated",
        description: "The report status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update report status.",
        variant: "destructive",
      });
    },
  });

  const getReasonBadge = (reason: string) => {
    const colors: Record<string, string> = {
      spam: "bg-orange-600",
      harassment: "bg-red-600",
      inappropriate_content: "bg-purple-600",
      scam: "bg-yellow-600",
      fake_profile: "bg-pink-600",
      copyright: "bg-blue-600",
      other: "bg-gray-600",
    };
    return colors[reason] || "bg-gray-600";
  };

  return (
    <ResponsiveLayout>
      <div className="container max-w-7xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Flag className="h-8 w-8 text-red-600" />
            Reports Management
          </h1>
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
          <TabsList>
            <TabsTrigger value="pending">
              <AlertCircle className="h-4 w-4 mr-2" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="resolved">
              <CheckCircle className="h-4 w-4 mr-2" />
              Resolved
            </TabsTrigger>
            <TabsTrigger value="dismissed">
              <XCircle className="h-4 w-4 mr-2" />
              Dismissed
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="space-y-4">
            {isLoading ? (
              <div className="text-center py-12">Loading reports...</div>
            ) : reports && reports.length > 0 ? (
              reports.map((report) => (
                <Card key={report.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={getReasonBadge(report.reason)}>
                          {report.reason.replace(/_/g, " ")}
                        </Badge>
                        <Badge variant="outline">{report.report_type}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground font-normal">
                        {new Date(report.created_at).toLocaleString()}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-semibold mb-2">Reported By</p>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={report.reporter?.profile_picture} />
                            <AvatarFallback>{report.reporter?.full_name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{report.reporter?.full_name}</span>
                        </div>
                      </div>

                      {report.reported_user && (
                        <div>
                          <p className="text-sm font-semibold mb-2">Reported User</p>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={report.reported_user?.profile_picture} />
                              <AvatarFallback>
                                {report.reported_user?.full_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{report.reported_user?.full_name}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {report.description && (
                      <div>
                        <p className="text-sm font-semibold mb-1">Details</p>
                        <p className="text-sm text-muted-foreground">{report.description}</p>
                      </div>
                    )}

                    {statusFilter === "pending" && (
                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setActionDialog("resolve");
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Resolve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setActionDialog("dismiss");
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Dismiss
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No {statusFilter} reports found.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Action Confirmation Dialog */}
        <AlertDialog open={!!actionDialog} onOpenChange={() => setActionDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {actionDialog === "resolve" ? "Resolve Report" : "Dismiss Report"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {actionDialog === "resolve"
                  ? "Mark this report as resolved? This indicates you've taken appropriate action."
                  : "Dismiss this report? This indicates the report was not valid or doesn't require action."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  selectedReport &&
                  updateStatusMutation.mutate({
                    reportId: selectedReport.id,
                    status: actionDialog === "resolve" ? "resolved" : "dismissed",
                  })
                }
              >
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ResponsiveLayout>
  );
};

export default AdminReports;
