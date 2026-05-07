import { lazy, Suspense, useEffect, useState } from 'react'
import { initPostHog } from '@/lib/posthog'

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
    let handle: number
    if (ric) {
      handle = ric(() => setReady(true), { timeout: 3000 })
    } else {
      handle = window.setTimeout(() => setReady(true), 1500)
    }
    return () => {
      if (ric && window.cancelIdleCallback) {
        window.cancelIdleCallback(handle)
      } else {
        clearTimeout(handle)
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
