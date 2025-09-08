import React from 'react'
import { ArrowLeft, Shield, Users, CreditCard, FileText, AlertCircle, Phone, Mail } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const TermsConditions = () => {
  const navigate = useNavigate()

  const handleContactPhone = () => {
    const phoneNumber = "08167140857"
    const whatsappUrl = `https://wa.me/234${phoneNumber.slice(1)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleContactEmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=support@naijalancers.com&su=Terms%20and%20Conditions%20Inquiry&body=Hello%20NaijaLancers%20Team,%0D%0A%0D%0A`
    window.open(gmailUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2">
            <ArrowLeft className="h-5 w-5 text-text-secondary" />
            <span className="text-text-secondary">Back</span>
          </button>
          <Logo />
          <div className="w-16" />
        </div>
      </header>

      <div className="px-6 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Terms & Conditions</h1>
          <p className="text-text-secondary">NaijaLancers Platform Agreement</p>
          <Badge variant="secondary" className="mt-2">
            Last Updated: January 2025
          </Badge>
        </div>

        {/* Contact Information Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Phone className="h-5 w-5" />
              Need Help?
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
                Email Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Terms Content */}
        <div className="space-y-6">
          {/* 1. Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                1. Introduction
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-sm max-w-none">
              <p className="text-text-secondary mb-4">
                Welcome to NaijaLancers, Nigeria's premier freelancing and professional networking platform. 
                These Terms and Conditions ("Terms") govern your use of our services, website, and mobile application.
              </p>
              <p className="text-text-secondary">
                By accessing or using NaijaLancers, you agree to be bound by these Terms. If you do not agree 
                to these Terms, please do not use our platform.
              </p>
            </CardContent>
          </Card>

          {/* 2. User Accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                2. User Accounts & Registration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Account Creation:</strong> You must provide accurate and complete information when creating your account.</p>
                <p><strong>Eligibility:</strong> You must be at least 18 years old or have parental consent to use our services.</p>
                <p><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your login credentials.</p>
                <p><strong>Verification:</strong> We may require identity verification for certain features, especially for expert applications.</p>
                <p><strong>One Account:</strong> Each user is limited to one active account per person.</p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Platform Services */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                3. Platform Services
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Freelance Marketplace:</strong> Connect freelancers with clients for professional services.</p>
                <p><strong>Expert Verification:</strong> Verified expert status for qualified professionals.</p>
                <p><strong>Payment Processing:</strong> Secure payment handling through integrated payment systems.</p>
                <p><strong>Communication Tools:</strong> Chat and messaging features for user interaction.</p>
                <p><strong>Social Features:</strong> Professional networking, posts, and community interaction.</p>
              </div>
            </CardContent>
          </Card>

          {/* 4. User Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                4. User Responsibilities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Professional Conduct:</strong> Maintain professional and respectful behavior in all interactions.</p>
                <p><strong>Accurate Information:</strong> Provide truthful information in your profile, skills, and work history.</p>
                <p><strong>Quality Work:</strong> Deliver work as promised and maintain professional standards.</p>
                <p><strong>Payment Obligations:</strong> Honor all payment agreements and platform fees.</p>
                <p><strong>Intellectual Property:</strong> Respect copyright and intellectual property rights of others.</p>
                <p><strong>No Spam:</strong> Do not send unsolicited messages or engage in spamming activities.</p>
              </div>
            </CardContent>
          </Card>

          {/* 5. Prohibited Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                5. Prohibited Activities
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Fraudulent Activities:</strong> Creating fake profiles, misrepresenting skills or experience.</p>
                <p><strong>Harassment:</strong> Bullying, harassment, or discriminatory behavior towards other users.</p>
                <p><strong>Illegal Content:</strong> Posting or sharing illegal, harmful, or inappropriate content.</p>
                <p><strong>System Abuse:</strong> Attempting to hack, spam, or abuse platform features.</p>
                <p><strong>Off-Platform Payments:</strong> Circumventing our payment system to avoid fees.</p>
                <p><strong>Multiple Accounts:</strong> Creating multiple accounts to manipulate the system.</p>
              </div>
            </CardContent>
          </Card>

          {/* 6. Payment Terms */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                6. Payment Terms
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Platform Fees:</strong> We charge a service fee on transactions processed through our platform.</p>
                <p><strong>Payment Processing:</strong> Payments are processed through secure third-party providers.</p>
                <p><strong>Escrow System:</strong> Funds are held in escrow until work is completed and approved.</p>
                <p><strong>Refunds:</strong> Refund policies apply based on project completion and dispute resolution.</p>
                <p><strong>Taxes:</strong> Users are responsible for their own tax obligations.</p>
                <p><strong>Currency:</strong> All payments are processed in Nigerian Naira (₦) unless otherwise specified.</p>
              </div>
            </CardContent>
          </Card>

          {/* 7. Privacy & Data */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                7. Privacy & Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Data Collection:</strong> We collect information necessary to provide our services effectively.</p>
                <p><strong>Data Usage:</strong> Your data is used to improve services, facilitate connections, and ensure security.</p>
                <p><strong>Data Sharing:</strong> We do not sell personal data to third parties without consent.</p>
                <p><strong>Security:</strong> We implement industry-standard security measures to protect your information.</p>
                <p><strong>Rights:</strong> You have the right to access, modify, or delete your personal information.</p>
                <p><strong>Cookies:</strong> We use cookies to enhance user experience and analyze platform usage.</p>
              </div>
            </CardContent>
          </Card>

          {/* 8. Intellectual Property */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                8. Intellectual Property Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Platform Content:</strong> NaijaLancers owns all rights to the platform design, features, and branding.</p>
                <p><strong>User Content:</strong> You retain ownership of content you create but grant us license to use it on the platform.</p>
                <p><strong>Work Products:</strong> Rights to completed work are determined by agreements between freelancers and clients.</p>
                <p><strong>Trademark:</strong> NaijaLancers and related logos are trademarks of our company.</p>
                <p><strong>Copyright:</strong> Respect copyright laws and do not upload copyrighted material without permission.</p>
              </div>
            </CardContent>
          </Card>

          {/* 9. Termination */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                9. Account Termination
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>User Termination:</strong> You may close your account at any time through account settings.</p>
                <p><strong>Platform Termination:</strong> We may suspend or terminate accounts for violations of these Terms.</p>
                <p><strong>Data Retention:</strong> Some data may be retained for legal and business purposes after termination.</p>
                <p><strong>Outstanding Obligations:</strong> Termination does not affect outstanding payment or work obligations.</p>
                <p><strong>Appeal Process:</strong> Users may appeal termination decisions through our support system.</p>
              </div>
            </CardContent>
          </Card>

          {/* 10. Limitation of Liability */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                10. Limitation of Liability
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Platform Role:</strong> NaijaLancers acts as a facilitator between users and is not party to contracts between them.</p>
                <p><strong>Service Availability:</strong> We strive for 99% uptime but cannot guarantee uninterrupted service.</p>
                <p><strong>User Disputes:</strong> We provide dispute resolution tools but are not liable for user conflicts.</p>
                <p><strong>Third-party Services:</strong> We are not responsible for third-party payment processors or services.</p>
                <p><strong>Maximum Liability:</strong> Our liability is limited to the fees paid to us in the preceding 12 months.</p>
              </div>
            </CardContent>
          </Card>

          {/* 11. Governing Law */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                11. Governing Law & Disputes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Jurisdiction:</strong> These Terms are governed by the laws of the Federal Republic of Nigeria.</p>
                <p><strong>Dispute Resolution:</strong> Disputes will be resolved through mediation or arbitration where possible.</p>
                <p><strong>Legal Venue:</strong> Any legal proceedings will be conducted in Nigerian courts.</p>
                <p><strong>Severability:</strong> If any provision is unenforceable, other provisions remain in effect.</p>
              </div>
            </CardContent>
          </Card>

          {/* 12. Contact Information */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Phone className="h-5 w-5" />
                12. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-text-secondary space-y-2">
                <p><strong>Company:</strong> NaijaLancers Limited</p>
                <p><strong>Address:</strong> Lagos, Nigeria</p>
                <p><strong>Email:</strong> support@naijalancers.com</p>
                <p><strong>WhatsApp:</strong> +234 816 714 0857</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-border">
                <Button
                  onClick={handleContactPhone}
                  className="flex-1 flex items-center gap-2"
                >
                  <Phone className="h-4 w-4" />
                  Contact via WhatsApp
                </Button>
                <Button
                  onClick={handleContactEmail}
                  className="flex-1 flex items-center gap-2"
                  variant="outline"
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Changes Notice */}
          <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                    Changes to Terms & Conditions
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    We may update these Terms from time to time. Users will be notified of significant changes 
                    via email or platform notifications. Continued use of the platform after changes constitutes 
                    acceptance of the updated Terms.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-text-secondary text-sm">
            By using NaijaLancers, you acknowledge that you have read and understood these Terms & Conditions.
          </p>
          <p className="text-text-secondary text-xs mt-2">
            © 2025 NaijaLancers Limited. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}

export default TermsConditions