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
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-accent/5 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div className="space-y-6">
                <Badge variant="secondary" className="w-fit">
                  <Target className="w-4 h-4 mr-2" />
                  Nigerian Freelancing Platform
                </Badge>
                
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary leading-tight">
                  Connect with Experts
                  <span className="block text-primary mt-2">
                    Get Work Done
                  </span>
                </h1>
                
                <p className="text-lg text-text-secondary leading-relaxed">
                  A platform connecting Nigerian freelancers with clients. Find skilled professionals or discover opportunities that match your expertise.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <BrandButton asChild size="lg" className="px-8">
                    <Link to="/signup">Get Started</Link>
                  </BrandButton>
                  <BrandButton variant="outline" asChild size="lg" className="px-8">
                    <Link to="/login">Sign In</Link>
                  </BrandButton>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl transform rotate-3"></div>
                <img 
                  src={heroImage} 
                  alt="NaijaLancers Platform" 
                  className="relative w-full rounded-2xl shadow-xl object-cover aspect-[4/3]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Video Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-text-primary mb-8">Platform Overview</h2>
            <div className="relative rounded-2xl overflow-hidden shadow-xl">
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
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-3">
                Platform Features
              </h2>
              <p className="text-text-secondary">
                Tools and services to support your freelancing journey
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="pt-6">
                  <Shield className="w-10 h-10 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Secure Payments</h3>
                  <p className="text-sm text-text-secondary">
                    SafePay escrow protects funds until work is completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <Users className="w-10 h-10 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Verified Professionals</h3>
                  <p className="text-sm text-text-secondary">
                    Connect with pre-screened freelancers
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <MessageSquare className="w-10 h-10 text-primary mb-3" />
                  <h3 className="font-semibold mb-2">Direct Messaging</h3>
                  <p className="text-sm text-text-secondary">
                    Communicate directly with clients and freelancers
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Start?
            </h2>
            <p className="text-lg mb-6 text-primary-foreground/90">
              Create your account and begin connecting with opportunities
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <BrandButton 
                asChild 
                size="lg" 
                variant="secondary"
                className="px-8"
              >
                <Link to="/signup">Sign Up</Link>
              </BrandButton>
              <BrandButton 
                asChild 
                size="lg" 
                variant="outline"
                className="px-8 border-primary-foreground text-primary-foreground hover:bg-primary-foreground/10"
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