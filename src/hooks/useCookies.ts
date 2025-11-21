import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

interface CookieOptions {
  expires?: number | Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export const useCookies = () => {
  const [cookies, setCookies] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load all cookies on mount
    const allCookies = Cookies.get();
    setCookies(allCookies);
  }, []);

  const setCookie = (name: string, value: string, options?: CookieOptions) => {
    Cookies.set(name, value, options);
    setCookies(prev => ({ ...prev, [name]: value }));
  };

  const getCookie = (name: string): string | undefined => {
    return Cookies.get(name);
  };

  const removeCookie = (name: string, options?: CookieOptions) => {
    Cookies.remove(name, options);
    setCookies(prev => {
      const newCookies = { ...prev };
      delete newCookies[name];
      return newCookies;
    });
  };

  const clearAllCookies = () => {
    Object.keys(cookies).forEach(key => {
      Cookies.remove(key);
    });
    setCookies({});
  };

  return {
    cookies,
    setCookie,
    getCookie,
    removeCookie,
    clearAllCookies
  };
};
