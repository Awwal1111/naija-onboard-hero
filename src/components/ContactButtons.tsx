import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Video, Facebook, Lock, Crown } from "lucide-react";
import { trackCommunicationClick, ButtonType } from "@/lib/communicationAnalytics";
import { useLocation, useNavigate } from "react-router-dom";
import { usePremiumGate } from "@/hooks/usePremiumGate";

interface ContactButtonsProps {
  userId: string;
  phoneNumber?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  googleMeetLink?: string | null;
  facebookUrl?: string | null;
  sourceContext?: string;
}

/**
 * Free contact buttons for all users - no premium gating
 * All clicks are tracked for admin analytics
 */
export const ContactButtons = ({
  userId,
  phoneNumber,
  email,
  whatsappNumber,
  googleMeetLink,
  facebookUrl,
  sourceContext,
}: ContactButtonsProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPremium } = usePremiumGate();

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
    // Track analytics in background
    trackCommunicationClick({
      targetUserId: userId,
      buttonType,
      sourcePage: location.pathname,
      sourceContext
    });
    
    // Open the link
    window.open(url, '_blank');
  };

  const hasAnyContact = phoneNumber || email || whatsappNumber || googleMeetLink || facebookUrl;

  if (!hasAnyContact) return null;

  // Free users cannot view other users' contact details
  if (!isPremium) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span>Contact details are hidden for free accounts.</span>
        </div>
        <Button size="sm" onClick={() => navigate('/premium')} className="gap-1">
          <Crown className="h-4 w-4" />
          Upgrade to view contacts
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {/* WhatsApp */}
      {whatsappNumber && (
        <Button
          variant="outline"
          size="sm"
          className="bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20"
          onClick={() => handleClick('whatsapp', formatWhatsAppLink(whatsappNumber))}
        >
          <MessageCircle className="h-4 w-4 mr-1" />
          WhatsApp
        </Button>
      )}

      {/* Phone Call */}
      {phoneNumber && (
        <Button
          variant="outline"
          size="sm"
          className="bg-blue-500/10 border-blue-500/30 text-blue-600 hover:bg-blue-500/20"
          onClick={() => handleClick('phone', `tel:${phoneNumber}`)}
        >
          <Phone className="h-4 w-4 mr-1" />
          Call
        </Button>
      )}

      {/* Email */}
      {email && (
        <Button
          variant="outline"
          size="sm"
          className="bg-purple-500/10 border-purple-500/30 text-purple-600 hover:bg-purple-500/20"
          onClick={() => handleClick('email', `mailto:${email}`)}
        >
          <Mail className="h-4 w-4 mr-1" />
          Email
        </Button>
      )}

      {/* Google Meet */}
      {googleMeetLink && (
        <Button
          variant="outline"
          size="sm"
          className="bg-orange-500/10 border-orange-500/30 text-orange-600 hover:bg-orange-500/20"
          onClick={() => handleClick('google_meet', googleMeetLink)}
        >
          <Video className="h-4 w-4 mr-1" />
          Meet
        </Button>
      )}

      {/* Facebook */}
      {facebookUrl && (
        <Button
          variant="outline"
          size="sm"
          className="bg-indigo-500/10 border-indigo-500/30 text-indigo-600 hover:bg-indigo-500/20"
          onClick={() => handleClick('facebook', facebookUrl)}
        >
          <Facebook className="h-4 w-4 mr-1" />
          Facebook
        </Button>
      )}
    </div>
  );
};
