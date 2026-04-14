import { Link, Navigate } from 'react-router-dom'
import { EnhancedSearchBar } from '@/components/EnhancedSearchBar'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Facebook, Youtube, Linkedin, MessageSquare, Phone, Users, Shield, ArrowRight, Briefcase, DollarSign, Clock, Award, Wallet, UserCheck, CheckCircle2, Building2, Download, Play, Code2 } from 'lucide-react'
import heroImage from '@/assets/hero-image.jpg'
import explainerVideo from '@/assets/naijalancers-explainer.mp4'

import { LeaderboardSection } from '@/components/LeaderboardSection'
import { SuccessStoriesSection } from '@/components/SuccessStoriesSection'
import { SocialProofSection } from '@/components/SocialProofSection'
import { FeaturedContestsSection } from '@/components/FeaturedContestsSection'
import { FeaturedGigsSection } from '@/components/FeaturedGigsSection'
import { WhatsAppShareCTA } from '@/components/WhatsAppShareCTA'
import { StickyMobileCTA } from '@/components/StickyMobileCTA'
import { detectMiniPaySync } from '@/lib/minipay'

// SYNC detection at module load - NO context hooks
const isMiniPayEnv = detectMiniPaySync().isMiniPay

const Index = () => {
  // MiniPay users go directly to feed - NO login screens
  if (isMiniPayEnv) {
    return <Navigate to="/feed" replace />
  }

  const handleSocialLink = (url: string) => {
    window.open(url, '_blank')
  }

  const handleWhatsApp = () => {
    const phoneNumber = "08167140857"
    const whatsappUrl = `https://wa.me/234${phoneNumber.slice(1)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="min-h-screen bg-background pb-16 md:pb-0">
      {/* Sticky Navigation + Search Bar */}
      <nav className="sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-50 shadow-sm">
        <div className="flex items-center justify-between px-3 py-3 sm:px-6 sm:py-4">
          <Logo />
          <div className="flex items-center gap-2 sm:gap-4">
            <BrandButton variant="ghost" asChild className="hidden sm:inline-flex text-sm px-3">
              <Link to="/developers" className="flex items-center gap-1.5">
                <Code2 className="w-4 h-4" />
                Developers
              </Link>
            </BrandButton>
            <BrandButton variant="ghost" asChild className="text-sm sm:text-base px-2 sm:px-4">
              <Link to="/login">Log In</Link>
            </BrandButton>
            <BrandButton asChild className="text-sm sm:text-base px-3 sm:px-4">
              <Link to="/signup">Get Started</Link>
            </BrandButton>
          </div>
        </div>
        
        {/* Floating Search + Quick Actions */}
        <div className="px-3 pb-3 sm:px-6 sm:pb-4">
          <div className="max-w-4xl mx-auto">
            <EnhancedSearchBar />
          </div>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            <Link to="/p/gigs" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-muted hover:bg-accent transition-colors">
              <Briefcase className="w-3.5 h-3.5" />
              Browse Gigs
            </Link>
            <Link to="/p/experts" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-muted hover:bg-accent transition-colors">
              <Users className="w-3.5 h-3.5" />
              Find Experts
            </Link>
            <Link to="/p/jobs" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-muted hover:bg-accent transition-colors">
              <DollarSign className="w-3.5 h-3.5" />
              View Jobs
            </Link>
            <Link to="/learn" className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
              <Award className="w-3.5 h-3.5" />
              Free Courses
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-12 sm:py-20 lg:py-28 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent opacity-60" />
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
              <div className="space-y-6 sm:space-y-8">
                <Badge variant="secondary" className="w-fit bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-4 py-1.5 font-medium">
                  <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
                  Trusted Worldwide • Secure Payments
                </Badge>
                
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight">
                  <span className="text-foreground">Hire or Get Hired</span>
                  <span className="block bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mt-2">
                    With Confidence
                  </span>
                </h1>
                
                <p className="text-lg sm:text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl">
                  Post a job in 2 minutes. Get matched with verified experts. Pay only when satisfied.
                </p>

                <div className="flex flex-wrap gap-4 sm:gap-8 pt-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm sm:text-base font-medium">Verified Experts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm sm:text-base font-medium">SafePay Escrow</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm sm:text-base font-medium">Fast Payouts</span>
                  </div>
                </div>

                {/* Dual CTA */}
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 pt-4">
                  <BrandButton asChild size="lg" className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-7 w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                    <Link to="/signup?intent=hire">
                      <Briefcase className="mr-2 w-5 h-5" />
                      Hire Talent
                    </Link>
                  </BrandButton>
                  <BrandButton variant="outline" asChild size="lg" className="text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-7 w-full sm:w-auto border-2">
                    <Link to="/signup?intent=earn">
                      <DollarSign className="mr-2 w-5 h-5" />
                      Start Earning
                    </Link>
                  </BrandButton>
                </div>

                {/* App Store Badges */}
                <div className="flex items-center gap-2 pt-2 flex-wrap">
                  <a
                    href="https://play.google.com/store/apps/details?id=co.median.android.mbbeeqr"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <img
                      src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
                      alt="Get it on Google Play"
                      className="h-14 sm:h-16"
                      loading="lazy"
                    />
                  </a>
                  <a
                    href="https://m.apkpure.com/naijalancers-freelance-app/co.median.android.mbbeeqr"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-foreground text-background rounded-lg px-4 py-2.5 flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                    <div className="text-left leading-tight">
                      <div className="text-[10px] opacity-80">Download on</div>
                      <div className="text-sm font-semibold">APKPure</div>
                    </div>
                  </a>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="relative">
                  <div className="absolute -top-8 -left-8 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
                  <div className="absolute -bottom-8 -right-8 w-72 h-72 bg-accent/10 rounded-full blur-3xl" />
                  
                  <div className="relative aspect-square rounded-3xl overflow-hidden shadow-2xl border border-border/50">
                    <img src={heroImage} alt="NaijaLancers - Trusted Freelance Marketplace" className="w-full h-full object-cover" loading="eager" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  </div>
                  
                  {/* Floating stats card */}
                  <div className="absolute -bottom-6 -right-6 bg-card/95 backdrop-blur-sm p-6 rounded-2xl shadow-2xl border border-border">
                    <div className="text-3xl sm:text-4xl font-bold text-primary">SafePay</div>
                    <div className="text-sm text-muted-foreground">Escrow Protection</div>
                  </div>
                  
                  <div className="absolute -top-4 -right-4 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    <span className="text-sm font-medium">Verified</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Testimonials - right after hero for trust */}
      <SocialProofSection />

      {/* Video Explainer Section */}
      <section className="py-16 sm:py-24 bg-muted/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-5xl mx-auto text-center">
            <Badge variant="secondary" className="mb-4">
              <Play className="w-3 h-3 mr-1" />
              Platform Overview
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">See How It Works</h2>
            <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
              Watch our quick explainer to understand how NaijaLancers connects talent with opportunity
            </p>
            
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/50 group">
              <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10" />
              <video 
                src={explainerVideo}
                controls
                className="w-full aspect-video"
                poster={heroImage}
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            
            {/* How it works steps */}
            <div className="grid sm:grid-cols-4 gap-6 mt-12">
              {[
                { step: "1", title: "Sign Up Free", desc: "Create your account in under 2 minutes" },
                { step: "2", title: "Post or Apply", desc: "Post a job or browse available gigs" },
                { step: "3", title: "Work Securely", desc: "SafePay escrow protects every payment" },
                { step: "4", title: "Get Paid", desc: "Withdraw earnings to your bank instantly" },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured Gigs Section */}
      <FeaturedGigsSection />

      {/* Featured Contests Section */}
      <FeaturedContestsSection />

      {/* Combined Value Props - For Both Clients and Freelancers */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Succeed</h2>
              <p className="text-lg text-muted-foreground">Whether you're hiring or freelancing</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="hover:shadow-lg transition-shadow border-primary/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">AI-Powered Matching</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Our AI matches you with the perfect talent or job based on skills, budget, and past performance.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">SafePay Escrow</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Funds are held securely and released only when you approve. Zero risk for both sides.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <UserCheck className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Verified Professionals</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Every expert is vetted with verified skills, portfolio reviews, and real client ratings.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <Wallet className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Multiple Payment Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Bank transfers, crypto via Celo/MiniPay, and in-platform wallet. Get paid your way.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Free Courses & Certifications</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Level up with free courses, earn certificates, and unlock higher-paying opportunities.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow border-primary/10">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Daily Earning Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Earn rewards through daily sign-ins, surveys, referrals, and social media tasks.
                  </p>
                </CardContent>
              </Card>
            </div>
            
            <div className="text-center mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <BrandButton asChild size="lg">
                <Link to="/ai-hire">
                  <Users className="mr-2 w-5 h-5" />
                  Find Talent with AI
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </BrandButton>
              <BrandButton asChild size="lg" variant="outline">
                <Link to="/p/gigs">
                  <Briefcase className="mr-2 w-5 h-5" />
                  Browse Services
                </Link>
              </BrandButton>
            </div>
          </div>
        </div>
      </section>

      {/* Success Stories with Real Data */}
      <SuccessStoriesSection />

      {/* WhatsApp Share CTA */}
      <WhatsAppShareCTA />

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
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Stop Waiting. Start Earning Today.</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of professionals already growing their careers on NaijaLancers. It's free to sign up.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <BrandButton asChild size="lg" variant="secondary" className="text-lg px-8 py-6">
              <Link to="/signup">
                Create Free Account
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </BrandButton>
          </div>
          {/* Download badges in CTA */}
          <div className="flex items-center gap-3 justify-center mt-8 flex-wrap">
            <a href="https://play.google.com/store/apps/details?id=co.median.android.mbbeeqr" target="_blank" rel="noopener noreferrer">
              <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" className="h-12" loading="lazy" />
            </a>
            <a href="https://m.apkpure.com/naijalancers-freelance-app/co.median.android.mbbeeqr" target="_blank" rel="noopener noreferrer" className="bg-primary-foreground/20 text-primary-foreground rounded-lg px-3 py-1.5 flex items-center gap-2 hover:bg-primary-foreground/30 transition-colors border border-primary-foreground/30">
              <Download className="w-4 h-4" />
              <div className="text-left leading-tight">
                <div className="text-[9px] opacity-80">Download on</div>
                <div className="text-xs font-semibold">APKPure</div>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted/50 border-t border-border py-12">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-5 gap-8 mb-8">
              <div>
                <Logo />
                <p className="text-sm text-muted-foreground mt-4">
                  Global freelance marketplace trusted by thousands worldwide.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <a href="https://play.google.com/store/apps/details?id=co.median.android.mbbeeqr" target="_blank" rel="noopener noreferrer">
                    <img src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png" alt="Get it on Google Play" className="h-10" loading="lazy" />
                  </a>
                  <a href="https://m.apkpure.com/naijalancers-freelance-app/co.median.android.mbbeeqr" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1">
                    <Download className="w-3 h-3" />
                    APKPure
                  </a>
                </div>
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
                <h4 className="font-semibold mb-4">Developers</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li><Link to="/developers" className="hover:text-primary flex items-center gap-1.5"><Code2 className="w-3.5 h-3.5" /> API Documentation</Link></li>
                  <li><Link to="/developers#playground" className="hover:text-primary">API Playground</Link></li>
                  <li><Link to="/developers#webhooks" className="hover:text-primary">Webhooks</Link></li>
                  <li><Link to="/developers#pricing" className="hover:text-primary">Pricing</Link></li>
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
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Phone className="w-4 h-4" />
                    <button onClick={handleWhatsApp} className="hover:text-primary">
                      08167140857
                    </button>
                  </li>
                  <li className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" />
                    <button onClick={handleWhatsApp} className="hover:text-primary">
                      WhatsApp
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            <div className="border-t border-border pt-8">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <p className="text-sm text-muted-foreground">
                  © {new Date().getFullYear()} NaijaLancers. All rights reserved.
                </p>
                <div className="flex gap-4">
                  <button 
                    onClick={() => handleSocialLink('https://www.facebook.com/groups/naijalancers')}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="Facebook"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleSocialLink('https://www.youtube.com/@naijalancers')}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="YouTube"
                  >
                    <Youtube className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleSocialLink('https://linkedin.com/company/naijalancers')}
                    className="text-muted-foreground hover:text-primary transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Removed StickyMobileCTA - duplicated hero CTAs */}
    </div>
  )
}

export default Index
