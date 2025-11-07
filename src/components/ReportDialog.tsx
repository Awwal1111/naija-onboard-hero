import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Flag } from "lucide-react";

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reportType: "user" | "post" | "job" | "comment" | "message" | "course" | "product";
  reportedItemId: string;
  reportedUserId?: string;
}

export const ReportDialog = ({
  isOpen,
  onClose,
  reportType,
  reportedItemId,
  reportedUserId,
}: ReportDialogProps) => {
  const [reason, setReason] = useState<string>("spam");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const reasons = [
    { value: "spam", label: "Spam or misleading" },
    { value: "harassment", label: "Harassment or bullying" },
    { value: "inappropriate_content", label: "Inappropriate content" },
    { value: "scam", label: "Scam or fraud" },
    { value: "fake_profile", label: "Fake profile" },
    { value: "copyright", label: "Copyright violation" },
    { value: "other", label: "Other" },
  ];

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId || null,
        report_type: reportType,
        reported_item_id: reportedItemId,
        reason: reason,
        description: description || null,
        status: "pending",
      });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for helping keep NaijaLancers safe. We'll review your report shortly.",
      });

      onClose();
      setDescription("");
      setReason("spam");
    } catch (error) {
      console.error("Report error:", error);
      toast({
        title: "Error",
        description: "Failed to submit report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5" />
            Report {reportType}
          </DialogTitle>
          <DialogDescription>
            Help us understand what's wrong with this {reportType}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Reason for reporting</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-2">
              {reasons.map((r) => (
                <div key={r.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={r.value} id={r.value} />
                  <Label htmlFor={r.value} className="font-normal cursor-pointer">
                    {r.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide more context about why you're reporting this..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {description.length}/500 characters
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
