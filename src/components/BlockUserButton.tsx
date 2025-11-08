import { useState } from "react";
import { Ban, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface BlockUserButtonProps {
  userId: string;
  userName: string;
  isBlocked?: boolean;
  onBlockStatusChange?: () => void;
}

export const BlockUserButton = ({
  userId,
  userName,
  isBlocked = false,
  onBlockStatusChange,
}: BlockUserButtonProps) => {
  const [showDialog, setShowDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleBlock = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (isBlocked) {
        // Unblock user
        const { error } = await supabase
          .from("blocked_users")
          .delete()
          .eq("blocker_id", user.id)
          .eq("blocked_id", userId);

        if (error) throw error;

        toast({
          title: "User unblocked",
          description: `${userName} has been unblocked successfully.`,
        });
      } else {
        // Block user
        const { error } = await supabase.from("blocked_users").insert({
          blocker_id: user.id,
          blocked_id: userId,
        });

        if (error) throw error;

        toast({
          title: "User blocked",
          description: `${userName} has been blocked. They won't be able to see your profile or contact you.`,
        });
      }

      onBlockStatusChange?.();
      setShowDialog(false);
    } catch (error) {
      console.error("Block error:", error);
      toast({
        title: "Error",
        description: "Failed to update block status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={isBlocked ? "outline" : "destructive"}
        size="sm"
        onClick={() => setShowDialog(true)}
      >
        {isBlocked ? (
          <>
            <X className="h-4 w-4 mr-2" />
            Unblock
          </>
        ) : (
          <>
            <Ban className="h-4 w-4 mr-2" />
            Block User
          </>
        )}
      </Button>

      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {isBlocked ? "Unblock User" : "Block User"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isBlocked ? (
                <>
                  Are you sure you want to unblock {userName}? They will be able to see your profile and contact you again.
                </>
              ) : (
                <>
                  Are you sure you want to block {userName}? They won't be able to:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>View your profile</li>
                    <li>See your posts</li>
                    <li>Send you messages</li>
                    <li>Comment on your content</li>
                  </ul>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={loading}
              className={isBlocked ? "" : "bg-destructive"}
            >
              {loading ? "Processing..." : isBlocked ? "Unblock" : "Block User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
