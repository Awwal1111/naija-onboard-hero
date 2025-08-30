import React from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import heroImage from '@/assets/hero-image.jpg'

const Welcome = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Bar */}
      <nav className="flex items-center justify-between p-6">
        <Logo />
        <div className="flex items-center gap-6">
          <Link to="/signup" className="text-primary font-medium hover:text-brand-green-hover transition-colors">
            Sign Up
          </Link>
          <Link to="/login" className="text-text-primary font-medium hover:text-text-secondary transition-colors">
            Log In
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex flex-col items-center justify-center min-h-[80vh] px-6">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Hero Image */}
          <div className="mb-12">
            <img 
              src={heroImage} 
              alt="NaijaLancers - Gateway to freelancing opportunities" 
              className="w-full max-w-2xl mx-auto rounded-2xl shadow-2xl"
            />
          </div>

          {/* Brand Name */}
          <h1 className="text-5xl md:text-6xl font-bold text-text-primary mb-4">
            NaijaLancers
          </h1>

          {/* Tagline */}
          <p className="text-xl md:text-2xl text-text-secondary font-medium max-w-2xl mx-auto">
            Your gateway to freelancing opportunities in Nigeria
          </p>

          {/* CTA Button */}
          <div className="pt-8">
            <BrandButton asChild size="lg" className="px-12 py-4 text-lg">
              <Link to="/signup">Get Started</Link>
            </BrandButton>
          </div>
        </div>
      </main>
    </div>
  )
}

export default Welcome