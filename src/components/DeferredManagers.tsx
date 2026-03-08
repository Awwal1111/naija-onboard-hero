import { lazy, Suspense, useEffect, useState } from 'react'

const WalletInitializer = lazy(() => import('@/components/WalletInitializer'))
const GlobalCallManager = lazy(() => import('@/components/GlobalCallManager'))
const GlobalPresenceManager = lazy(() => import('@/components/GlobalPresenceManager'))
const QuidaxRampManager = lazy(() => import('@/components/QuidaxRampManager').then(m => ({ default: m.QuidaxRampManager })))
const PWAInstallPrompt = lazy(() => import('@/components/PWAInstallPrompt').then(m => ({ default: m.PWAInstallPrompt })))
const PushNotificationManager = lazy(() => import('@/components/PushNotificationManager').then(m => ({ default: m.PushNotificationManager })))
const OnboardingTour = lazy(() => import('@/components/OnboardingTour').then(m => ({ default: m.OnboardingTour })))

/**
 * Defers loading of non-critical global managers until after the main UI has rendered.
 * Uses requestIdleCallback (or setTimeout fallback) to avoid blocking initial paint.
 */
export const DeferredManagers = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const ric = window.requestIdleCallback
    const schedule = ric ? (cb: IdleRequestCallback) => ric(cb, { timeout: 3000 }) : (cb: () => void) => setTimeout(cb, 1500)
    const id = schedule(() => setReady(true), { timeout: 3000 })
    return () => {
      if (window.cancelIdleCallback) {
        window.cancelIdleCallback(id as number)
      }
    }
  }, [])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <WalletInitializer />
      <GlobalCallManager />
      <GlobalPresenceManager />
      <QuidaxRampManager />
      <PWAInstallPrompt />
      <PushNotificationManager />
      <OnboardingTour />
    </Suspense>
  )
}
