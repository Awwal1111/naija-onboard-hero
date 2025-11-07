import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Mail, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface EmailVerificationBannerProps {
  userEmail: string;
}

export const EmailVerificationBanner = ({ userEmail }: EmailVerificationBannerProps) => {
  const [dismissed, setDismissed] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });

      if (error) throw error;

      toast({
        title: "Verification email sent!",
        description: "Please check your inbox and spam folder.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (dismissed) return null;

  return (
    <Alert variant="default" className="mb-4 border-amber-500 bg-amber-50 dark:bg-amber-950">
      <Mail className="h-4 w-4 text-amber-600" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">
        Verify Your Email
      </AlertTitle>
      <AlertDescription className="flex items-center justify-between text-amber-800 dark:text-amber-200">
        <span>
          Please verify your email to unlock all features including withdrawals.
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleResend}
            disabled={loading}
            className="border-amber-600 text-amber-600 hover:bg-amber-100"
          >
            {loading ? "Sending..." : "Resend Email"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setDismissed(true)}
            className="text-amber-600"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
