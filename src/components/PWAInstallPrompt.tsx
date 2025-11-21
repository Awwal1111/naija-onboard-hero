import { useEffect, useState } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useCookies } from '@/hooks/useCookies';
import { Button } from './ui/button';
import { X, Download } from 'lucide-react';
import { Card } from './ui/card';

export const PWAInstallPrompt = () => {
  const { isInstallable, promptInstall } = usePWAInstall();
  const { getCookie, setCookie } = useCookies();
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Only show prompt if user hasn't dismissed it and app is installable
    const dismissed = getCookie('pwa_prompt_dismissed');
    const installed = getCookie('app_installed');
    
    if (isInstallable && !dismissed && !installed) {
      // Show prompt after 10 seconds
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isInstallable, getCookie]);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      setCookie('app_installed', 'true', { expires: 365 });
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setCookie('pwa_prompt_dismissed', 'true', { expires: 7 }); // Dismiss for 7 days
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5">
      <Card className="p-4 shadow-lg border-2 border-primary/20 bg-background">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Install NaijaLancers App</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Get faster access and work offline! Install our app to your home screen.
            </p>
            <div className="flex gap-2">
              <Button onClick={handleInstall} size="sm" className="flex-1">
                <Download className="w-4 h-4 mr-1" />
                Install
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="outline">
                Later
              </Button>
            </div>
          </div>
          <Button
            onClick={handleDismiss}
            size="icon"
            variant="ghost"
            className="flex-shrink-0 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
