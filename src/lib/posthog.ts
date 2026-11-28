import posthog from 'posthog-js';
import { initAmplitude, identifyAmplitudeUser, resetAmplitudeUser, trackAmplitudeEvent } from '@/lib/amplitude';

const POSTHOG_KEY = 'phc_ysKe6jkKVLgepXmwwUZzQxDYhx7Z6aMEGZpmhivGgFAX';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let initialized = false;

export const initPostHog = () => {
  if (initialized || typeof window === 'undefined') return;
  initAmplitude();

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
  identifyAmplitudeUser(userId);
  try { posthog.identify(userId, traits); } catch { /* Analytics must never interrupt the app. */ }
};

export const resetPostHog = () => {
  if (!initialized) return;
  resetAmplitudeUser();
  try { posthog.reset(); } catch { /* Analytics must never interrupt the app. */ }
};

export const trackEvent = (name: string, props?: Record<string, any>) => {
  if (!initialized) return;
  trackAmplitudeEvent(name, props);
  try { posthog.capture(name, props); } catch { /* Analytics must never interrupt the app. */ }
};

export { posthog };
