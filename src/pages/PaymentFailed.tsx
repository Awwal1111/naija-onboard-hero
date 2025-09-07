import React from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft } from 'lucide-react'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const PaymentFailed = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const reference = searchParams.get('reference')
  const reason = searchParams.get('reason')
  const error = searchParams.get('error')

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-xl text-text-primary">Payment Failed</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-text-secondary">
            Unfortunately, your payment could not be processed.
          </p>
          
          {(reason || error) && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-medium text-red-800">Error Details</p>
              <p className="text-sm text-red-600">{reason || error}</p>
            </div>
          )}
          
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
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Earn Hub
            </BrandButton>
            <BrandButton 
              variant="outline"
              onClick={() => window.location.reload()}
              className="w-full"
            >
              Try Again
            </BrandButton>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default PaymentFailed