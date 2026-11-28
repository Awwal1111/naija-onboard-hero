/**
 * Lightweight Amplitude HTTP API adapter.
 *
 * Configure VITE_AMPLITUDE_API_KEY in Vercel/Lovable environment variables.
 * No private user data is sent. Event properties are scrubbed before dispatch.
 * Analytics failures must never affect the marketplace experience.
 */
const API_KEY = import.meta.env.VITE_AMPLITUDE_API_KEY as string | undefined;
const ENDPOINT = 'https://api2.amplitude.com/2/httpapi';
const DEVICE_KEY = 'nl_analytics_device_id';
const SESSION_KEY = 'nl_analytics_session_id';

let userId: string | undefined;
let deviceId: string | undefined;
let sessionId: number | undefined;

const getId = () => {
  try {
    return typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `nl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  } catch {
    return `nl-${Date.now()}`;
  }
};

const getIdentity = () => {
  if (typeof window === 'undefined') return null;
  try {
    deviceId = deviceId || localStorage.getItem(DEVICE_KEY) || getId();
    localStorage.setItem(DEVICE_KEY, deviceId);
    sessionId = sessionId || Number(sessionStorage.getItem(SESSION_KEY)) || Date.now();
    sessionStorage.setItem(SESSION_KEY, String(sessionId));
    return { device_id: deviceId, session_id: sessionId };
  } catch {
    return { device_id: getId(), session_id: Date.now() };
  }
};

const isSensitiveKey = (key: string) =>
  /email|phone|mobile|password|token|secret|message|content|wallet|address|fullname|first.?name|last.?name|dob|birth|bank|account.?number|private.?key/i.test(key);

const cleanProperties = (input?: Record<string, unknown>) => {
  if (!input) return {};
  return Object.fromEntries(
    Object.entries(input).filter(([key, value]) =>
      !isSensitiveKey(key) &&
      (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') &&
      (typeof value !== 'string' || value.length <= 120)
    )
  );
};

export const initAmplitude = () => {
  // API keys are public project identifiers, never secret server credentials.
  // Keep Amplitude disabled until the project key is configured.
  if (!API_KEY || typeof window === 'undefined') return;
  const host = window.location.hostname;
  const isPreview = host.includes('lovableproject.com') || host.includes('id-preview--') || host === 'localhost';
  let isIframe = false;
  try { isIframe = window.self !== window.top; } catch { isIframe = true; }
  if (isPreview || isIframe) return;
  getIdentity();
};

export const identifyAmplitudeUser = (id: string) => {
  userId = id || undefined;
};

export const resetAmplitudeUser = () => {
  userId = undefined;
};

export const trackAmplitudeEvent = (name: string, properties?: Record<string, unknown>) => {
  if (!API_KEY || typeof window === 'undefined' || !name) return;
  const identity = getIdentity();
  if (!identity) return;
  const body = {
    api_key: API_KEY,
    events: [{
      event_type: name,
      user_id: userId,
      device_id: identity.device_id,
      session_id: identity.session_id,
      time: Date.now(),
      event_properties: cleanProperties(properties),
      platform: 'Web',
      app_version: 'NaijaLancers',
    }],
  };
  try {
    void fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => { /* Analytics must never interrupt the app. */ });
  } catch {
    // Ignore analytics transport failures.
  }
};
