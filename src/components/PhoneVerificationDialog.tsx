import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Send, Clock, RefreshCw, CheckCircle, AlertCircle } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PhoneVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVerified?: () => void;
}

export const PhoneVerificationDialog: React.FC<PhoneVerificationDialogProps> = ({
  open,
  onOpenChange,
  onVerified
}) => {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const { toast } = useToast();
  
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setCanResend(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setStep('phone');
      setPhoneNumber('');
      setCode('');
      setTimeLeft(0);
      setCanResend(false);
    }
  }, [open]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPhoneNumber = (value: string) => {
    // Remove non-digits
    const digits = value.replace(/\D/g, '');
    
    // Format as Nigerian number
    if (digits.startsWith('234')) {
      return '+' + digits;
    } else if (digits.startsWith('0')) {
      return '+234' + digits.slice(1);
    } else if (digits.length === 10) {
      return '+234' + digits;
    }
    return '+234' + digits;
  };

  const handleSendCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid Nigerian phone number",
        variant: "destructive"
      });
      return;
    }

    // Check if user has linked Telegram
    if (!profile?.telegram_user_id) {
      toast({
        title: "Telegram Not Linked",
        description: "Please link your Telegram account first to receive verification codes",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { data, error } = await supabase.functions.invoke('send-phone-verification', {
        body: {
          user_id: user?.id,
          phone_number: formattedPhone
        }
      });

      if (error) throw error;

      if (data?.success) {
        setStep('code');
        setTimeLeft(300); // 5 minutes
        setCanResend(false);
        
        toast({
          title: "Code Sent!",
          description: "Check your Telegram for the verification code"
        });
      } else {
        throw new Error(data?.error || 'Failed to send code');
      }
    } catch (error: any) {
      console.error('Send code error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid Code",
        description: "Please enter the 6-digit code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const formattedPhone = formatPhoneNumber(phoneNumber);
      
      const { data, error } = await supabase.functions.invoke('verify-phone-code', {
        body: {
          user_id: user?.id,
          phone_number: formattedPhone,
          code: code
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Phone Verified!",
          description: "Your phone number has been successfully verified"
        });
        
        await refetch();
        onVerified?.();
        onOpenChange(false);
      } else {
        throw new Error(data?.error || 'Invalid or expired code');
      }
    } catch (error: any) {
      console.error('Verify code error:', error);
      toast({
        title: "Verification Failed",
        description: error.message || "Invalid or expired code. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setCode('');
    handleSendCode();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Phone Verification
          </DialogTitle>
          <DialogDescription>
            {step === 'phone' 
              ? 'Enter your phone number to receive a verification code via Telegram'
              : 'Enter the 6-digit code sent to your Telegram'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {step === 'phone' ? (
            <>
              {/* Phone Input */}
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-md border border-input">
                    <span className="text-sm text-muted-foreground">+234</span>
                  </div>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="8012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter your Nigerian phone number
                </p>
              </div>

              {/* Telegram requirement notice */}
              {!profile?.telegram_user_id && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200">Telegram Required</p>
                    <p className="text-amber-700 dark:text-amber-300">
                      Please link your Telegram account first to receive verification codes.
                    </p>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleSendCode} 
                disabled={isLoading || !phoneNumber || !profile?.telegram_user_id}
                className="w-full"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Send Verification Code
              </Button>
            </>
          ) : (
            <>
              {/* Code Input */}
              <div className="space-y-4">
                <div className="flex justify-center">
                  <InputOTP 
                    maxLength={6} 
                    value={code} 
                    onChange={(value) => setCode(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {/* Timer */}
                <div className="flex items-center justify-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {timeLeft > 0 ? (
                    <span className="text-muted-foreground">
                      Code expires in <span className="font-medium text-foreground">{formatTime(timeLeft)}</span>
                    </span>
                  ) : (
                    <span className="text-destructive">Code expired</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Button 
                  onClick={handleVerifyCode} 
                  disabled={isLoading || code.length !== 6 || timeLeft <= 0}
                  className="w-full"
                >
                  {isLoading ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Verify Code
                </Button>

                <Button 
                  variant="outline"
                  onClick={handleResend}
                  disabled={isLoading || !canResend}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {canResend ? 'Resend Code' : `Resend in ${formatTime(timeLeft)}`}
                </Button>

                <Button 
                  variant="ghost"
                  onClick={() => setStep('phone')}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
