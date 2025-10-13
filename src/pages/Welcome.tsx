import React from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Facebook, Youtube, Linkedin, MessageSquare, Mail, MapPin, Phone, Users, Target, Shield, Zap, TrendingUp, CheckCircle, Star, ArrowRight, Briefcase, DollarSign, Clock } from 'lucide-react'
import heroImage from '@/assets/hero-image.jpg'

const Welcome = () => {
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
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between p-6 sticky top-0 bg-background/95 backdrop-blur-md border-b border-border z-50 shadow-sm">
        <Logo />
        <div className="flex items-center gap-4">
          <BrandButton variant="ghost" asChild>
            <Link to="/login">Log In</Link>
          </BrandButton>
          <BrandButton asChild>
            <Link to="/signup">Get Started</Link>
          </BrandButton>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-accent/5 py-24 md:py-32">
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl animate-pulse delay-75"></div>
        </div>

        <div className="container mx-auto px-6 relative">
          <div className="max-w-7xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-16 items-center">
              {/* Text Content */}
              <div className="space-y-8 animate-fade-in">
                <Badge variant="secondary" className="w-fit px-4 py-2 text-sm">
                  <Zap className="w-4 h-4 mr-2" />
                  Nigeria's #1 Freelancing Platform
                </Badge>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-text-primary leading-tight">
                  Find Your Next
                  <span className="block text-primary mt-2">
                    Great Opportunity
                  </span>
                </h1>
                
                <p className="text-xl md:text-2xl text-text-secondary leading-relaxed max-w-xl">
                  Connect with top Nigerian talent or find your dream projects. Join 10,000+ professionals building their future on NaijaLancers.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <BrandButton asChild size="lg" className="px-8 py-6 text-lg font-semibold group">
                    <Link to="/signup">
                      Start Earning Today
                      <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </Link>
                  </BrandButton>
                  <BrandButton variant="outline" asChild size="lg" className="px-8 py-6 text-lg">
                    <Link to="/login">Sign In</Link>
                  </BrandButton>
                </div>

                {/* Trust Indicators */}
                <div className="flex flex-wrap items-center gap-6 pt-8 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 border-2 border-background"></div>
                      <div className="w-8 h-8 rounded-full bg-accent/20 border-2 border-background"></div>
                      <div className="w-8 h-8 rounded-full bg-primary/30 border-2 border-background"></div>
                    </div>
                    <p className="text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">10,000+</span> Active Users
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <p className="text-sm text-text-secondary">
                      <span className="font-semibold text-text-primary">4.8/5</span> Rating
                    </p>
                  </div>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative animate-fade-in">
                <div className="absolute -inset-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-3xl blur-2xl"></div>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl transform rotate-3 transition-transform hover:rotate-6"></div>
                  <img 
                    src={heroImage} 
                    alt="NaijaLancers - Connecting experts and clients across Nigeria" 
                    className="relative w-full rounded-3xl shadow-2xl object-cover aspect-[4/3] transform transition-transform hover:scale-105"
                  />
                  {/* Floating Stats */}
                  <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-2xl p-4 shadow-lg backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">500+</p>
                        <p className="text-xs text-text-secondary">Jobs Posted Daily</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">10K+</div>
                <p className="text-primary-foreground/80">Active Users</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">500+</div>
                <p className="text-primary-foreground/80">Daily Jobs</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">₦50M+</div>
                <p className="text-primary-foreground/80">Earned</p>
              </div>
              <div className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">98%</div>
                <p className="text-primary-foreground/80">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Video Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <Badge variant="secondary" className="mb-4">
                <Youtube className="w-4 h-4 mr-2" />
                Platform Overview
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                See NaijaLancers in Action
              </h2>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Watch how we're transforming the way Nigerians work and hire
              </p>
            </div>
            
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border-4 border-border">
              <div className="relative" style={{ height: 0, paddingBottom: 'calc(56.25%)', position: 'relative', width: '100%' }}>
                <iframe 
                  allow="autoplay; gyroscope;" 
                  allowFullScreen 
                  height="100%" 
                  referrerPolicy="strict-origin" 
                  src="https://www.kapwing.com/e/68dff106a333077a113394bb" 
                  style={{ border: 0, height: '100%', left: 0, overflow: 'hidden', position: 'absolute', top: 0, width: '100%' }} 
                  title="NaijaLancers Platform Overview" 
                  width="100%"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-16">
              <Badge variant="secondary" className="mb-4">
                <Target className="w-4 h-4 mr-2" />
                Why Choose NaijaLancers
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                Everything You Need to Succeed
              </h2>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Join Nigeria's most trusted freelancing platform with powerful features designed for your success
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Shield className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Secure Payments</h3>
                  <p className="text-text-secondary">
                    SafePay escrow system ensures your money is protected until work is completed
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Users className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Verified Experts</h3>
                  <p className="text-text-secondary">
                    Work with pre-screened, verified professionals you can trust
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Clock className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Fast Hiring</h3>
                  <p className="text-text-secondary">
                    Post a job and receive qualified proposals within hours
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Quality Jobs</h3>
                  <p className="text-text-secondary">
                    Access to thousands of legitimate, high-paying opportunities
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">24/7 Support</h3>
                  <p className="text-text-secondary">
                    Get help anytime with our dedicated support team
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg group">
                <CardContent className="pt-6">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <DollarSign className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">Fair Pricing</h3>
                  <p className="text-text-secondary">
                    Low fees mean you keep more of what you earn
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                How It Works
              </h2>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Get started in three simple steps
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="relative">
                <div className="bg-card border-2 border-border rounded-2xl p-8 hover:border-primary/50 transition-all hover:shadow-lg">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">
                    1
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Create Account</h3>
                  <p className="text-text-secondary">
                    Sign up for free and complete your profile in minutes
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30"></div>
              </div>

              <div className="relative">
                <div className="bg-card border-2 border-border rounded-2xl p-8 hover:border-primary/50 transition-all hover:shadow-lg">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">
                    2
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Find or Post Jobs</h3>
                  <p className="text-text-secondary">
                    Browse opportunities or post your project requirements
                  </p>
                </div>
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-0.5 bg-primary/30"></div>
              </div>

              <div className="relative">
                <div className="bg-card border-2 border-border rounded-2xl p-8 hover:border-primary/50 transition-all hover:shadow-lg">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center text-2xl font-bold mb-6">
                    3
                  </div>
                  <h3 className="text-2xl font-semibold mb-4">Start Working</h3>
                  <p className="text-text-secondary">
                    Connect, collaborate, and get paid securely
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Get Started?
            </h2>
            <p className="text-xl mb-8 text-primary-foreground/90">
              Join thousands of Nigerian professionals building their future on NaijaLancers
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <BrandButton 
                asChild 
                size="lg" 
                variant="secondary"
                className="px-8 py-6 text-lg font-semibold"
              >
                <Link to="/signup">Create Free Account</Link>
              </BrandButton>
              <BrandButton 
                asChild 
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link to="/login">Sign In</Link>
              </BrandButton>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media & Contact Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl md:text-5xl font-bold text-text-primary mb-4">
                Connect With Us
              </h2>
              <p className="text-xl text-text-secondary max-w-2xl mx-auto">
                Stay updated and get support through our channels
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Social Media Links */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl">Follow Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <button
                    onClick={() => handleSocialLink('https://www.facebook.com/profile.php?id=61578071680687')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-12 h-12 bg-blue-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Facebook className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">Facebook</p>
                      <p className="text-sm text-text-secondary">Follow for updates</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-secondary group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-12 h-12 bg-green-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Phone className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">WhatsApp</p>
                      <p className="text-sm text-text-secondary">08167140857</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-secondary group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  <button
                    onClick={() => handleSocialLink('https://youtube.com/@naijalancers')}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <div className="w-12 h-12 bg-red-600/10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Youtube className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">YouTube</p>
                      <p className="text-sm text-text-secondary">Watch tutorials</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-text-secondary group-hover:translate-x-1 transition-transform" />
                  </button>
                  
                  {/* Placeholder buttons */}
                  <div className="w-full flex items-center gap-4 p-4 rounded-xl border-2 bg-muted/30 opacity-60">
                    <div className="w-12 h-12 bg-blue-800/10 rounded-xl flex items-center justify-center">
                      <Linkedin className="w-6 h-6 text-blue-800" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-semibold">LinkedIn</p>
                      <p className="text-sm text-text-secondary">Coming Soon</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* About Us Info */}
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-2xl">Contact Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-start gap-4 p-4 bg-accent/30 rounded-xl">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Our Location</p>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        Unguwan Nasarawa, Kontagora<br />
                        Kontagora LGA, Niger State<br />
                        Nigeria
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-accent/30 rounded-xl">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Mail className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold mb-1">Email Support</p>
                      <p className="text-sm text-text-secondary">
                        Support@Naijalancers.name.ng
                      </p>
                    </div>
                  </div>

                  {/* Newsletter Placeholder */}
                  <div className="p-4 bg-muted/30 rounded-xl border-2 border-dashed opacity-60">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center">
                        <Mail className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-semibold text-muted-foreground">Newsletter</p>
                        <p className="text-sm text-muted-foreground">Coming Soon</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-3 gap-8 mb-8">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Logo />
                  <span className="font-bold text-xl">NaijaLancers</span>
                </div>
                <p className="text-sm text-text-secondary mb-4">
                  Nigeria's premier freelancing platform connecting experts and clients.
                </p>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handleSocialLink('https://www.facebook.com/profile.php?id=61578071680687')}
                    className="w-10 h-10 rounded-full bg-accent/50 hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
                  >
                    <Facebook className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleSocialLink('https://youtube.com/@naijalancers')}
                    className="w-10 h-10 rounded-full bg-accent/50 hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
                  >
                    <Youtube className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={handleWhatsApp}
                    className="w-10 h-10 rounded-full bg-accent/50 hover:bg-primary hover:text-primary-foreground transition-all flex items-center justify-center"
                  >
                    <Phone className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Quick Links</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/signup" className="text-sm text-text-secondary hover:text-primary transition-colors">
                      Get Started
                    </Link>
                  </li>
                  <li>
                    <Link to="/login" className="text-sm text-text-secondary hover:text-primary transition-colors">
                      Sign In
                    </Link>
                  </li>
                  <li>
                    <a href="#features" className="text-sm text-text-secondary hover:text-primary transition-colors">
                      Features
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2">
                  <li>
                    <Link to="/terms-conditions" className="text-sm text-text-secondary hover:text-primary transition-colors">
                      Terms & Conditions
                    </Link>
                  </li>
                  <li>
                    <Link to="/privacy-policy" className="text-sm text-text-secondary hover:text-primary transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-border text-center">
              <p className="text-sm text-text-secondary">
                © 2025 NaijaLancers. All rights reserved. Built with ❤️ in Nigeria
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Welcome