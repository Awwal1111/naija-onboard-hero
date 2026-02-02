import React from 'react';
import { Button } from "@/components/ui/button";
import { Phone, MessageCircle, Video, Facebook } from "lucide-react";
import { trackCommunicationClick, ButtonType } from "@/lib/communicationAnalytics";
import { useLocation } from "react-router-dom";

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
