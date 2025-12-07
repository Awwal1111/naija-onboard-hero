import React, { useState } from 'react';
import { Mail, X, RefreshCw, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface EmailVerificationBannerProps {
  email?: string;
  isVerified?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export const EmailVerificationBanner: React.FC<EmailVerificationBannerProps> = ({
  email,
  isVerified = false,
  onDismiss,
  className
}) => {
  const [isResending, setIsResending] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { toast } = useToast();

  if (isVerified || dismissed) return null;

  const handleResendVerification = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address found",
        variant: "destructive"
      });
      return;
    }

    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Please check your inbox and spam folder",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message || "Could not send verification email",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Alert 
      className={cn(
        "relative border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30",
        className
      )}
    >
      <Mail className="h-4 w-4 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="flex items-center justify-between gap-2 text-amber-800 dark:text-amber-200">
        <span className="text-sm">
          Verify your email to unlock all features
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResendVerification}
            disabled={isResending}
            className="h-7 text-xs border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
          >
            {isResending ? (
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Mail className="h-3 w-3 mr-1" />
            )}
            Resend
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-7 w-7 p-0 hover:bg-amber-100 dark:hover:bg-amber-900"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

// Compact inline version for settings/profile
interface EmailVerificationStatusProps {
  email?: string;
  isVerified?: boolean;
  className?: string;
}

export const EmailVerificationStatus: React.FC<EmailVerificationStatusProps> = ({
  email,
  isVerified = false,
  className
}) => {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();

  const handleResend = async () => {
    if (!email) return;
    
    setIsResending(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email
      });

      if (error) throw error;

      toast({
        title: "Verification email sent",
        description: "Check your inbox and spam folder",
      });
    } catch (error: any) {
      toast({
        title: "Failed to send",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  if (isVerified) {
    return (
      <div className={cn("flex items-center gap-2 text-green-600 dark:text-green-400", className)}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Email verified</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
        <Mail className="h-4 w-4" />
        <span className="text-sm">Email not verified</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleResend}
        disabled={isResending}
        className="h-7 text-xs"
      >
        {isResending ? (
          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
        ) : null}
        Resend verification
      </Button>
    </div>
  );
};

export default EmailVerificationBanner;
