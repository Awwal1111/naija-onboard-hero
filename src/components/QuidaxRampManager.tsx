import { useState, useEffect } from 'react'
import { QuidaxRampWidget } from './QuidaxRampWidget'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay

/**
 * QuidaxRampManager - Manages Quidax on/off ramp widget
 * 
 * CRITICAL: Disabled in MiniPay to prevent hook-related re-renders
 */
export const QuidaxRampManager = () => {
  // CRITICAL: Return null in MiniPay BEFORE any hooks
  if (isMiniPayEnv) {
    return null
  }
  
  return <QuidaxRampManagerInternal />
}

// Internal component that only runs in non-MiniPay environments
const QuidaxRampManagerInternal = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [mode, setMode] = useState<'buy' | 'sell'>('buy')

  useEffect(() => {
    const handleOpenWidget = (event: CustomEvent) => {
      setMode(event.detail.mode)
      setIsOpen(true)
    }

    window.addEventListener('open-quidax-widget' as any, handleOpenWidget as any)

    return () => {
      window.removeEventListener('open-quidax-widget' as any, handleOpenWidget as any)
    }
  }, [])

  return (
    <QuidaxRampWidget
      open={isOpen}
      onOpenChange={setIsOpen}
      mode={mode}
    />
  )
}