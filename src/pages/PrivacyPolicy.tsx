import React from 'react'
import { ArrowLeft, Shield, Eye, Database, Lock, UserCheck, Mail, Phone } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const PrivacyPolicy = () => {
  const navigate = useNavigate()

  const handleContactPhone = () => {
    const phoneNumber = "08167140857"
    const whatsappUrl = `https://wa.me/234${phoneNumber.slice(1)}`
    window.open(whatsappUrl, '_blank')
  }

  const handleContactEmail = () => {
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=support@naijalancers.name.ng&su=Privacy%20Policy%20Inquiry&body=Hello%20NaijaLancers%20Team,%0D%0A%0D%0A`
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
          <h1 className="text-3xl font-bold text-text-primary mb-2">Privacy Policy</h1>
          <p className="text-text-secondary">How we protect and handle your data</p>
          <Badge variant="secondary" className="mt-2">
            Last Updated: January 2025
          </Badge>
        </div>

        {/* Contact Information Card */}
        <Card className="mb-6 border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Phone className="h-5 w-5" />
              Questions about Privacy?
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

        {/* Privacy Content */}
        <div className="space-y-6">
          {/* 1. Information We Collect */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                1. Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Account Information:</strong> Name, email address, phone number, and profile details you provide during registration.</p>
                <p><strong>Profile Data:</strong> Skills, work experience, portfolio items, and professional information you choose to share.</p>
                <p><strong>Communication Data:</strong> Messages, chat history, and interactions with other users on the platform.</p>
                <p><strong>Payment Information:</strong> Billing details and transaction history (processed securely through third-party providers).</p>
                <p><strong>Usage Data:</strong> How you interact with our platform, including pages visited and features used.</p>
                <p><strong>Device Information:</strong> IP address, browser type, device type, and operating system for security and optimization.</p>
              </div>
            </CardContent>
          </Card>

          {/* 2. How We Use Your Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                2. How We Use Your Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Service Provision:</strong> To provide, maintain, and improve our freelancing platform services.</p>
                <p><strong>User Matching:</strong> To connect freelancers with relevant clients and opportunities.</p>
                <p><strong>Communication:</strong> To facilitate communication between users and send important updates.</p>
                <p><strong>Payment Processing:</strong> To handle secure payments and transactions between users.</p>
                <p><strong>Security:</strong> To protect against fraud, abuse, and maintain platform security.</p>
                <p><strong>Analytics:</strong> To understand usage patterns and improve our services.</p>
              </div>
            </CardContent>
          </Card>

          {/* 3. Information Sharing */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                3. Information Sharing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>With Other Users:</strong> Your profile information is visible to other users to facilitate connections.</p>
                <p><strong>Service Providers:</strong> We may share data with trusted third-party services (payment processors, hosting providers).</p>
                <p><strong>Legal Requirements:</strong> When required by law, court order, or to protect our rights and safety.</p>
                <p><strong>Business Transfers:</strong> In case of merger, acquisition, or sale of assets, with proper notice.</p>
                <p><strong>With Your Consent:</strong> We may share information for other purposes with your explicit consent.</p>
                <p><strong>No Sale of Data:</strong> We do not sell your personal information to third parties for marketing purposes.</p>
              </div>
            </CardContent>
          </Card>

          {/* 4. Data Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                4. Data Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Encryption:</strong> All data transmission is encrypted using industry-standard SSL/TLS protocols.</p>
                <p><strong>Secure Storage:</strong> Data is stored on secure servers with restricted access and regular backups.</p>
                <p><strong>Access Controls:</strong> Only authorized personnel have access to personal data on a need-to-know basis.</p>
                <p><strong>Regular Audits:</strong> We conduct regular security audits and vulnerability assessments.</p>
                <p><strong>Incident Response:</strong> We have procedures in place to respond to and notify users of any data breaches.</p>
                <p><strong>Password Security:</strong> User passwords are hashed and salted using secure algorithms.</p>
              </div>
            </CardContent>
          </Card>

          {/* 5. Your Rights */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                5. Your Privacy Rights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Access:</strong> You can request access to your personal data and download your information.</p>
                <p><strong>Correction:</strong> You can update and correct your personal information through your account settings.</p>
                <p><strong>Deletion:</strong> You can request deletion of your account and associated data (subject to legal requirements).</p>
                <p><strong>Portability:</strong> You can request a copy of your data in a machine-readable format.</p>
                <p><strong>Restrict Processing:</strong> You can request that we limit how we process your data in certain circumstances.</p>
                <p><strong>Opt-out:</strong> You can opt-out of marketing communications and certain data processing activities.</p>
              </div>
            </CardContent>
          </Card>

          {/* 6. Cookies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                6. Cookies and Tracking
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Essential Cookies:</strong> Required for basic platform functionality and security.</p>
                <p><strong>Analytics Cookies:</strong> Help us understand how users interact with our platform.</p>
                <p><strong>Preference Cookies:</strong> Remember your settings and preferences for a better experience.</p>
                <p><strong>Marketing Cookies:</strong> Used to show relevant advertisements and measure campaign effectiveness.</p>
                <p><strong>Cookie Control:</strong> You can manage cookie preferences through your browser settings.</p>
                <p><strong>Third-party Cookies:</strong> Some features may use cookies from trusted third-party services.</p>
              </div>
            </CardContent>
          </Card>

          {/* 7. Data Retention */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                7. Data Retention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Active Accounts:</strong> We retain your data while your account is active and as needed to provide services.</p>
                <p><strong>Inactive Accounts:</strong> Data from inactive accounts may be retained for up to 2 years.</p>
                <p><strong>Legal Obligations:</strong> Some data may be retained longer to comply with legal requirements.</p>
                <p><strong>Backup Systems:</strong> Data in backup systems may persist for up to 90 days after deletion.</p>
                <p><strong>Transaction Records:</strong> Financial transaction data is retained for 7 years for tax and legal purposes.</p>
                <p><strong>Communication Records:</strong> Platform messages may be retained for dispute resolution purposes.</p>
              </div>
            </CardContent>
          </Card>

          {/* 8. International Transfers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                8. International Data Transfers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Data Location:</strong> Your data is primarily stored and processed in Nigeria and other African data centers.</p>
                <p><strong>Third-party Services:</strong> Some trusted partners may process data in other countries with adequate protection.</p>
                <p><strong>Safeguards:</strong> We ensure appropriate safeguards are in place for any international data transfers.</p>
                <p><strong>Compliance:</strong> All transfers comply with applicable data protection laws and regulations.</p>
              </div>
            </CardContent>
          </Card>

          {/* 9. Children's Privacy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                9. Children's Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-text-secondary space-y-2">
                <p><strong>Age Requirement:</strong> Our services are intended for users 18 years and older.</p>
                <p><strong>No Collection:</strong> We do not knowingly collect personal information from children under 18.</p>
                <p><strong>Parental Consent:</strong> Users under 18 must have parental consent to use our services.</p>
                <p><strong>Removal:</strong> If we discover we have collected data from a child under 18, we will delete it promptly.</p>
              </div>
            </CardContent>
          </Card>

          {/* 10. Contact Information */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Phone className="h-5 w-5" />
                10. Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-text-secondary space-y-2">
                <p><strong>Company:</strong> NaijaLancers</p>
                <p><strong>Address:</strong> Unguwan Nasarawa, Kontagora, Niger State, Nigeria</p>
                <p><strong>Email:</strong> Support@Naijalancers.name.ng</p>
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
        </div>

        {/* Footer */}
        <div className="text-center mt-12 pt-8 border-t border-border">
          <p className="text-text-secondary text-sm">
            By using NaijaLancers, you acknowledge that you have read and understood this Privacy Policy.
          </p>
          <p className="text-text-secondary text-xs mt-2">
            This Privacy Policy may be updated periodically. Continued use constitutes acceptance of changes.
          </p>
        </div>
      </div>
    </div>
  )
}

export default PrivacyPolicy