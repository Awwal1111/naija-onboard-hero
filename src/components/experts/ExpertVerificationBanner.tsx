import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

export const ExpertVerificationBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: profile, isLoading } = useQuery({
    queryKey: ['expert-verification-banner', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, verification_payment_status, is_expert')
        .eq('user_id', user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  if (isLoading || !profile?.is_expert) return null;

  const isVerified = profile.verification_status === 'verified';
  const isSubmitted = profile.verification_status === 'submitted';
  const isPaid = profile.verification_payment_status === 'paid';

  if (isVerified) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="font-medium text-sm">Verified Expert</p>
                <p className="text-xs text-muted-foreground">All features unlocked</p>
              </div>
            </div>
            <Badge className="bg-green-500 text-white text-xs">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      className="border-primary/30 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
      onClick={() => navigate('/expert-verification')}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSubmitted && isPaid ? (
              <Clock className="h-5 w-5 text-yellow-600" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
            <div>
              <p className="font-medium text-sm">
                {isSubmitted && isPaid ? 'Under Review' : isSubmitted ? 'Complete Payment' : 'Get Verified'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isSubmitted && isPaid 
                  ? 'Your application is being reviewed'
                  : 'Unlock premium features & build trust'
                }
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
