/**
 * Scroll Lock Guard
 * 
 * Radix UI Dialog adds overflow:hidden and pointer-events:none to <body>
 * when a modal opens. If the dialog unmounts without cleanup (lazy load fail,
 * error boundary, race condition), the body stays locked forever.
 *
 * This observer detects stale scroll locks and removes them automatically.
 */

let observer: MutationObserver | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;

function isDialogOpen(): boolean {
  // Check for any Radix overlay or dialog content currently in DOM
  return !!(
    document.querySelector('[data-radix-dialog-overlay]') ||
    document.querySelector('[data-radix-alert-dialog-overlay]') ||
    document.querySelector('[role="dialog"][data-state="open"]') ||
    document.querySelector('[vaul-drawer]')
  );
}

function removeStaleScrollLock() {
  const body = document.body;
  const html = document.documentElement;

  // Only clean up if NO dialog is actually open
  if (isDialogOpen()) return;

  // Remove Radix scroll-lock artifacts
  if (body.style.overflow === 'hidden') {
    body.style.overflow = '';
  }
  if (body.style.pointerEvents === 'none') {
    body.style.pointerEvents = '';
  }
  if (body.style.paddingRight) {
    body.style.paddingRight = '';
  }
  if (html.style.overflow === 'hidden') {
    html.style.overflow = '';
  }

  // Remove Radix data attributes that may linger
  body.removeAttribute('data-scroll-locked');
}

export function startScrollLockGuard() {
  // Run an initial cleanup in case we loaded with stale locks (e.g. from cached SW)
  setTimeout(removeStaleScrollLock, 2000);

  // Watch for body style mutations
  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.type === 'attributes' && m.attributeName === 'style') {
        const body = document.body;
        if (body.style.overflow === 'hidden' || body.style.pointerEvents === 'none') {
          // Schedule a delayed check — give Radix time to show the dialog
          if (cleanupTimer) clearTimeout(cleanupTimer);
          cleanupTimer = setTimeout(removeStaleScrollLock, 800);
        }
      }
    }
  });

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ['style', 'data-scroll-locked'],
  });

  // Also observe html element
  const htmlObserver = new MutationObserver(() => {
    if (document.documentElement.style.overflow === 'hidden') {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      cleanupTimer = setTimeout(removeStaleScrollLock, 800);
    }
  });
  htmlObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['style'],
  });

  // Safety net: periodic check every 5 seconds
  setInterval(removeStaleScrollLock, 5000);
}