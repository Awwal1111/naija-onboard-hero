import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const detectDeviceInfo = () => {
  const ua = navigator.userAgent;
  
  let deviceType = 'desktop';
  if (/Mobi|Android/i.test(ua)) deviceType = 'mobile';
  else if (/Tablet|iPad/i.test(ua)) deviceType = 'tablet';

  let browser = 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('Opera') || ua.includes('OPR')) browser = 'Opera';

  let os = 'Unknown';
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return { deviceType, browser, os, userAgent: ua };
};

const getClientIP = async (): Promise<string | null> => {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      return data.ip;
    }
  } catch { /* ignore */ }
  return null;
};

export const useLoginLogger = () => {
  const loggedRef = useRef(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user && !loggedRef.current) {
        loggedRef.current = true;
        
        // Only log on actual sign in, not token refresh
        if (event !== 'SIGNED_IN') return;

        try {
          const device = detectDeviceInfo();
          const ip = await getClientIP();
          
          await supabase.functions.invoke('log-login', {
            body: {
              ip_address: ip,
              user_agent: device.userAgent,
              device_type: device.deviceType,
              browser: device.browser,
              os: device.os,
              login_method: session.user.app_metadata?.provider || 'email',
            },
          });
        } catch (e) {
          // Non-critical - don't block the user
          console.warn('Login logging failed:', e);
        }
      }
      
      if (event === 'SIGNED_OUT') {
        loggedRef.current = false;
      }
    });

    return () => subscription.unsubscribe();
  }, []);
};
