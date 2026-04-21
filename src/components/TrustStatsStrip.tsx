import React from 'react'
import { Users, Globe2, Briefcase, ShieldCheck } from 'lucide-react'

/**
 * Static trust stats — intentionally hardcoded to avoid Supabase egress.
 * Numbers are conservative and reflect approximate platform scale.
 * Update these values manually when reviewing the landing page quarterly.
 */
const stats = [
  { icon: Users, value: '700+', label: 'Members worldwide' },
  { icon: Globe2, value: '40+', label: 'Countries served' },
  { icon: Briefcase, value: '1,200+', label: 'Projects posted' },
  { icon: ShieldCheck, value: '100%', label: 'Escrow-protected' },
]

export const TrustStatsStrip: React.FC = () => {
  return (
    <section className="py-8 sm:py-10 bg-muted/30 border-y border-border/50">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 max-w-5xl mx-auto">
          {stats.map(({ icon: Icon, value, label }) => (
            <div
              key={label}
              className="flex flex-col items-center text-center gap-2 p-3 sm:p-4 rounded-xl bg-background/60 backdrop-blur-sm border border-border/40"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-foreground">{value}</div>
              <div className="text-xs sm:text-sm text-muted-foreground leading-tight">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default TrustStatsStrip
