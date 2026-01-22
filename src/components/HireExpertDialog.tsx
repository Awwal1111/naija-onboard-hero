import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Briefcase, MessageCircle, Package, Star, Clock, ArrowRight, Loader2 } from 'lucide-react';
import { formatPriceForDisplay } from '@/components/CurrencyDisplay';
import { useUserCountry } from '@/hooks/useUserCountry';

interface HireExpertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expertId: string;
  expertName: string;
}

interface Gig {
  id: string;
  title: string;
  description: string;
  price: number;
  delivery_days: number;
  average_rating: number;
  review_count: number;
  photo_urls: string[];
}

export const HireExpertDialog: React.FC<HireExpertDialogProps> = ({
  open,
  onOpenChange,
  expertId,
  expertName
}) => {
  const navigate = useNavigate();
  const { isNigerian } = useUserCountry();

  // Fetch expert's gigs
  const { data: gigs = [], isLoading } = useQuery({
    queryKey: ['expert-gigs', expertId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs_services')
        .select('id, title, description, price, delivery_days, average_rating, review_count, photo_urls')
        .eq('user_id', expertId)
        .eq('status', 'active')
        .order('boost_amount', { ascending: false })
        .limit(5);

      if (error) throw error;
      return (data || []) as Gig[];
    },
    enabled: open && !!expertId
  });

  const handleOrderGig = (gigId: string) => {
    onOpenChange(false);
    navigate(`/gig/${gigId}`);
  };

  const handleDirectMessage = () => {
    onOpenChange(false);
    navigate(`/chat/${expertId}`);
  };

  const handleViewProfile = () => {
    onOpenChange(false);
    navigate(`/expert/${expertId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary" />
            Hire {expertName}
          </DialogTitle>
          <DialogDescription>
            Choose a service package or send a custom request
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : gigs.length > 0 ? (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">Available Services</h3>
              <div className="space-y-3">
                {gigs.map((gig) => (
                  <Card
                    key={gig.id}
                    className="p-3 cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => handleOrderGig(gig.id)}
                  >
                    <div className="flex gap-3">
                      {gig.photo_urls?.[0] && (
                        <img
                          src={gig.photo_urls[0]}
                          alt={gig.title}
                          className="w-16 h-16 object-cover rounded-lg shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm line-clamp-1">{gig.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {gig.description}
                        </p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="font-semibold text-primary text-sm">
                            {formatPriceForDisplay(gig.price, isNigerian)}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {gig.delivery_days} days
                          </div>
                          {gig.average_rating > 0 && (
                            <div className="flex items-center gap-1 text-xs">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              {gig.average_rating.toFixed(1)}
                            </div>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No service packages available yet</p>
              <p className="text-xs mt-1">Send a direct message for custom work</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="border-t pt-4 space-y-2">
            <Button
              className="w-full"
              onClick={handleDirectMessage}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Send Custom Request
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={handleViewProfile}
            >
              View Full Profile
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
