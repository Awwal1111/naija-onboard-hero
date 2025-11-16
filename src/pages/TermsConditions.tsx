import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Shield, AlertTriangle, Scale, FileText, ArrowLeft, Phone, Mail } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { Logo } from "@/components/ui/logo"

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
            <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            <span className="text-muted-foreground">Back</span>
          </button>
          <Logo />
          <div className="w-16" />
        </div>
      </header>

      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Terms & Conditions</h1>
          <p className="text-muted-foreground">Last Updated: January 2025</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Shield className="h-5 w-5 text-primary" />
            <span className="text-sm font-medium">CAC Registered: BN8870047</span>
          </div>
        </div>

        {/* Contact Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Legal Agreement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                
                {/* Section 1 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                  <p className="text-muted-foreground">
                    NaijaLancers is Nigeria&apos;s digital freelance marketplace and professional services platform. 
                    These Terms and Conditions (&quot;Terms&quot;) govern your use of our website, mobile app, and all services we provide.
                  </p>
                  <p className="text-muted-foreground mt-2">
                    By accessing or using NaijaLancers, you agree to be bound by these Terms. If you do not agree, please do not use our services.
                  </p>
                </section>

                <Separator />

                {/* Section 2 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">2. User Accounts & Registration</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>You must provide accurate and complete information during registration.</li>
                    <li>You must be at least 18 years old or have parental consent.</li>
                    <li>You are responsible for safeguarding your login details.</li>
                    <li>Some features require identity verification (KYC).</li>
                    <li>You may only maintain one active account.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 3 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">3. Platform Services</h2>
                  <p className="text-muted-foreground mb-2">NaijaLancers provides:</p>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Freelance job marketplace</li>
                    <li>Verified expert system</li>
                    <li>Secure payment processing</li>
                    <li>Digital wallet and token-based earnings</li>
                    <li>Chat and communication tools</li>
                    <li>Social and networking features</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 4 - CRITICAL */}
                <section className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">4. Wallet, Tokens & Financial Services</h2>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">4.1 Internal Wallet</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Each user has an internal wallet for storing NaijaCoin (NC) and other balances.</li>
                        <li>The wallet is not a bank account and is used only within NaijaLancers.</li>
                        <li>Wallet balances do not earn interest.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">4.2 NC Token (NaijaCoin)</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li><strong>NC is a utility token used inside the NaijaLancers platform only.</strong></li>
                        <li>NC is not a cryptocurrency, is not publicly tradable, and has no external market value.</li>
                        <li>NC cannot be used for investment or speculation.</li>
                        <li>NC value is fixed and controlled by the platform.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">4.3 Deposits & Withdrawals</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Minimum deposit: 3,000 NC (₦3,000)</li>
                        <li>Minimum withdrawal: $2 USD (3,000 NC)</li>
                        <li>Deposits and withdrawals are processed through third-party payment partners (e.g., Quidax, banks, Celo).</li>
                        <li>Processing time may vary depending on network or financial partners.</li>
                        <li>Users must ensure their bank details are correct before requesting withdrawals.</li>
                        <li>NaijaLancers is not responsible for failed transfers caused by incorrect user information.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">4.4 Internal Transfers</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Transfers between users are final and cannot be reversed once completed.</li>
                        <li>Fraudulent transfers will result in account suspension or termination.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">4.5 Funds Sweep</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Deposited funds may be automatically swept into a master wallet to maintain liquidity.</li>
                        <li>Users receive NC tokens equivalent to their deposit value.</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Section 5 */}
                <section className="border-l-4 border-primary pl-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Scale className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-semibold">5. KYC, AML & Compliance</h2>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">5.1 Identity Verification (KYC)</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Users may be required to verify identity before using certain financial features.</li>
                        <li>NaijaLancers may request government ID, BVN, or other verification information.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">5.2 Anti-Money Laundering (AML)</h3>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>NaijaLancers complies with Nigerian AML/CFT regulations.</li>
                        <li>Suspicious or flagged accounts may be frozen or restricted.</li>
                        <li>We reserve the right to report illegal or fraudulent activity to authorities.</li>
                      </ul>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">5.3 Prohibited Use</h3>
                      <p className="text-muted-foreground mb-2">You may not use NaijaLancers for:</p>
                      <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                        <li>Money laundering</li>
                        <li>Fraud</li>
                        <li>Terrorism financing</li>
                        <li>Illegal financial activity</li>
                        <li>Identity theft</li>
                        <li>Payment manipulation</li>
                      </ul>
                    </div>
                  </div>
                </section>

                <Separator />

                {/* Section 6 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">6. User Responsibilities</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Behave professionally and respectfully.</li>
                    <li>Provide accurate information.</li>
                    <li>Deliver quality work when hired.</li>
                    <li>Pay agreed fees promptly.</li>
                    <li>Do not spam, abuse, or harass other users.</li>
                    <li>Do not attempt to bypass platform payments.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 7 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">7. Prohibited Activities</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Fake accounts or false information</li>
                    <li>Misrepresentation of skills</li>
                    <li>Harassment or discrimination</li>
                    <li>Posting illegal content</li>
                    <li>Hacking or attempting to interfere with platform systems</li>
                    <li>Using multiple accounts to exploit the platform</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 8 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">8. Payment Terms</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Platform fees apply to certain transactions.</li>
                    <li>Payments are processed through trusted third-party providers.</li>
                    <li>Escrow is used for safe transactions between clients and freelancers.</li>
                    <li>Refunds depend on project stage and dispute resolution rules.</li>
                    <li>Users are responsible for paying any applicable taxes.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 9 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">9. Data & Privacy</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>We collect necessary data to provide services.</li>
                    <li>Your data is never sold to third parties without consent.</li>
                    <li>We use industry-standard security practices.</li>
                    <li>Users may request access or deletion of their data.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 10 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">10. Intellectual Property</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>NaijaLancers owns all platform branding, design, and code.</li>
                    <li>Users own the content they create but grant NaijaLancers license to display it.</li>
                    <li>Work ownership between freelancers and clients follows the project agreement.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 11 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">11. Account Suspension & Termination</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>Users may close their accounts anytime.</li>
                    <li>NaijaLancers may suspend accounts violating these Terms.</li>
                    <li>Some data may be retained for legal purposes even after termination.</li>
                    <li>You may appeal suspensions through customer support.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 12 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">12. Limitation of Liability</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>NaijaLancers is not responsible for disputes between freelancers and clients.</li>
                    <li>We are not liable for delays caused by third-party payment processors.</li>
                    <li>Maximum liability is limited to the total fees paid to NaijaLancers in the last 12 months.</li>
                    <li>We cannot guarantee uninterrupted access or zero technical issues.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 13 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">13. Governing Law</h2>
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li>These Terms are governed by the laws of the Federal Republic of Nigeria.</li>
                    <li>Disputes will be resolved through mediation, arbitration, or Nigerian courts.</li>
                  </ul>
                </section>

                <Separator />

                {/* Section 14 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">14. Contact Information</h2>
                  <div className="space-y-1 text-muted-foreground">
                    <p><strong>Company:</strong> NaijaLancers Limited</p>
                    <p><strong>CAC Registration:</strong> BN8870047</p>
                    <p><strong>Email:</strong> support@naijalancers.com</p>
                    <p><strong>WhatsApp:</strong> +234 816 714 0857</p>
                  </div>
                </section>

                <Separator />

                {/* Section 15 */}
                <section>
                  <h2 className="text-xl font-semibold mb-3">15. Updates to Terms</h2>
                  <p className="text-muted-foreground">
                    We may update these Terms occasionally. Continued use of the platform means you accept the updated version.
                  </p>
                </section>

                {/* Legal Protection Summary */}
                <div className="mt-8 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <h3 className="font-semibold mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Legal Protections Included
                  </h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>✔ Wallet disclaimer & limitations</li>
                    <li>✔ NC Token utility-only status (not cryptocurrency)</li>
                    <li>✔ AML/KYC compliance requirements</li>
                    <li>✔ Third-party processor liability protection</li>
                    <li>✔ Deposit/withdrawal limits and rules</li>
                    <li>✔ Funds sweep explanation</li>
                    <li>✔ Transfer reversal protection</li>
                    <li>✔ Regulatory compliance framework</li>
                  </ul>
                </div>

              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TermsConditions
