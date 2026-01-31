import React, { useState } from 'react';
import { Sparkles, Copy, RefreshCw, Check, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useToast } from '@/hooks/use-toast';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';

interface AIProposalWriterProps {
  jobTitle: string;
  jobDescription: string;
  jobBudget?: string;
  jobSkills?: string[];
  onProposalGenerated?: (proposal: string) => void;
  className?: string;
}

type ToneOption = 'professional' | 'friendly' | 'confident';

const AIProposalWriter: React.FC<AIProposalWriterProps> = ({
  jobTitle,
  jobDescription,
  jobBudget,
  jobSkills,
  onProposalGenerated,
  className
}) => {
  const { toast } = useToast();
  const { profile } = useProfile();
  const [proposal, setProposal] = useState('');
  const [loading, setLoading] = useState(false);
  const [tone, setTone] = useState<ToneOption>('professional');
  const [copied, setCopied] = useState(false);

  const generateProposal = async () => {
    if (!profile?.full_name) {
      toast({
        title: "Profile required",
        description: "Please complete your profile first",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      // Get skills from profession field or other available data
      const freelancerSkills = profile.profession ? [profile.profession] : [];
      
      const { data, error } = await supabase.functions.invoke('ai-proposal-writer', {
        body: {
          jobTitle,
          jobDescription,
          jobBudget,
          jobSkills,
          freelancerName: profile.full_name,
          freelancerProfession: profile.profession,
          freelancerSkills,
          freelancerExperience: profile.bio,
          tone
        }
      });
      if (error) throw error;

      if (data?.success && data.proposal) {
        setProposal(data.proposal);
        onProposalGenerated?.(data.proposal);
        toast({
          title: "Proposal generated! ✨",
          description: `${data.wordCount} words - Ready to customize`
        });
      } else {
        throw new Error(data?.error || 'Failed to generate proposal');
      }
    } catch (error: any) {
      console.error('Proposal generation error:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Please try again",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(proposal);
      setCopied(true);
      toast({ title: "Copied to clipboard!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  return (
    <Card className={`border-primary/20 bg-gradient-to-br from-primary/5 to-background ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Wand2 className="h-4 w-4 text-primary" />
          </div>
          AI Proposal Writer
          <Badge variant="secondary" className="text-xs ml-auto">Beta</Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Tone selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-2 block">
            Choose your tone:
          </label>
          <ToggleGroup 
            type="single" 
            value={tone} 
            onValueChange={(v) => v && setTone(v as ToneOption)}
            className="justify-start"
          >
            <ToggleGroupItem value="professional" className="text-xs h-8 px-3">
              💼 Professional
            </ToggleGroupItem>
            <ToggleGroupItem value="friendly" className="text-xs h-8 px-3">
              😊 Friendly
            </ToggleGroupItem>
            <ToggleGroupItem value="confident" className="text-xs h-8 px-3">
              💪 Confident
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {/* Generate button */}
        <Button
          onClick={generateProposal}
          disabled={loading}
          className="w-full gap-2"
        >
          {loading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              Crafting your proposal...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate Winning Proposal
            </>
          )}
        </Button>

        {/* Generated proposal */}
        {proposal && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Your AI-crafted proposal:</span>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={generateProposal}
                  disabled={loading}
                  className="h-7 px-2 text-xs"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={copyToClipboard}
                  className="h-7 px-2 text-xs"
                >
                  {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
            
            <Textarea
              value={proposal}
              onChange={(e) => setProposal(e.target.value)}
              className="min-h-[200px] text-sm bg-background"
              placeholder="Your proposal will appear here..."
            />
            
            <p className="text-xs text-muted-foreground text-center">
              💡 Tip: Edit the proposal to add personal touches before submitting
            </p>
          </div>
        )}

        {!proposal && !loading && (
          <p className="text-xs text-muted-foreground text-center py-2">
            Let AI craft a compelling proposal based on your profile and the job requirements
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default AIProposalWriter;
