import React from 'react';
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Video, Facebook } from "lucide-react";
import { trackCommunicationClick, ButtonType } from "@/lib/communicationAnalytics";
import { useLocation } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ChatContactBarProps {
  userId: string;
  phoneNumber?: string | null;
  whatsappNumber?: string | null;
  googleMeetLink?: string | null;
  facebookUrl?: string | null;
}

/**
 * Prominent contact bar shown at top of chat - always visible
 * Allows quick access to external communication channels
 */
export const ChatContactBar = ({
  userId,
  phoneNumber,
  whatsappNumber,
  googleMeetLink,
  facebookUrl,
}: ChatContactBarProps) => {
  const location = useLocation();
  const { user } = useAuth();
  const me = user?.id;

  // External contact unlocks only once the two users have a funded deal on NaijaLancers
  const { data: hasFundedDeal = false } = useQuery({
    queryKey: ['funded-deal', me, userId],
    enabled: !!me && !!userId && me !== userId,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const pair = `and(buyer_id.eq.${me},seller_id.eq.${userId}),and(buyer_id.eq.${userId},seller_id.eq.${me})`;
      const { count: g } = await supabase.from('gig_orders').select('id', { count: 'exact', head: true })
        .or(pair).not('status', 'in', '(cancelled,pending)');
      if ((g ?? 0) > 0) return true;
      const cpair = `and(client_id.eq.${me},expert_id.eq.${userId}),and(client_id.eq.${userId},expert_id.eq.${me})`;
      const { count: h } = await supabase.from('hire_contracts').select('id', { count: 'exact', head: true })
        .or(cpair).in('status', ['active', 'completed']);
      return (h ?? 0) > 0;
    },
  });

  const formatWhatsAppLink = (number: string) => {
    let formatted = number.replace(/[\s-]/g, '');
    if (formatted.startsWith('0')) {
      formatted = '234' + formatted.substring(1);
    } else if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    return `https://wa.me/${formatted}`;
  };

  const handleClick = async (buttonType: ButtonType, url: string) => {
    trackCommunicationClick({
      targetUserId: userId,
      buttonType,
      sourcePage: location.pathname,
      sourceContext: 'chat_header'
    });
    window.open(url, '_blank');
  };

  const hasAnyContact = phoneNumber || whatsappNumber || googleMeetLink || facebookUrl;

  if (!hasAnyContact) return null;

  if (!hasFundedDeal) {
    return (
      <div className="bg-primary/5 border-b border-border px-3 py-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-muted-foreground">
          Pay safely on NaijaLancers. WhatsApp and call buttons unlock once an order or contract is funded — your money stays protected in escrow until the work is done.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border-b border-border px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
        <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">
          Quick contact:
        </span>
        
        {/* WhatsApp - Most prominent */}
        {whatsappNumber && (
          <Button
            variant="default"
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground h-7 px-3 text-xs shrink-0"
            onClick={() => handleClick('whatsapp', formatWhatsAppLink(whatsappNumber))}
          >
            <MessageCircle className="h-3.5 w-3.5 mr-1" />
            WhatsApp
          </Button>
        )}

        {/* Phone Call */}
        {phoneNumber && (
          <Button
            variant="outline"
            size="sm"
            className="border-primary/50 text-primary hover:bg-primary/10 h-7 px-3 text-xs shrink-0"
            onClick={() => handleClick('phone', `tel:${phoneNumber}`)}
          >
            <Phone className="h-3.5 w-3.5 mr-1" />
            Call
          </Button>
        )}

        {/* Google Meet */}
        {googleMeetLink && (
          <Button
            variant="outline"
            size="sm"
            className="border-accent/50 text-accent-foreground hover:bg-accent/10 h-7 px-3 text-xs shrink-0"
            onClick={() => handleClick('google_meet', googleMeetLink)}
          >
            <Video className="h-3.5 w-3.5 mr-1" />
            Meet
          </Button>
        )}

        {/* Facebook */}
        {facebookUrl && (
          <Button
            variant="outline"
            size="sm"
            className="border-secondary/50 text-secondary-foreground hover:bg-secondary/10 h-7 px-3 text-xs shrink-0"
            onClick={() => handleClick('facebook', facebookUrl)}
          >
            <Facebook className="h-3.5 w-3.5 mr-1" />
            Facebook
          </Button>
        )}
      </div>
    </div>
  );
};
