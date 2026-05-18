import React from 'react'
import { ArrowLeft, RefreshCcw, Clock, AlertTriangle, CheckCircle, XCircle, Phone, Mail, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

const RefundPolicy = () => {
  const navigate = useNavigate()

  const handleContactPhone = () => {
    const phoneNumber = "08167140857"
    const whatsappUrl = `https://wa.me/234${phoneNumber.slice(1)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleContactEmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=support@naijalancers.name.ng&su=Refund%20Request&body=Hello%20NaijaLancers%20Team,%0D%0A%0D%0AI would like to request a refund for:%0D%0A%0D%0AOrder ID:%0D%0AReason:%0D%0A`
    window.open(gmailUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Back</span>
          </button>
          <Logo />
          <div className="w-16" />
        </div>
      </header>

      <div className="px-6 py-8 max-w-4xl mx-auto">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <RefreshCcw className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Refund Policy</h1>
          <p className="text-muted-foreground">Understanding our refund and cancellation policies</p>
          <Badge variant="secondary" className="mt-2">
            Last Updated: January 2025
          </Badge>
        </div>

        {/* Quick Summary */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="h-5 w-5" />
              Quick Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Full refund if order not started within 24 hours</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>SafePay escrow protects your payments</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <span>Refund requests processed within 3-5 business days</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span>No refunds after work delivery is accepted</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact for Refunds */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Request a Refund
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleContactPhone}
                className="flex-1 flex items-center gap-2"
                variant="outline"
              >
                <Phone className="h-4 w-4" />
                WhatsApp: 08167140857
              </Button>
              <Button
                onClick={handleContactEmail}
                className="flex-1 flex items-center gap-2"
                variant="outline"
              >
                <Mail className="h-4 w-4" />
                Email: Support@Naijalancers.name.ng
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Policy Details */}
        <div className="space-y-6">
          {/* 1. Gig/Service Orders */}
          <Card>
            <CardHeader>
              <CardTitle>1. Gig & Service Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold mb-2 text-green-600">Eligible for Full Refund:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Order cancelled within 24 hours AND work has not started</li>
                  <li>Seller fails to deliver by the agreed deadline (3+ days late)</li>
                  <li>Seller becomes unresponsive for 7+ days</li>
                  <li>Delivered work does not match the order description</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2 text-yellow-600">Partial Refund Possible:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Order cancelled after work has started (refund amount negotiated)</li>
                  <li>Minor discrepancies from order requirements</li>
                  <li>Mutual agreement between buyer and seller</li>
                </ul>
              </div>
              <Separator />
              <div>
                <h4 className="font-semibold mb-2 text-red-600">Not Eligible for Refund:</h4>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground text-sm">
                  <li>Buyer accepted delivery and marked order as complete</li>
                  <li>Refund requested more than 14 days after delivery</li>
                  <li>Buyer failed to provide necessary information/materials</li>
                  <li>Change of mind after receiving completed work</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 2. Digital Products */}
          <Card>
            <CardHeader>
              <CardTitle>2. Digital Products</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span className="font-semibold text-yellow-700 dark:text-yellow-400">Important Note</span>
                </div>
                <p className="text-yellow-700 dark:text-yellow-300">
                  Due to the nature of digital products (instant download), refunds are generally not available once the product has been accessed or downloaded.
                </p>
              </div>
              <p><strong>Exceptions where refunds may be granted:</strong></p>
              <ul className="list-disc list-inside space-y-1">
                <li>Product file is corrupted or won't open</li>
                <li>Product significantly different from description</li>
                <li>Duplicate purchase (charged twice)</li>
                <li>Technical issues preventing access</li>
              </ul>
            </CardContent>
          </Card>

          {/* 3. Courses */}
          <Card>
            <CardHeader>
              <CardTitle>3. Online Courses</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <p>We want you to be satisfied with your learning experience:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>7-Day Guarantee:</strong> Full refund if requested within 7 days of purchase AND less than 20% of course completed</li>
                <li><strong>Content Issues:</strong> Refund if course content is substantially different from description</li>
                <li><strong>Technical Problems:</strong> Refund if technical issues prevent course access (and cannot be resolved)</li>
              </ul>
              <p className="text-red-500 mt-2">
                <strong>No refunds:</strong> After completing more than 20% of the course or after 7 days from purchase.
              </p>
            </CardContent>
          </Card>

          {/* 4. Wallet & Deposits */}
          <Card>
            <CardHeader>
              <CardTitle>4. Wallet Deposits</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <ul className="list-disc list-inside space-y-1">
                <li>Wallet deposits are non-refundable once credited to your account</li>
                <li>Unused NC balance can be withdrawn to your bank account (minimum ₦1000)</li>
                <li>Failed deposits that were charged will be credited or refunded within 48 hours</li>
                <li>Duplicate charges will be automatically refunded</li>
              </ul>
            </CardContent>
          </Card>

          {/* 5. SafePay Escrow */}
          <Card>
            <CardHeader>
              <CardTitle>5. SafePay Escrow Transactions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <p>SafePay protects both buyers and sellers:</p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Funds held securely</strong> until work is delivered and approved</li>
                <li><strong>Buyer protection:</strong> Release funds only when satisfied with delivery</li>
                <li><strong>Dispute resolution:</strong> Admin mediates if parties cannot agree</li>
                <li><strong>Auto-release:</strong> Funds released automatically after 14 days if buyer doesn't respond to delivery</li>
              </ul>
            </CardContent>
          </Card>

          {/* 6. How to Request */}
          <Card>
            <CardHeader>
              <CardTitle>6. How to Request a Refund</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <ol className="list-decimal list-inside space-y-2">
                <li>Contact support via WhatsApp or Email (details above)</li>
                <li>Provide your Order ID and reason for refund request</li>
                <li>Include any relevant screenshots or evidence</li>
                <li>Our team will review within 24-48 hours</li>
                <li>Approved refunds are processed within 3-5 business days</li>
              </ol>
              <div className="mt-4 p-3 bg-muted rounded-lg">
                <p className="font-medium">Processing Times:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Wallet credit: Instant</li>
                  <li>Bank transfer: 1-3 business days</li>
                  <li>Card refund: 5-10 business days (depends on your bank)</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* 7. Disputes */}
          <Card>
            <CardHeader>
              <CardTitle>7. Dispute Resolution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground text-sm">
              <p>If you disagree with a refund decision:</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Reply to the refund decision email with additional information</li>
                <li>Our senior team will review your case within 48 hours</li>
                <li>Final decision will be communicated via email</li>
                <li>All decisions made in accordance with Nigerian consumer protection laws</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-muted-foreground text-sm">
            This refund policy is subject to change. Please check this page periodically for updates.
          </p>
          <div className="flex justify-center gap-4 mt-4">
            <Button variant="link" onClick={() => navigate('/terms-conditions')}>
              Terms of Service
            </Button>
            <Button variant="link" onClick={() => navigate('/policy-privacy')}>
              Privacy Policy
            </Button>
            <Button variant="link" onClick={() => navigate('/help')}>
              Help Center
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RefundPolicy
