import { MessageSquare, Share2, Users } from 'lucide-react'
import { BrandButton } from '@/components/ui/brand-button'

export const WhatsAppShareCTA = () => {
  const shareMessage = encodeURIComponent(
    `🚀 I'm using NaijaLancers - a trusted freelance marketplace with secure escrow payments!\n\n` +
    `✅ Find jobs & earn money\n` +
    `✅ Hire verified experts\n` +
    `✅ SafePay escrow protection\n\n` +
    `Join free 👉 https://naija-onboard-hero.lovable.app/signup`
  )

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${shareMessage}`, '_blank')
  }

  const handleTelegramShare = () => {
    const telegramMessage = encodeURIComponent(
      `🚀 Join NaijaLancers - trusted freelance marketplace with secure payments!\n\nJoin free 👉 https://naija-onboard-hero.lovable.app/signup`
    )
    window.open(`https://t.me/share/url?url=https://naija-onboard-hero.lovable.app/signup&text=${telegramMessage}`, '_blank')
  }

  return (
    <section className="py-12 sm:py-16 bg-gradient-to-r from-[hsl(142,70%,45%)]/10 via-background to-[hsl(200,80%,50%)]/10">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[hsl(142,70%,45%)]/10 text-[hsl(142,70%,45%)] rounded-full px-4 py-2 text-sm font-medium mb-6">
            <Users className="w-4 h-4" />
            Help your friends earn too
          </div>
          
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-3">
            Know Someone Who Needs This?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
            Share NaijaLancers with your friends on WhatsApp or Telegram. Help them start earning today.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <BrandButton
              onClick={handleWhatsAppShare}
              size="lg"
              className="bg-[hsl(142,70%,45%)] hover:bg-[hsl(142,70%,40%)] text-white px-8 py-6 text-base shadow-lg"
            >
              <MessageSquare className="mr-2 w-5 h-5" />
              Share on WhatsApp
            </BrandButton>
            <BrandButton
              onClick={handleTelegramShare}
              variant="outline"
              size="lg"
              className="px-8 py-6 text-base border-2"
            >
              <Share2 className="mr-2 w-5 h-5" />
              Share on Telegram
            </BrandButton>
          </div>
        </div>
      </div>
    </section>
  )
}
