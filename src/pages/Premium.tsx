import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Crown, Check, MessageSquare, Phone, Mail, Video, Sparkles, Zap, TrendingUp, Star } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { PremiumSubscriptionDialog } from "@/components/PremiumSubscriptionDialog";

export default function Premium() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const loadProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("wallet_balance, is_premium, premium_expires_at")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setBalance(Number(data.wallet_balance || 0));
      setIsPremium(Boolean(data.is_premium));
      setExpiresAt(data.premium_expires_at || null);
    }
  };

  useEffect(() => { loadProfile(); }, [user?.id]);

  const features = [
    { icon: Sparkles, title: "Premium Crown Badge", desc: "Stand out everywhere on the platform with the gold Crown verified-pro badge." },
    { icon: TrendingUp, title: "Priority Search Ranking", desc: "Your gigs, profile and experts appear above non-premium results — more visibility, more orders." },
    { icon: MessageSquare, title: "WhatsApp Direct Button", desc: "Show a WhatsApp shortcut on your profile so clients can reach you instantly." },
    { icon: Video, title: "Google Meet Link", desc: "Display a Google Meet link for instant video consultations from your profile." },
    { icon: Phone, title: "SMS Job Alerts", desc: "Get instant SMS when a client messages you or posts a matching job (10 NC/SMS — premium-only)." },
    { icon: Mail, title: "Email Notifications", desc: "Daily digest + instant emails for messages, orders, and job invites." },
    { icon: Zap, title: "Portfolio Videos", desc: "Upload videos to your portfolio (non-premium accounts are images only)." },
    { icon: Star, title: "Trusted Pro Verification", desc: "Premium feeds into your Trust Score — clients see you as a vetted professional." },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-yellow-500/5">
      <Helmet>
        <title>Premium — Unlock Pro Tools on NaijaLancers</title>
        <meta name="description" content="Upgrade to NaijaLancers Premium for ₦2,000/month. Priority search ranking, WhatsApp & Meet links, SMS alerts, video portfolio, and the gold Crown badge." />
        <link rel="canonical" href="https://naijalancers.name.ng/premium" />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <header className="text-center space-y-3">
          <Badge className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30">
            <Crown className="h-3 w-3 mr-1" /> Premium
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Earn more. Get hired faster.
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Premium unlocks the tools top freelancers and serious clients use to stand out, communicate directly, and close more deals on NaijaLancers.
          </p>

          {isPremium && expiresAt && (
            <div className="inline-flex items-center gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-full px-4 py-1.5 text-sm">
              <Check className="h-4 w-4 text-yellow-600" />
              <span>Premium active — renews {new Date(expiresAt).toLocaleDateString()}</span>
            </div>
          )}
        </header>

        {/* Pricing */}
        <Card className="border-yellow-500/30 bg-gradient-to-br from-yellow-500/5 to-amber-500/5">
          <CardContent className="p-6 text-center space-y-4">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-bold">₦2,000</span>
              <span className="text-muted-foreground">/month</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Pay with your NC wallet balance. Save with 3- or 6-month plans inside.
            </p>
            <BrandButton
              size="lg"
              className="w-full sm:w-auto bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold"
              onClick={() => {
                if (!user) { navigate("/login?redirect=/premium"); return; }
                setOpen(true);
              }}
            >
              <Crown className="h-4 w-4 mr-2" />
              {isPremium ? "Extend Premium" : "Subscribe Now"}
            </BrandButton>
            {user && (
              <p className="text-xs text-muted-foreground">Wallet balance: ₦{balance.toLocaleString()} NC</p>
            )}
          </CardContent>
        </Card>

        {/* Feature grid */}
        <section>
          <h2 className="text-xl font-semibold mb-4">What you unlock</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {features.map((f) => (
              <Card key={f.title} className="border-border/50">
                <CardContent className="p-4 flex gap-3">
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <f.icon className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="space-y-0.5">
                    <h3 className="font-medium text-sm">{f.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ short */}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold">FAQ</h2>
          <details className="border rounded-lg p-3">
            <summary className="font-medium text-sm cursor-pointer">How is Premium billed?</summary>
            <p className="text-sm text-muted-foreground mt-2">Premium is deducted from your NC wallet balance for the months you choose (1, 3 or 6). No auto-renew — you renew manually when it expires.</p>
          </details>
          <details className="border rounded-lg p-3">
            <summary className="font-medium text-sm cursor-pointer">Can I cancel?</summary>
            <p className="text-sm text-muted-foreground mt-2">Yes. Premium is non-recurring — simply don't renew. Active months remain valid until the expiry date.</p>
          </details>
          <details className="border rounded-lg p-3">
            <summary className="font-medium text-sm cursor-pointer">Do I still pay platform fees on orders?</summary>
            <p className="text-sm text-muted-foreground mt-2">The standard 5% platform fee on digital products and courses still applies. Premium boosts visibility and communication — it does not waive fees.</p>
          </details>
        </section>

        {/* Bottom CTA */}
        <div className="text-center pt-2 pb-4">
          <BrandButton
            size="lg"
            className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold"
            onClick={() => {
              if (!user) { navigate("/login?redirect=/premium"); return; }
              setOpen(true);
            }}
          >
            <Crown className="h-4 w-4 mr-2" />
            {isPremium ? "Extend Premium" : "Get Premium for ₦2,000"}
          </BrandButton>
        </div>
      </div>

      <PremiumSubscriptionDialog
        open={open}
        onOpenChange={setOpen}
        currentBalance={balance}
        isPremium={isPremium}
        premiumExpiresAt={expiresAt}
        onSuccess={loadProfile}
      />
    </div>
  );
}
