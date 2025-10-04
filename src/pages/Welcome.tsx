import React from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Facebook, Youtube, Linkedin, MessageSquare, Mail, MapPin, Phone, Users, Target } from 'lucide-react'
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
      <nav className="flex items-center justify-between p-6 sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
        <Logo />
        <div className="flex items-center gap-6">
          <Link to="/signup" className="text-primary font-medium hover:text-primary/80 transition-colors">
            Sign Up
          </Link>
          <Link to="/login" className="text-text-primary font-medium hover:text-text-secondary transition-colors">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-secondary/5 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              {/* Text Content */}
              <div className="space-y-8">
                <Badge variant="secondary" className="w-fit">
                  <Target className="w-4 h-4 mr-2" />
                  Connecting Experts and Clients
                </Badge>
                
                <h1 className="text-5xl lg:text-7xl font-bold text-text-primary leading-tight">
                  Naija<span className="text-primary">Lancers</span>
                </h1>
                
                <p className="text-xl text-text-secondary leading-relaxed max-w-lg">
                  Nigeria's premier freelancing platform where talented professionals meet their next opportunity. Join thousands of experts and clients building the future together.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                  <BrandButton asChild size="lg" className="px-8 py-4 text-lg">
                    <Link to="/signup">Get Started Free</Link>
                  </BrandButton>
                  <BrandButton variant="outline" asChild size="lg" className="px-8 py-4 text-lg">
                    <Link to="/login">Sign In</Link>
                  </BrandButton>
                </div>
              </div>

              {/* Hero Image */}
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-3xl transform rotate-6"></div>
                <img 
                  src={heroImage} 
                  alt="NaijaLancers - Connecting experts and clients across Nigeria" 
                  className="relative w-full rounded-3xl shadow-2xl object-cover aspect-[4/3]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Promotional Video Section */}
      <section className="py-16 bg-gradient-to-br from-primary/5 to-secondary/5">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-text-primary mb-8">See NaijaLancers in Action</h2>
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
            <p className="text-center text-sm text-text-secondary mt-4">
              Discover how NaijaLancers connects talented professionals with exciting opportunities
            </p>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-text-primary mb-4">Our Vision</h2>
            <p className="text-xl text-text-secondary mb-8">
              "Connecting experts and clients to build a thriving digital economy in Nigeria"
            </p>
            <div className="grid md:grid-cols-3 gap-8">
              <Card>
                <CardContent className="pt-6 text-center">
                  <Users className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Expert Network</h3>
                  <p className="text-sm text-text-secondary">Connect with verified professionals across Nigeria</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <Target className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Quality Projects</h3>
                  <p className="text-sm text-text-secondary">Find meaningful work that matches your skills</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <MessageSquare className="w-12 h-12 text-primary mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Secure Platform</h3>
                  <p className="text-sm text-text-secondary">Safe payments and professional communication</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Social Media & Contact Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-text-primary mb-12">Connect With Us</h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              {/* Social Media Links */}
              <Card>
                <CardHeader>
                  <CardTitle>Follow Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <button
                    onClick={() => handleSocialLink('https://www.facebook.com/profile.php?id=61578071680687')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <span>Facebook</span>
                  </button>
                  
                  <button
                    onClick={handleWhatsApp}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Phone className="w-5 h-5 text-green-600" />
                    <span>WhatsApp: 08167140857</span>
                  </button>
                  
                  <button
                    onClick={() => handleSocialLink('https://youtube.com/@naijalancers')}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Youtube className="w-5 h-5 text-red-600" />
                    <span>YouTube</span>
                  </button>
                  
                  {/* Placeholder buttons */}
                  <button
                    disabled
                    className="w-full flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-50 cursor-not-allowed"
                  >
                    <Linkedin className="w-5 h-5 text-blue-800" />
                    <span>LinkedIn (Coming Soon)</span>
                  </button>
                  
                  <button
                    disabled
                    className="w-full flex items-center gap-3 p-3 rounded-lg border bg-muted/30 opacity-50 cursor-not-allowed"
                  >
                    <MessageSquare className="w-5 h-5 text-orange-600" />
                    <span>Reddit (Coming Soon)</span>
                  </button>
                </CardContent>
              </Card>

              {/* About Us Info */}
              <Card>
                <CardHeader>
                  <CardTitle>About Us</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Our Location</p>
                      <p className="text-sm text-text-secondary">
                        Unguwan Nasarawa, Kontagora<br />
                        Kontagora LGA, Niger State<br />
                        Nigeria
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-text-secondary">
                        Support@Naijalancers.name.ng
                      </p>
                    </div>
                  </div>

                  {/* Newsletter Placeholder */}
                  <div className="pt-4 border-t">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 opacity-50">
                      <Mail className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-muted-foreground">Newsletter</p>
                        <p className="text-xs text-muted-foreground">Coming Soon</p>
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
      <footer className="py-8 border-t border-border bg-background">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <Logo />
              <span className="text-sm text-text-secondary">© 2025 NaijaLancers. All rights reserved.</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/terms-conditions" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                Terms & Conditions
              </Link>
              <Link to="/terms-conditions" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Welcome