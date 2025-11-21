import { useEffect } from 'react';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Smartphone, Download, CheckCircle2, Share2, Home, MoreVertical } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useCookies } from '@/hooks/useCookies';

const InstallApp = () => {
  const navigate = useNavigate();
  const { isInstallable, isInstalled, promptInstall } = usePWAInstall();
  const { setCookie, getCookie } = useCookies();

  useEffect(() => {
    // Track that user visited install page
    setCookie('visited_install_page', 'true', { expires: 365 });
  }, [setCookie]);

  const handleInstall = async () => {
    const installed = await promptInstall();
    if (installed) {
      toast.success('App installed successfully!');
      setCookie('app_installed', 'true', { expires: 365 });
      setTimeout(() => navigate('/main-feed'), 2000);
    }
  };

  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/10 to-background p-4 flex items-center justify-center">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-primary flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-primary-foreground" />
          </div>
          <CardTitle className="text-3xl">Install NaijaLancers App</CardTitle>
          <CardDescription className="text-lg">
            Get the best experience with our installable web app!
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <CheckCircle2 className="w-16 h-16 mx-auto text-green-500" />
              <h3 className="text-xl font-semibold">App Already Installed!</h3>
              <p className="text-muted-foreground">
                You can find NaijaLancers on your home screen
              </p>
              <Button onClick={() => navigate('/main-feed')} className="w-full">
                Open App
              </Button>
            </div>
          ) : isInstallable && !isIOS ? (
            <div className="space-y-4">
              <div className="bg-primary/10 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">✨ Benefits of Installing:</h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Works offline - access even without internet</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Faster loading - instant app startup</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Home screen icon - just like a native app</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Push notifications - stay updated</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Full screen experience - no browser bars</span>
                  </li>
                </ul>
              </div>
              
              <Button onClick={handleInstall} size="lg" className="w-full">
                <Download className="w-5 h-5 mr-2" />
                Install Now
              </Button>
              
              <p className="text-sm text-center text-muted-foreground">
                Click the button above to install NaijaLancers to your home screen
              </p>
            </div>
          ) : isIOS ? (
            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-blue-500" />
                  Install on iPhone/iPad
                </h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="font-medium">Tap the Share button</p>
                      <p className="text-muted-foreground">Look for the <Share2 className="w-4 h-4 inline" /> icon at the bottom of Safari</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="font-medium">Select "Add to Home Screen"</p>
                      <p className="text-muted-foreground">Scroll down and tap <Home className="w-4 h-4 inline" /> "Add to Home Screen"</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="font-medium">Tap "Add"</p>
                      <p className="text-muted-foreground">Confirm by tapping "Add" in the top right</p>
                    </div>
                  </li>
                </ol>
              </div>
              
              <div className="bg-primary/10 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">✨ What you'll get:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Full screen app experience</li>
                  <li>• Faster loading times</li>
                  <li>• Works offline</li>
                  <li>• Home screen icon</li>
                </ul>
              </div>
            </div>
          ) : isAndroid ? (
            <div className="space-y-4">
              <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <MoreVertical className="w-5 h-5 text-green-500" />
                  Install on Android
                </h3>
                <ol className="space-y-3 text-sm">
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">1</span>
                    <div>
                      <p className="font-medium">Open browser menu</p>
                      <p className="text-muted-foreground">Tap the <MoreVertical className="w-4 h-4 inline" /> menu icon (three dots)</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">2</span>
                    <div>
                      <p className="font-medium">Tap "Install app" or "Add to Home screen"</p>
                      <p className="text-muted-foreground">Look for the install option in the menu</p>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500 text-white flex items-center justify-center text-xs font-bold">3</span>
                    <div>
                      <p className="font-medium">Confirm installation</p>
                      <p className="text-muted-foreground">Tap "Install" when prompted</p>
                    </div>
                  </li>
                </ol>
              </div>
              
              <div className="bg-primary/10 p-4 rounded-lg">
                <h4 className="font-semibold mb-2">✨ App features:</h4>
                <ul className="space-y-1 text-sm">
                  <li>• Native app experience</li>
                  <li>• Offline functionality</li>
                  <li>• Push notifications</li>
                  <li>• Faster performance</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-500/10 border border-yellow-500/20 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Desktop Browser Detected</h3>
                <p className="text-sm text-muted-foreground">
                  To install NaijaLancers as an app, please visit this page on your mobile device (iPhone or Android).
                </p>
              </div>
              
              <Button onClick={() => navigate('/main-feed')} variant="outline" className="w-full">
                Continue to Website
              </Button>
            </div>
          )}
          
          <div className="pt-4 border-t">
            <Button 
              onClick={() => navigate('/main-feed')} 
              variant="ghost" 
              className="w-full"
            >
              Skip and use in browser
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallApp;
