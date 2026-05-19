import React, { useState } from 'react'
import { ArrowLeft, Trash2, Mail, AlertTriangle, ShieldCheck, Clock } from 'lucide-react'
import { useNavigate, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Logo } from '@/components/ui/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/use-toast'

const AccountDeletion = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const contactEmail = 'support@naijalancers.name.ng'

  const handleEmailRequest = () => {
    const subject = encodeURIComponent('Account Deletion Request')
    const body = encodeURIComponent(
      `Hello NaijaLancers Team,\n\nI would like to request the deletion of my account and associated personal data.\n\nAccount email: ${user?.email || '[your email]'}\nUser ID (optional): ${user?.id || ''}\n\nReason (optional):\n\nThank you.`,
    )
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&to=${contactEmail}&su=${subject}&body=${body}`, '_blank')
  }

  const handleInAppRequest = async () => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Log in to submit an in-app deletion request, or email us instead.', variant: 'destructive' })
      return
    }
    setSubmitting(true)
    try {
      const { error } = await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'account_deletion_request',
        title: 'Account deletion requested',
        message: 'Your account deletion request has been received. Our team will process it within 30 days.',
        metadata: { source: 'account_deletion_page', requested_at: new Date().toISOString() },
      })
      if (error) throw error
      toast({ title: 'Request received', description: 'We will process your deletion within 30 days. Check your email for updates.' })
    } catch (e: any) {
      toast({ title: 'Could not submit', description: e?.message || 'Please email us instead.', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Account Deletion Policy | NaijaLancers</title>
        <meta name="description" content="How to request deletion of your NaijaLancers account and personal data, what is removed, what is retained, and how long it takes." />
        <link rel="canonical" href="https://www.naijalancers.name.ng/account-deletion" />
      </Helmet>

      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
            <span className="text-text-secondary">Back</span>
          </button>
          <Logo />
        </div>
      </header>

      <main className="px-6 py-8 max-w-3xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <Badge variant="outline" className="mx-auto"><Trash2 className="h-3 w-3 mr-1" /> Data Rights</Badge>
          <h1 className="text-3xl font-bold">Account Deletion Policy</h1>
          <p className="text-text-secondary">Last updated: May 19, 2026</p>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-5 w-5" /> Your Right to Delete</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-text-secondary">
            <p>You can request permanent deletion of your NaijaLancers account and personal data at any time. There are two ways to make the request:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li><b>In-app:</b> Settings → Account → Delete Account.</li>
              <li><b>By email:</b> Send a request to <a className="text-primary underline" href={`mailto:${contactEmail}`}>{contactEmail}</a> from the email address registered on your account.</li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Trash2 className="h-5 w-5" /> What Will Be Deleted</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-text-secondary">
            <ul className="list-disc list-inside space-y-1">
              <li>Profile information (name, avatar, bio, skills, location)</li>
              <li>Login credentials and authentication records</li>
              <li>Posts, comments, stories, messages and uploaded media</li>
              <li>Gigs, job posts, applications and saved searches</li>
              <li>Wallet metadata and any non-financial preferences</li>
              <li>Push tokens, device IDs and notification settings</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> What May Be Retained</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-text-secondary">
            <p>To comply with Nigerian financial regulations (CBN, NDPR) and fraud prevention, we may retain the following in anonymised or limited form:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Financial transaction records (escrow, withdrawals, deposits) — up to <b>7 years</b></li>
              <li>KYC verification records — up to <b>5 years</b> after deletion</li>
              <li>Tax invoices and platform-fee receipts</li>
              <li>Records required for an ongoing dispute, investigation or court order</li>
              <li>Aggregated, non-identifying analytics</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Timeline</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-text-secondary">
            <ul className="list-disc list-inside space-y-1">
              <li>You will receive an email confirming receipt within <b>48 hours</b>.</li>
              <li>Account is deactivated immediately on request and made invisible to other users.</li>
              <li>Personal data is permanently removed within <b>30 days</b>.</li>
              <li>Backups containing your data are purged on the next rotation cycle (up to <b>90 days</b>).</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Mail className="h-5 w-5" /> Request Deletion Now</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-text-secondary">Choose the method that works for you. Both are processed the same way.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={handleInAppRequest} disabled={submitting} className="flex-1">
                {submitting ? 'Submitting…' : 'Submit In-App Request'}
              </Button>
              <Button onClick={handleEmailRequest} variant="outline" className="flex-1">
                Email {contactEmail}
              </Button>
            </div>
            <p className="text-xs text-text-secondary">
              See our <Link to="/privacy-policy" className="text-primary underline">Privacy Policy</Link> for details on how we handle your data.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default AccountDeletion
