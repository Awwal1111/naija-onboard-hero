import { Link } from 'react-router-dom'
import { UnifiedSearchBar } from '@/components/UnifiedSearchBar'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Facebook, Youtube, Linkedin, MessageSquare, Phone, Users, Shield, ArrowRight, Briefcase, DollarSign, Clock, Award, Wallet, CreditCard, UserCheck, CheckCircle2, Building2, Network, Download } from 'lucide-react'
import heroImage from '@/assets/hero-image.jpg'

import { LeaderboardSection } from '@/components/LeaderboardSection'

const Index = () => {
  const handleSocialLink = (url: string) => {
    window.open(url, '_blank')
  }

  const handleWhatsApp = () => {
    const phoneNumber = "08167140857"
    const whatsappUrl = `https://wa.me/234${phoneNumber.slice(1)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar - Mobile Optimized */}
      <nav className="flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4 sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-50 shadow-sm">
        <Logo />
        <div className="flex items-center gap-2 sm:gap-4">
          <BrandButton variant="ghost" asChild className="text-sm sm:text-base px-2 sm:px-4">
            <Link to="/login">Log In</Link>
          </BrandButton>
          <BrandButton asChild className="text-sm sm:text-base px-3 sm:px-4">
            <Link to="/signup">Get Started</Link>
          </BrandButton>
        </div>
      </nav>

      {/* Hero Section - Mobile First */}
      <section className="relative overflow-hidden py-10 sm:py-16 lg:py-20 bg-gradient-to-br from-primary/10 via-background to-accent/5">
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
              <div className="space-y-5 sm:space-y-8">
                <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm">
                  <Award className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  CAC Registered • BN8870047
                </Badge>
                
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight">
                  <span className="text-foreground">Nigeria's Trusted</span>
                  <span className="block text-primary mt-1 sm:mt-2">Freelance Marketplace</span>
                </h1>
                
                <p className="text-base sm:text-lg lg:text-xl text-muted-foreground leading-relaxed">
                  Connect with vetted professionals, secure payments through our banking partners, and grow your business with confidence.
                </p>

                <div className="flex flex-wrap gap-3 sm:gap-6 pt-2 sm:pt-4">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="text-xs sm:text-sm font-medium">Legally Registered</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="text-xs sm:text-sm font-medium">Secure Payments</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                    <span className="text-xs sm:text-sm font-medium">10,000+ Users</span>
                  </div>
                </div>

                <div className="max-w-2xl mb-4 sm:mb-6">
                  <UnifiedSearchBar />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-2 sm:pt-4">
                  <BrandButton asChild size="lg" className="text-sm sm:text-lg px-4 sm:px-8 py-4 sm:py-6 w-full sm:w-auto">
                    <Link to="/signup">
                      Start Earning Today
                      <ArrowRight className="ml-2 w-4 h-4 sm:w-5 sm:h-5" />
                    </Link>
                  </BrandButton>
                  <BrandButton variant="outline" asChild size="lg" className="text-sm sm:text-lg px-4 sm:px-8 py-4 sm:py-6 w-full sm:w-auto">
                    <Link to="/login">Sign In</Link>
                  </BrandButton>
                  <BrandButton 
                    variant="secondary" 
                    size="lg" 
                    className="text-sm sm:text-lg px-4 sm:px-8 py-4 sm:py-6 w-full sm:w-auto"
                    onClick={() => window.open('https://apkpure.com/naijalancers/co.median.android.mbbeeqr', '_blank')}
                  >
                    <Download className="mr-2 w-4 h-4 sm:w-5 sm:h-5" />
                    Download App
                  </BrandButton>
                </div>
              </div>

              <div className="relative hidden sm:block">
                <div className="aspect-square rounded-2xl overflow-hidden shadow-2xl border border-border">
                  <img src={heroImage} alt="NaijaLancers Platform" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-primary text-primary-foreground p-4 sm:p-6 rounded-xl shadow-xl">
                  <div className="text-2xl sm:text-3xl font-bold">10K+</div>
                  <div className="text-xs sm:text-sm">Active Users</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Verification Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Verified & Trusted Platform</h2>
              <p className="text-lg text-muted-foreground">Officially registered and verified for your security</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Award className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>CAC Registered</CardTitle>
                  <CardDescription>Business Number: BN8870047</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Officially registered with the Corporate Affairs Commission of Nigeria
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>Secure Banking</CardTitle>
                  <CardDescription>Powered by Quidax</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    All transactions processed through regulated financial partners
                  </p>
                </CardContent>
              </Card>

              <Card className="text-center">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <UserCheck className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle>Verified Community</CardTitle>
                  <CardDescription>10,000+ Active Members</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Join thousands of verified Nigerian professionals
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Partners</h2>
              <p className="text-lg text-muted-foreground">Working with trusted organizations</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <CreditCard className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-center">Quidax</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-center text-muted-foreground">
                    Leading Nigerian cryptocurrency exchange providing secure payment infrastructure
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Network className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-center">Celo Network</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-center text-muted-foreground">
                    Mobile-first blockchain platform enabling fast and secure digital payments
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Building2 className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-center">CAC Nigeria</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-center text-muted-foreground">
                    Registered with Corporate Affairs Commission (BN8870047)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose NaijaLancers?</h2>
              <p className="text-lg text-muted-foreground">Everything you need to succeed</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card>
                <CardHeader>
                  <Wallet className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Instant Deposits</CardTitle>
                  <CardDescription>Min: 3,000 NC (₦3,000)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Fund your account instantly through our secure banking partner
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <DollarSign className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Fast Withdrawals</CardTitle>
                  <CardDescription>Min: $2 USD (3,000 NC)</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Withdraw your earnings quickly to your bank account
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Shield className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>SafePay Protection</CardTitle>
                  <CardDescription>Secure Escrow System</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Your payments are protected until work is completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Briefcase className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Find Jobs</CardTitle>
                  <CardDescription>Thousands of Opportunities</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Connect with clients looking for your skills
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Clock className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Earn Daily</CardTitle>
                  <CardDescription>Multiple Income Streams</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Complete tasks, surveys, and games for rewards
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Users className="w-12 h-12 text-primary mb-4" />
                  <CardTitle>Verified Experts</CardTitle>
                  <CardDescription>Quality Professionals</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Work with pre-screened verified experts
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof moved to dedicated page */}

      {/* Leaderboard Section */}
      <section className="py-16">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <LeaderboardSection />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of Nigerians earning on NaijaLancers
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <BrandButton asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
              <Link to="/signup">
                Create Free Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </BrandButton>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-4 gap-8 mb-8">
              <div>
                <Logo />
                <p className="text-sm text-muted-foreground mt-4">
                  Nigeria's trusted marketplace. CAC: BN8870047
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Platform</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/jobs" className="hover:text-primary">Find Jobs</Link></li>
                  <li><Link to="/experts" className="hover:text-primary">Hire Experts</Link></li>
                  <li><Link to="/earn" className="hover:text-primary">Earn Money</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/terms-conditions" className="hover:text-primary">Terms & Conditions</Link></li>
                  <li><Link to="/privacy-policy" className="hover:text-primary">Privacy Policy</Link></li>
                  <li><Link to="/faq" className="hover:text-primary">FAQ</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Contact</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    08167140857
                  </li>
                </ul>
                <div className="flex gap-3 mt-4">
                  <button onClick={() => handleSocialLink('https://facebook.com/naijalancers')} className="hover:text-primary">
                    <Facebook className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleSocialLink('https://youtube.com/@naijalancers')} className="hover:text-primary">
                    <Youtube className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleSocialLink('https://linkedin.com/company/naijalancers')} className="hover:text-primary">
                    <Linkedin className="w-5 h-5" />
                  </button>
                  <button onClick={handleWhatsApp} className="hover:text-primary">
                    <MessageSquare className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            <Separator className="mb-8" />

            <div className="text-center text-sm text-muted-foreground">
              <p>© 2024 NaijaLancers. CAC: BN8870047 | Secure payments by Quidax & Celo</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Index
