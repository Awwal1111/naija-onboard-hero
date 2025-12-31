import { Button } from "@/components/ui/button";
import { Phone, Mail, MessageCircle, Video, Facebook, Crown } from "lucide-react";

interface PremiumContactButtonsProps {
  phoneNumber?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  googleMeetLink?: string | null;
  facebookUrl?: string | null;
  isPremium: boolean;
  showPremiumBadge?: boolean;
}

export const PremiumContactButtons = ({
  phoneNumber,
  email,
  whatsappNumber,
  googleMeetLink,
  facebookUrl,
  isPremium,
  showPremiumBadge = true,
}: PremiumContactButtonsProps) => {
  if (!isPremium) return null;

  const formatWhatsAppLink = (number: string) => {
    // Remove spaces, dashes, and format for Nigerian numbers
    let formatted = number.replace(/[\s-]/g, '');
    if (formatted.startsWith('0')) {
      formatted = '234' + formatted.substring(1);
    } else if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    return `https://wa.me/${formatted}`;
  };

  const hasAnyContact = phoneNumber || email || whatsappNumber || googleMeetLink || facebookUrl;

  if (!hasAnyContact) return null;

  return (
    <div className="space-y-3">
      {showPremiumBadge && (
        <div className="flex items-center gap-2">
          <Crown className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
            Premium Contact
          </span>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {/* WhatsApp */}
        {whatsappNumber && (
          <Button
            variant="outline"
            size="sm"
            className="bg-green-500/10 border-green-500/30 text-green-600 hover:bg-green-500/20"
            onClick={() => window.open(formatWhatsAppLink(whatsappNumber), '_blank')}
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
            onClick={() => window.open(`tel:${phoneNumber}`, '_blank')}
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
            onClick={() => window.open(`mailto:${email}`, '_blank')}
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
            onClick={() => window.open(googleMeetLink, '_blank')}
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
            onClick={() => window.open(facebookUrl, '_blank')}
          >
            <Facebook className="h-4 w-4 mr-1" />
            Facebook
          </Button>
        )}
      </div>
    </div>
  );
};
