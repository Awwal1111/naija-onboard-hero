import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Calendar, Users, Target, CheckCircle, Clock, FileText, Send, Share2, Copy } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function FundraisingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [contributeOpen, setContributeOpen] = useState(false);
  const [amount, setAmount] = useState("");

  const shareUrl = `${window.location.origin}/fundraising/${id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied!",
      description: "Fundraising link copied to clipboard",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: campaign?.title || "Support this campaign",
          text: campaign?.description || "Help support this fundraising campaign",
          url: shareUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const requestReleaseMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase.rpc("request_fundraising_release", {
        p_fundraising_id: id,
        p_user_id: user.id,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Request failed");
      }
    },
    onSuccess: () => {
      toast({
        title: "Release request submitted!",
        description: "Admin will review and release funds within 3-5 business days",
      });
      queryClient.invalidateQueries({ queryKey: ["fundraising", id] });
    },
    onError: (error: any) => {
      toast({
        title: "Request failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: campaign, isLoading } = useQuery({
    queryKey: ["fundraising", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fundraisings")
        .select(`
          *,
          profiles:user_id (full_name, profile_picture_url)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: contributions } = useQuery({
    queryKey: ["contributions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fundraising_contributions")
        .select(`
          *,
          profiles:contributor_id (full_name, profile_picture_url)
        `)
        .eq("fundraising_id", id)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const { data: updates } = useQuery({
    queryKey: ["fundraising-updates", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fundraising_updates")
        .select("*")
        .eq("fundraising_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const contributeMutation = useMutation({
    mutationFn: async (contributionAmount: number) => {
      if (!user) throw new Error("Please log in to contribute");
      
      if (campaign?.is_demo) {
        throw new Error("This is a demo fundraising campaign and cannot accept real contributions.");
      }

      const { data, error } = await supabase.rpc("contribute_to_fundraising", {
        p_fundraising_id: id,
        p_contributor_id: user.id,
        p_amount: contributionAmount,
      });

      if (error) throw error;

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        throw new Error(result.error || "Contribution failed");
      }
    },
    onSuccess: () => {
      toast({
        title: "Contribution successful!",
        description: "Thank you for your support",
      });
      queryClient.invalidateQueries({ queryKey: ["fundraising", id] });
      queryClient.invalidateQueries({ queryKey: ["contributions", id] });
      setContributeOpen(false);
      setAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Contribution failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!campaign) {
    return <div className="container mx-auto px-4 py-8">Campaign not found</div>;
  }

  const isOwner = user?.id === campaign.user_id;
  const progress = (campaign.raised_amount / campaign.goal_amount) * 100;
  const daysLeft = campaign.deadline
    ? Math.max(0, Math.ceil((new Date(campaign.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button onClick={() => navigate("/fundraising")} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Campaigns
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {campaign.featured_image_url && (
              <img
                src={campaign.featured_image_url}
                alt={campaign.title}
                className="w-full h-96 object-cover rounded-lg"
              />
            )}

            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{campaign.title}</h1>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {campaign.is_demo && (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                        DEMO CAMPAIGN
                      </Badge>
                    )}
                    {campaign.category && <Badge variant="outline">{campaign.category}</Badge>}
                    {campaign.is_verified && (
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {campaign.location && (
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="w-4 h-4" />
                  <span>{campaign.location}</span>
                </div>
              )}

              <p className="text-lg mb-6">{campaign.description}</p>

              {campaign.detailed_story && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Campaign Story</h2>
                  <p className="whitespace-pre-wrap">{campaign.detailed_story}</p>
                </div>
              )}

              {campaign.beneficiary_name && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Beneficiary Information</h2>
                  <p>
                    <strong>Name:</strong> {campaign.beneficiary_name}
                  </p>
                  {campaign.beneficiary_relationship && (
                    <p>
                      <strong>Relationship:</strong> {campaign.beneficiary_relationship}
                    </p>
                  )}
                </div>
              )}

              {campaign.fund_usage_breakdown && Array.isArray(campaign.fund_usage_breakdown) && campaign.fund_usage_breakdown.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Fund Usage Breakdown</h2>
                  <div className="space-y-2">
                    {campaign.fund_usage_breakdown.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                        <span>{item.description}</span>
                        <span className="font-semibold">₦{item.amount?.toLocaleString()}NC</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {campaign.risks_challenges && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Risks & Challenges</h2>
                  <p className="whitespace-pre-wrap">{campaign.risks_challenges}</p>
                </div>
              )}

              {updates && updates.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Campaign Updates</h2>
                  <div className="space-y-4">
                    {updates.map((update: any) => (
                      <Card key={update.id} className="p-4">
                        <h3 className="font-semibold mb-2">{update.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {format(new Date(update.created_at), "PPP")}
                        </p>
                        <p>{update.content}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-2xl font-bold">₦{campaign.raised_amount?.toLocaleString() || 0}NC</span>
                    <span className="text-muted-foreground">of ₦{campaign.goal_amount?.toLocaleString()}NC</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    <span className="font-medium">{campaign.backer_count || 0} backers</span>
                  </div>
                  {daysLeft !== null && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span className="font-medium">{daysLeft} days left</span>
                    </div>
                  )}
                </div>

                {campaign.minimum_contribution && (
                  <p className="text-sm text-muted-foreground">
                    Minimum contribution: ₦{campaign.minimum_contribution}NC
                  </p>
                )}

                {/* Fund Status Info */}
                {campaign.funds_held_by_admin && (
                  <div className="bg-primary/10 p-3 rounded-lg text-sm">
                    <p className="font-medium text-primary mb-1">🔒 Funds Protected</p>
                    <p className="text-xs text-muted-foreground">
                      All contributions held securely by admin until release
                    </p>
                  </div>
                )}

                {campaign.funds_release_requested && !campaign.funds_released_at && (
                  <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200 mb-1">⏳ Release Pending</p>
                    <p className="text-xs text-muted-foreground">
                      Admin reviewing release request
                    </p>
                  </div>
                )}

                {campaign.funds_released_at && (
                  <div className="bg-green-100 dark:bg-green-900/20 p-3 rounded-lg text-sm">
                    <p className="font-medium text-green-800 dark:text-green-200 mb-1">✅ Funds Released</p>
                    <p className="text-xs text-muted-foreground">
                      Released on {format(new Date(campaign.funds_released_at), "PPP")}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                {campaign.is_demo ? (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-500/50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">⚠️ Demo Campaign</p>
                    <p className="text-xs text-muted-foreground">
                      This is a demonstration campaign and cannot accept real contributions. Only real campaigns can receive funds.
                    </p>
                  </div>
                ) : isOwner && campaign.funds_held_by_admin && !campaign.funds_release_requested ? (
                  <Button 
                    onClick={() => requestReleaseMutation.mutate()}
                    disabled={requestReleaseMutation.isPending}
                    className="w-full" 
                    size="lg"
                    variant="outline"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {requestReleaseMutation.isPending ? "Requesting..." : "Request Fund Release"}
                  </Button>
                ) : !isOwner && progress < 100 ? (
                  <Button onClick={() => setContributeOpen(true)} className="w-full" size="lg">
                    Contribute Now
                  </Button>
                ) : !isOwner && progress >= 100 ? (
                  <Button disabled className="w-full" size="lg">
                    Goal Reached
                  </Button>
                ) : null}

                <Separator />

                {/* Share Section */}
                <div className="space-y-2">
                  <p className="text-sm font-medium">Share this campaign</p>
                  <div className="flex gap-2">
                    <Button onClick={handleShare} variant="outline" size="sm" className="flex-1">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                    <Button onClick={handleCopyLink} variant="outline" size="sm" className="flex-1">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                </div>

                <Separator />

                {contributions && contributions.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Recent Contributions</h3>
                    <div className="space-y-3">
                      {contributions.slice(0, 5).map((contribution: any) => (
                        <div key={contribution.id} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            {contribution.profiles?.profile_picture_url ? (
                              <img
                                src={contribution.profiles.profile_picture_url}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                {contribution.profiles?.full_name?.[0] || "A"}
                              </div>
                            )}
                            <span>{contribution.profiles?.full_name || "Anonymous"}</span>
                          </div>
                          <span className="font-semibold">₦{contribution.amount?.toLocaleString()}NC</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Contribute Dialog */}
      <Dialog open={contributeOpen} onOpenChange={setContributeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contribute to Campaign</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount (₦NC)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Min: ₦${campaign.minimum_contribution || 10}NC`}
                min={campaign.minimum_contribution || 10}
              />
            </div>
            <Button
              onClick={() => {
                const amountNum = parseFloat(amount);
                if (!amountNum || amountNum < (campaign.minimum_contribution || 10)) {
                  toast({
                    title: "Invalid amount",
                    description: `Minimum contribution is ₦${campaign.minimum_contribution || 10}NC`,
                    variant: "destructive",
                  });
                  return;
                }
                contributeMutation.mutate(amountNum);
              }}
              disabled={contributeMutation.isPending}
              className="w-full"
            >
              {contributeMutation.isPending ? "Processing..." : "Contribute"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
