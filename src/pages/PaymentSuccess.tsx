import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('reference')
  const [message, setMessage] = useState('Finalizing your payment...')

  useEffect(() => {
    const finalizeIvoryPay = async () => {
      const pendingReference = reference || localStorage.getItem('ivorypay_pending_ref')

      if (!pendingReference) {
        setMessage('Your payment has been processed successfully.')
        return
      }

      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setMessage('Payment received. Please log in again to refresh your wallet.')
          return
        }

        const response = await supabase.functions.invoke('ivorypay-deposit', {
          body: { action: 'verify', reference: pendingReference },
          headers: { Authorization: `Bearer ${session.access_token}` },
        })

        if (response.error) throw new Error(response.error.message)

        const data = response.data
        if (data?.status === 'SUCCESS' && data?.ncAmount > 0) {
          localStorage.removeItem('ivorypay_pending_ref')
          setMessage(`Deposit confirmed. NC ${data.ncAmount.toLocaleString()} has been added to your wallet.`)
          toast.success('IvoryPay deposit confirmed')
          return
        }

        setMessage(data?.message || 'Payment recorded. Wallet credit is still pending confirmation.')
      } catch (error: any) {
        setMessage(error.message || 'Payment received, but automatic confirmation is still pending.')
      }
    }

    finalizeIvoryPay()

    const timer = setTimeout(() => navigate('/earn'), 7000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-xl text-text-primary">Payment Successful!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-secondary">{message}</p>
          
          {reference && (
            <div className="text-xs text-text-secondary">
              Reference: {reference}
            </div>
          )}
          
          <div className="space-y-2">
            <BrandButton 
              onClick={() => navigate('/earn')}
              className="w-full"
            >
              Continue to Earn Hub
            </BrandButton>
              <p className="text-sm text-text-secondary">
                Redirecting automatically in 7 seconds...
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentSuccess