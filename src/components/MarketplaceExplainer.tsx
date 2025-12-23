import React from 'react';
import { Briefcase, Package, GraduationCap, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface MarketplaceExplainerProps {
  type: 'gig' | 'job' | 'expert';
  onDismiss?: () => void;
  showDismiss?: boolean;
}

export const MarketplaceExplainer: React.FC<MarketplaceExplainerProps> = ({
  type,
  onDismiss,
  showDismiss = true
}) => {
  const explanations = {
    gig: {
      icon: Package,
      title: 'Services (Gigs)',
      description: 'Pre-packaged services offered by freelancers at fixed prices. Browse, compare, and order directly.',
      examples: 'Logo design, website development, video editing, content writing',
      color: 'text-green-600 bg-green-500/10 border-green-500/20'
    },
    job: {
      icon: Briefcase,
      title: 'Jobs',
      description: 'Work opportunities posted by clients looking to hire. Apply with your proposal and get hired.',
      examples: 'Full-time positions, project-based work, contract roles',
      color: 'text-blue-600 bg-blue-500/10 border-blue-500/20'
    },
    expert: {
      icon: GraduationCap,
      title: 'Experts',
      description: 'Verified professionals with proven skills who can teach, mentor, or consult. They host live classes and offer personalized guidance.',
      examples: 'Mentorship sessions, live workshops, skill training, consulting',
      color: 'text-purple-600 bg-purple-500/10 border-purple-500/20'
    }
  };

  const info = explanations[type];
  const Icon = info.icon;

  return (
    <Card className={`${info.color} border relative`}>
      <CardContent className="p-3 sm:p-4">
        {showDismiss && onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        )}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-background/50">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 pr-6">
            <h4 className="font-semibold text-sm mb-1">{info.title}</h4>
            <p className="text-xs text-muted-foreground leading-relaxed mb-1.5">
              {info.description}
            </p>
            <p className="text-[10px] text-muted-foreground/80">
              <span className="font-medium">Examples:</span> {info.examples}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default MarketplaceExplainer;
