import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Briefcase, DollarSign, Clock, ThumbsUp, HelpCircle } from 'lucide-react';

interface QuickReplyTemplatesProps {
  onSelect: (text: string) => void;
  context?: 'general' | 'job' | 'gig' | 'expert';
}

const QUICK_REPLIES = {
  general: [
    { icon: ThumbsUp, text: "Thanks for reaching out! I'll get back to you shortly.", label: "Acknowledge" },
    { icon: Clock, text: "I'm currently busy but will respond within 24 hours.", label: "Busy" },
    { icon: HelpCircle, text: "Could you provide more details about your project?", label: "More Info" },
    { icon: MessageSquare, text: "Let's schedule a quick call to discuss further.", label: "Schedule Call" },
  ],
  job: [
    { icon: ThumbsUp, text: "I'm interested in this opportunity! When can we discuss further?", label: "Interested" },
    { icon: Briefcase, text: "I have experience with similar projects. Here's my portfolio:", label: "Share Portfolio" },
    { icon: DollarSign, text: "What's the budget range for this project?", label: "Ask Budget" },
    { icon: Clock, text: "What's your timeline for this project?", label: "Ask Timeline" },
  ],
  gig: [
    { icon: ThumbsUp, text: "Thank you for your order! I'll begin working on it right away.", label: "Order Accepted" },
    { icon: Clock, text: "I'll deliver your order within the agreed timeframe.", label: "Confirm Delivery" },
    { icon: HelpCircle, text: "Could you clarify the requirements for this order?", label: "Clarify" },
    { icon: MessageSquare, text: "Here's a preview of what I've worked on so far:", label: "Share Preview" },
  ],
  expert: [
    { icon: ThumbsUp, text: "I'd be happy to help with your project!", label: "Accept" },
    { icon: DollarSign, text: "Based on your requirements, here's my quote:", label: "Send Quote" },
    { icon: Clock, text: "I'm available to start next week. Does that work for you?", label: "Availability" },
    { icon: Briefcase, text: "Let me share some similar projects I've completed:", label: "Portfolio" },
  ],
};

export function QuickReplyTemplates({ onSelect, context = 'general' }: QuickReplyTemplatesProps) {
  const replies = QUICK_REPLIES[context] || QUICK_REPLIES.general;

  return (
    <div className="flex flex-wrap gap-2 p-2 bg-muted/30 rounded-lg border border-border/50">
      <span className="text-xs text-muted-foreground w-full mb-1">Quick Replies:</span>
      {replies.map((reply, idx) => {
        const Icon = reply.icon;
        return (
          <Button
            key={idx}
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1 bg-background hover:bg-primary/10"
            onClick={() => onSelect(reply.text)}
          >
            <Icon className="h-3 w-3" />
            {reply.label}
          </Button>
        );
      })}
    </div>
  );
}
