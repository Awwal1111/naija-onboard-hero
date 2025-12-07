import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Camera, CheckCircle, RefreshCw, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';

interface FaceVerificationDialogProps {
  isVerified?: boolean;
  onVerified?: () => void;
}

export const FaceVerificationDialog: React.FC<FaceVerificationDialogProps> = ({ 
  isVerified = false,
  onVerified 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const { refetch } = useProfile();

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      console.log('[FaceVerification] Starting camera...');
      
      // Check if mediaDevices is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera access is not supported in this browser. Please use a modern browser.');
        return;
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      console.log('[FaceVerification] Got media stream:', stream.getTracks());
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log('[FaceVerification] Video metadata loaded');
          videoRef.current?.play().catch(e => console.error('[FaceVerification] Play error:', e));
        };
        
        setIsCapturing(true);
      }
    } catch (err: any) {
      console.error('[FaceVerification] Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera found. Please ensure your device has a working camera.');
      } else if (err.name === 'NotReadableError') {
        setError('Camera is being used by another application. Please close other apps using the camera.');
      } else {
        setError(`Could not access camera: ${err.message || 'Unknown error'}`);
      }
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current) return;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.8);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError(null);
    startCamera();
  }, [startCamera]);

  const verifyFace = async () => {
    if (!capturedImage) return;

    setIsVerifying(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-face', {
        body: { image_base64: capturedImage }
      });

      if (fnError) throw fnError;

      if (data?.success && data?.verified) {
        toast({
          title: "Face Verified!",
          description: "Your identity has been verified successfully.",
        });
        refetch();
        onVerified?.();
        setIsOpen(false);
      } else {
        setError(data?.error || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setError(null);
    setIsOpen(false);
  };

  if (isVerified) {
    return (
      <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Identity Verified</span>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) handleClose();
      else setIsOpen(true);
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Camera className="h-4 w-4 mr-2" />
          Verify Identity
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Face Verification
          </DialogTitle>
          <DialogDescription>
            Take a selfie to verify your identity. Ensure good lighting and look directly at the camera.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!isCapturing && !capturedImage && (
            <div className="text-center space-y-4">
              <div className="w-32 h-32 mx-auto bg-muted rounded-full flex items-center justify-center">
                <Camera className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Take a selfie to verify your identity
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside text-left">
                  <li>Ensure good lighting</li>
                  <li>Look directly at the camera</li>
                  <li>Remove glasses or hats if possible</li>
                </ul>
              </div>
              <Button onClick={startCamera} className="w-full">
                <Camera className="h-4 w-4 mr-2" />
                Start Camera
              </Button>
            </div>
          )}

          {isCapturing && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 border-2 border-dashed border-white/50 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={stopCamera} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button onClick={capturePhoto} className="flex-1">
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <img 
                  src={capturedImage} 
                  alt="Captured selfie" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={retakePhoto} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retake
                </Button>
                <Button onClick={verifyFace} disabled={isVerifying} className="flex-1">
                  {isVerifying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FaceVerificationDialog;
