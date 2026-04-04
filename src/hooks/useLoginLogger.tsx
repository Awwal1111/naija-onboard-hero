import { useRef, useCallback } from 'react';
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

/**
 * useLoginLogger - provides a logLogin function to be called explicitly after sign-in.
 * 
 * FIXED: No longer creates its own onAuthStateChange subscription.
 * Previously this was one of 5+ competing auth listeners causing race conditions.
 * Now it's a simple callable function triggered from the signIn flow.
 */
export const useLoginLogger = () => {
  const loggedRef = useRef(false);

  const logLogin = useCallback(async (loginMethod: string = 'email') => {
    if (loggedRef.current) return;
    loggedRef.current = true;

    try {
      const device = detectDeviceInfo();
      const ip = await getClientIP();
      
      // Fire and forget - don't await
      supabase.functions.invoke('log-login', {
        body: {
          ip_address: ip,
          user_agent: device.userAgent,
          device_type: device.deviceType,
          browser: device.browser,
          os: device.os,
          login_method: loginMethod,
        },
      }).catch(e => console.warn('Login logging failed:', e));
    } catch (e) {
      console.warn('Login logging failed:', e);
    }
  }, []);

  const resetLogger = useCallback(() => {
    loggedRef.current = false;
  }, []);

  return { logLogin, resetLogger };
};