import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Shield, ShieldCheck, Camera, AlertCircle, CheckCircle, RefreshCw, Loader2, Fingerprint } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { useUserCountry } from '@/hooks/useUserCountry';

interface IdentityVerificationDialogProps {
  isVerified?: boolean;
  onVerified?: () => void;
}

export const IdentityVerificationDialog: React.FC<IdentityVerificationDialogProps> = ({
  isVerified = false,
  onVerified,
}) => {
  const { isNigerian, loading: countryLoading } = useUserCountry();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<'select' | 'input' | 'selfie' | 'verifying' | 'result'>('select');
  const [verificationType, setVerificationType] = useState<'nin' | 'bvn'>('nin');
  const [idNumber, setIdNumber] = useState('');
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  
  // Camera
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);

  const { toast } = useToast();
  const { refetch } = useProfile();

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err: any) {
      setError('Could not access camera. Please allow camera permission.');
    }
  }, []);

  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(console.error);
    }
  }, [cameraActive]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
  }, []);

  const captureSelfie = useCallback(() => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      setSelfieImage(canvas.toDataURL('image/jpeg', 0.8));
      stopCamera();
    }
  }, [stopCamera]);

  const handleVerify = async () => {
    if (isNigerian && (!idNumber || !consent)) return;
    if (!isNigerian && !selfieImage) return;

    setIsVerifying(true);
    setError(null);
    setStep('verifying');

    try {
      const body = isNigerian
        ? { type: verificationType, id_number: idNumber, consent: true, selfie_base64: selfieImage, country: 'NG' }
        : { type: 'selfie_only', consent: true, selfie_base64: selfieImage, country: 'INTL' };

      const { data, error: fnError } = await supabase.functions.invoke('verify-identity', {
        body,
      });

      if (fnError) throw fnError;

      if (data?.success && data?.verified) {
        setVerificationResult(data);
        setStep('result');
        toast({
          title: '✅ Identity Verified!',
          description: `Your ${verificationType.toUpperCase()} has been verified as ${data.verified_name}`,
        });
        refetch();
        onVerified?.();
      } else {
        setError(data?.error || 'Verification failed');
        setStep('input');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
      setStep('input');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setStep('select');
    setIdNumber('');
    setSelfieImage(null);
    setError(null);
    setConsent(false);
    setIsOpen(false);
  };

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-sm font-medium">ID Verified</span>
      </div>
    );
  }

  // isNigerian is now derived from useUserCountry hook automatically

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); else setIsOpen(true); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Fingerprint className="h-4 w-4 mr-2" />
          Verify ID
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Identity Verification
          </DialogTitle>
         <DialogDescription>
            {countryLoading 
              ? 'Detecting your location...'
              : isNigerian 
                ? 'Verify your identity using NIN or BVN to unlock full platform features.'
                : 'Take a selfie for face verification to unlock platform features. Advanced ID verification coming soon.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Step: Select verification type */}
        {step === 'select' && isNigerian && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Choose verification method:</p>
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => { setVerificationType('nin'); setStep('input'); }}
            >
              <div className="text-left">
                <div className="font-medium">NIN Verification</div>
                <div className="text-xs text-muted-foreground">National Identity Number (11 digits)</div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
              onClick={() => { setVerificationType('bvn'); setStep('input'); }}
            >
              <div className="text-left">
                <div className="font-medium">BVN Verification</div>
                <div className="text-xs text-muted-foreground">Bank Verification Number (11 digits)</div>
              </div>
            </Button>
          </div>
        )}

        {step === 'select' && !isNigerian && (
          <div className="space-y-4 text-center">
            <div className="w-20 h-20 mx-auto bg-muted rounded-full flex items-center justify-center">
              <Camera className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              For non-Nigerian users, take a selfie for face verification. Advanced ID verification coming soon.
            </p>
            <Button onClick={() => { setStep('selfie'); startCamera(); }} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Take Verification Selfie
            </Button>
          </div>
        )}

        {/* Step: Enter ID number */}
        {step === 'input' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{verificationType === 'nin' ? 'NIN Number' : 'BVN Number'}</Label>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={11}
                placeholder={verificationType === 'nin' ? 'Enter your 11-digit NIN' : 'Enter your 11-digit BVN'}
                value={idNumber}
                onChange={(e) => setIdNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
              />
              <p className="text-xs text-muted-foreground">
                {idNumber.length}/11 digits
              </p>
            </div>

            <div className="flex items-start gap-2">
              <input
                type="checkbox"
                id="consent"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1"
              />
              <label htmlFor="consent" className="text-xs text-muted-foreground">
                I consent to verifying my identity. My {verificationType.toUpperCase()} will be verified through a secure government API. Only a hash will be stored.
              </label>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={() => { setStep('selfie'); startCamera(); }}
                disabled={idNumber.length !== 11 || !consent}
                className="flex-1"
              >
                Next: Take Selfie
              </Button>
            </div>
          </div>
        )}

        {/* Step: Selfie capture */}
        {step === 'selfie' && (
          <div className="space-y-4">
            {!selfieImage ? (
              <>
                {cameraActive ? (
                  <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-40 border-2 border-dashed border-white/50 rounded-full" />
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[4/3] bg-muted rounded-lg flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { stopCamera(); setStep(isNigerian ? 'input' : 'select'); }} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={captureSelfie} disabled={!cameraActive} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="aspect-[4/3] bg-black rounded-lg overflow-hidden">
                  <img src={selfieImage} alt="Selfie" className="w-full h-full object-cover" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => { setSelfieImage(null); startCamera(); }} className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button onClick={isNigerian ? handleVerify : handleVerify} className="flex-1">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Verifying */}
        {step === 'verifying' && (
          <div className="text-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
            <div>
              <p className="font-medium">Verifying your identity...</p>
              <p className="text-sm text-muted-foreground">This may take a few seconds</p>
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && verificationResult && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <ShieldCheck className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Identity Verified!</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Verified as: {verificationResult.verified_name}
              </p>
            </div>
            {verificationResult.risk_score > 0 && (
              <Badge variant="secondary" className="text-xs">
                Risk Score: {verificationResult.risk_score}/100
              </Badge>
            )}
            <Button onClick={handleClose} className="w-full">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default IdentityVerificationDialog;
