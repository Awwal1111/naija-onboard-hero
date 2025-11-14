import { useState, useEffect } from 'react'
import { QuidaxRampWidget } from './QuidaxRampWidget'

export const QuidaxRampManager = () => {
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