import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportDialog } from "./ReportDialog";

interface ReportButtonProps {
  reportType: "user" | "post" | "job" | "comment" | "message" | "course" | "product";
  reportedItemId: string;
  reportedUserId?: string;
  variant?: "ghost" | "outline" | "default";
  size?: "sm" | "default" | "lg";
  children?: React.ReactNode;
}

export const ReportButton = ({
  reportType,
  reportedItemId,
  reportedUserId,
  variant = "ghost",
  size = "sm",
  children,
}: ReportButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setShowDialog(true)}
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        <Flag className="h-4 w-4 mr-2" />
        {children || "Report"}
      </Button>

      <ReportDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        reportType={reportType}
        reportedItemId={reportedItemId}
        reportedUserId={reportedUserId}
      />
    </>
  );
};
