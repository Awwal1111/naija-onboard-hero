import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle } from 'lucide-react'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('reference')
  const [message, setMessage] = useState('Finalizing your payment...')

  useEffect(() => {
    setMessage(reference
      ? 'Your payment provider has returned a successful payment response. Check your wallet transaction history for the final status.'
      : 'Your payment has been processed. Check your wallet for the latest transaction status.')

    const timer = setTimeout(() => navigate('/earn'), 7000)
    return () => clearTimeout(timer)
  }, [navigate, reference])

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