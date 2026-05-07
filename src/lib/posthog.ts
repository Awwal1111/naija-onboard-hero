import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_ysKe6jkKVLgepXmwwUZzQxDYhx7Z6aMEGZpmhivGgFAX';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let initialized = false;

export const initPostHog = () => {
  if (initialized || typeof window === 'undefined') return;

  // Skip on previews/iframes
  const host = window.location.hostname;
  const isPreview =
    host.includes('lovableproject.com') ||
    host.includes('id-preview--') ||
    host === 'localhost';
  let isIframe = false;
  try { isIframe = window.self !== window.top; } catch { isIframe = true; }
  if (isPreview || isIframe) return;

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    disable_session_recording: false,
    persistence: 'localStorage+cookie',
    loaded: () => {
      initialized = true;
    },
  });
  initialized = true;
};

export const identifyUser = (userId: string, traits?: Record<string, any>) => {
  if (!initialized) return;
  try { posthog.identify(userId, traits); } catch {}
};

export const resetPostHog = () => {
  if (!initialized) return;
  try { posthog.reset(); } catch {}
};

export const trackEvent = (name: string, props?: Record<string, any>) => {
  if (!initialized) return;
  try { posthog.capture(name, props); } catch {}
};

export { posthog };
