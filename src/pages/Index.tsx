import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { 
  Briefcase, Users, Heart, GraduationCap, ShoppingBag, 
  Coins, TrendingUp, Shield, Clock, ChevronRight, Mail, Phone
} from "lucide-react";

export default function Index() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Briefcase,
      title: "Find Jobs & Gigs",
      description: "Connect with clients and land your next opportunity",
      color: "text-blue-500"
    },
    {
      icon: Users,
      title: "Expert Services",
      description: "Hire verified professionals or become an expert yourself",
      color: "text-purple-500"
    },
    {
      icon: Heart,
      title: "Fundraising",
      description: "Launch campaigns and get support from the community",
      color: "text-red-500"
    },
    {
      icon: GraduationCap,
      title: "Online Courses",
      description: "Learn new skills or teach what you know",
      color: "text-green-500"
    },
    {
      icon: ShoppingBag,
      title: "Digital Products",
      description: "Buy and sell ebooks, templates, and more",
      color: "text-orange-500"
    },
    {
      icon: Coins,
      title: "Earn Money",
      description: "Complete tasks, surveys, and games for rewards",
      color: "text-yellow-500"
    }
  ];

  const earningWays = [
    "Complete social media tasks",
    "Answer paid surveys",
    "Refer friends and earn bonuses",
    "Sell courses and digital products",
    "Offer expert services",
    "Daily sign-in rewards",
    "Play and win games"
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary/10 via-background to-primary/5">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Welcome to NaijaLancers
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8">
              Nigeria's all-in-one platform for freelancers, professionals, and entrepreneurs
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/signup")} className="text-lg px-8">
                Get Started Free
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="text-lg px-8">
                Sign In
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Already have 50,000+ Nigerian professionals using NaijaLancers
            </p>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Everything You Need in One Place</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover:shadow-lg transition-shadow">
              <feature.icon className={`h-12 w-12 mb-4 ${feature.color}`} />
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h3 className="font-semibold text-lg mb-2">Sign Up Free</h3>
                <p className="text-muted-foreground">
                  Create your account in minutes and get 50 NC welcome bonus
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h3 className="font-semibold text-lg mb-2">Complete Your Profile</h3>
                <p className="text-muted-foreground">
                  Add your skills, experience, and what you're looking for
                </p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h3 className="font-semibold text-lg mb-2">Start Earning</h3>
                <p className="text-muted-foreground">
                  Find jobs, offer services, or complete tasks to earn money
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Earning Opportunities */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <TrendingUp className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Multiple Ways to Earn</h2>
            <p className="text-muted-foreground text-lg">
              Whether you're a freelancer, creator, or just looking for side income
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {earningWays.map((way, index) => (
              <Card key={index} className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <Coins className="h-4 w-4 text-primary" />
                </div>
                <span className="font-medium">{way}</span>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Trust & Safety */}
      <div className="bg-primary/5 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Shield className="h-16 w-16 text-primary mx-auto mb-4" />
              <h2 className="text-3xl font-bold mb-4">Secure & Protected</h2>
              <p className="text-muted-foreground text-lg">
                Your money and data are safe with us
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 text-center">
                <Shield className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">SafePay Escrow</h3>
                <p className="text-sm text-muted-foreground">
                  Funds held securely until work is completed
                </p>
              </Card>
              <Card className="p-6 text-center">
                <Users className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">Verified Experts</h3>
                <p className="text-sm text-muted-foreground">
                  All experts reviewed and verified by admin
                </p>
              </Card>
              <Card className="p-6 text-center">
                <Clock className="h-8 w-8 text-primary mx-auto mb-3" />
                <h3 className="font-semibold mb-2">24/7 Support</h3>
                <p className="text-sm text-muted-foreground">
                  Always here to help resolve any issues
                </p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Preview */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Have Questions?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Check out our comprehensive FAQ for everything you need to know
          </p>
          <Button onClick={() => navigate("/faq")} size="lg" variant="outline">
            View FAQ
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-xl mb-8 opacity-90">
            Join thousands of Nigerians earning, learning, and growing
          </p>
          <Button 
            size="lg" 
            variant="secondary" 
            onClick={() => navigate("/signup")}
            className="text-lg px-8"
          >
            Create Free Account
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="mt-4 text-sm opacity-80">
            No credit card required • Start earning immediately
          </p>
        </div>
      </div>

      {/* About Us Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">About NaijaLancers</h2>
          <div className="prose prose-lg mx-auto text-muted-foreground">
            <p className="text-center mb-6">
              NaijaLancers is Nigeria's premier all-in-one platform connecting freelancers, professionals, and entrepreneurs. 
              We provide a comprehensive ecosystem where Nigerians can find work, offer services, learn new skills, 
              raise funds, and build successful careers.
            </p>
            <div className="grid md:grid-cols-3 gap-6 mt-8">
              <Card className="text-center p-6">
                <Users className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Our Mission</h3>
                <p className="text-sm">Empowering Nigerians through accessible opportunities and connections</p>
              </Card>
              <Card className="text-center p-6">
                <Shield className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Our Values</h3>
                <p className="text-sm">Trust, transparency, and community-first approach in everything we do</p>
              </Card>
              <Card className="text-center p-6">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary" />
                <h3 className="font-semibold mb-2">Our Vision</h3>
                <p className="text-sm">Building Africa's largest professional and entrepreneurial network</p>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Us Section */}
      <div className="bg-muted/30 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <Card className="p-6">
                <Mail className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">Email Support</h3>
                <p className="text-muted-foreground mb-4">
                  For general inquiries, support requests, or partnership opportunities
                </p>
                <a 
                  href="mailto:support@naijalancers.name.ng" 
                  className="text-primary hover:underline font-medium"
                >
                  support@naijalancers.name.ng
                </a>
              </Card>
              <Card className="p-6">
                <Phone className="h-8 w-8 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">WhatsApp Support</h3>
                <p className="text-muted-foreground mb-4">
                  Connect with us directly for urgent matters and quick assistance
                </p>
                <a 
                  href="https://wa.me/2348167140857" 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline font-medium"
                >
                  +234 816 714 0857
                </a>
              </Card>
            </div>
            <div className="text-center mt-8">
              <p className="text-muted-foreground">
                We typically respond within 24 hours during business days
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-background border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => navigate("/faq")} className="hover:text-primary">
              FAQ
            </button>
            <button onClick={() => navigate("/terms-conditions")} className="hover:text-primary">
              Terms & Conditions
            </button>
            <button onClick={() => navigate("/privacy-policy")} className="hover:text-primary">
              Privacy Policy
            </button>
          </div>
          <p className="text-center text-muted-foreground text-sm mt-4">
            © 2025 NaijaLancers. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}