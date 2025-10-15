import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

const faqData: FAQItem[] = [
  {
    category: "Getting Started",
    question: "What is NaijaLancers?",
    answer: "NaijaLancers is a comprehensive platform connecting Nigerian professionals, freelancers, and businesses. It offers job opportunities, expert services, fundraising, courses, digital products, and various ways to earn money online."
  },
  {
    category: "Getting Started",
    question: "How do I create an account?",
    answer: "Click on 'Sign Up' on the welcome page, enter your email, password, and full name. After signing up, complete your profile with your profession, location, and skills to get the most out of the platform."
  },
  {
    category: "Wallet & Payments",
    question: "What is NC (NaijaCoin)?",
    answer: "NC is the platform's internal currency. 1 NC = ₦1. You can earn NC through various activities and use it for services, products, or withdraw it to your bank account."
  },
  {
    category: "Wallet & Payments",
    question: "How do I add money to my wallet?",
    answer: "Go to your wallet, click 'Deposit', enter the amount, and complete payment through Paystack. Funds are instantly credited to your account."
  },
  {
    category: "Wallet & Payments",
    question: "How do I withdraw money?",
    answer: "Navigate to your wallet, click 'Withdraw', enter your bank details and amount (minimum ₦1000). Withdrawals are processed within 24-48 hours."
  },
  {
    category: "Wallet & Payments",
    question: "What is SafePay?",
    answer: "SafePay is our secure escrow system. When you propose a SafePay, funds are locked until work is completed. The buyer releases funds only when satisfied, protecting both parties."
  },
  {
    category: "Earning Money",
    question: "How can I earn money on NaijaLancers?",
    answer: "Multiple ways: Complete social media tasks, answer surveys, refer friends, create and sell courses/digital products, offer expert services, post jobs, daily sign-in bonuses, and play games."
  },
  {
    category: "Earning Money",
    question: "What are Social Media Tasks?",
    answer: "These are simple tasks like following accounts, liking posts, or sharing content. Create tasks to grow your social media or complete tasks from others to earn NC."
  },
  {
    category: "Earning Money",
    question: "How does the referral program work?",
    answer: "Share your unique referral code. When someone signs up and reaches ₦1000 wallet balance, you earn 100 NC. Complete special referral tasks for bigger rewards."
  },
  {
    category: "Earning Money",
    question: "What is the Daily Sign-in bonus?",
    answer: "Sign in daily to earn 5 NC. Consecutive sign-ins may unlock streak bonuses and special rewards."
  },
  {
    category: "Jobs & Services",
    question: "How do I hire an expert?",
    answer: "Browse experts by skill category, view their profiles and ratings, then message them directly. Use SafePay for secure payment protection."
  },
  {
    category: "Jobs & Services",
    question: "How do I become a verified expert?",
    answer: "Go to Expert Application, fill in your details, provide work samples and portfolio. Admin reviews applications within 3-5 business days. Verified experts get a badge and priority visibility."
  },
  {
    category: "Jobs & Services",
    question: "How do I post a job?",
    answer: "Click 'Post Job', fill in job details, budget, and requirements. Jobs are visible to all users. You'll receive applications directly in your messages."
  },
  {
    category: "Fundraising",
    question: "How does fundraising work?",
    answer: "Create a campaign with your goal, story, and fund breakdown. Admin reviews and approves campaigns. All contributions go to admin wallet first for security. Once your goal is reached, request fund release from admin."
  },
  {
    category: "Fundraising",
    question: "Can anyone contribute to fundraising campaigns?",
    answer: "Yes! Fundraising campaigns are publicly accessible. Anyone can view and share campaigns, but only registered users can contribute."
  },
  {
    category: "Fundraising",
    question: "Why are contributions held by admin?",
    answer: "This protects both campaigners and contributors. Admin verifies campaign legitimacy and ensures funds are released appropriately. This prevents fraud and builds trust."
  },
  {
    category: "Fundraising",
    question: "How do I get my fundraising money?",
    answer: "Once your campaign reaches its goal or deadline, request fund release from your campaign dashboard. Admin reviews and releases funds within 3-5 business days."
  },
  {
    category: "Digital Products & Courses",
    question: "Can I sell digital products?",
    answer: "Yes! Upload ebooks, templates, graphics, software, or any digital content. Set your price and earn NC from each sale. Platform keeps a small commission."
  },
  {
    category: "Digital Products & Courses",
    question: "How do I create a course?",
    answer: "Go to Courses → Create Course. Add lessons, videos, and materials. Set your price. Students pay to enroll and you earn NC. You can track enrollments and reviews."
  },
  {
    category: "Account & Security",
    question: "How do I secure my account?",
    answer: "Set up a 4-digit transaction PIN in Settings for wallet operations. Never share your PIN or password. Enable two-factor authentication when available."
  },
  {
    category: "Account & Security",
    question: "What if I forget my password?",
    answer: "Click 'Forgot Password' on the login page, enter your email, and follow the reset instructions sent to your inbox."
  },
  {
    category: "Account & Security",
    question: "How do I block someone?",
    answer: "Open chat with the user, click their profile, and select 'Block User'. Blocked users cannot message you or view your activity."
  },
  {
    category: "Emergency & Loans",
    question: "What is the Emergency Fund?",
    answer: "For urgent financial needs, request emergency funds by explaining your situation. Admin reviews genuine cases and may provide assistance. This is different from regular withdrawals."
  },
  {
    category: "Emergency & Loans",
    question: "Can I get a loan?",
    answer: "Yes, based on your activity and trustworthiness on the platform. Apply for a loan with amount and reason. Admin reviews and approves qualified users."
  },
  {
    category: "Community & Support",
    question: "How do I connect with other professionals?",
    answer: "Browse profiles, send connection requests, and build your network. Connected users can see more of your profile and communicate easily."
  },
  {
    category: "Community & Support",
    question: "What if I encounter a problem?",
    answer: "Contact admin through the Help section in your profile menu. Provide details about the issue for faster resolution. Response time is typically 24 hours."
  },
  {
    category: "Community & Support",
    question: "Are there any fees?",
    answer: "Account creation and browsing are free. Platform charges: 5% on SafePay releases, 3% on card deposits (Paystack fees), small commission on digital product sales. Withdrawals above ₦1000 are free."
  }
];

const categories = Array.from(new Set(faqData.map(item => item.category)));

export default function FAQ() {
  const navigate = useNavigate();
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const filteredFAQs = selectedCategory === "all" 
    ? faqData 
    : faqData.filter(item => item.category === selectedCategory);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button onClick={() => navigate(-1)} variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-3">Frequently Asked Questions</h1>
          <p className="text-muted-foreground text-lg">
            Everything you need to know about NaijaLancers
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            onClick={() => setSelectedCategory("all")}
            size="sm"
          >
            All
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              onClick={() => setSelectedCategory(category)}
              size="sm"
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredFAQs.map((item, index) => (
            <Card key={index} className="overflow-hidden">
              <button
                onClick={() => toggleItem(index)}
                className="w-full text-left p-4 hover:bg-accent/50 transition-colors flex items-start justify-between gap-4"
              >
                <div className="flex-1">
                  <div className="text-xs text-primary font-medium mb-1">
                    {item.category}
                  </div>
                  <h3 className="font-semibold text-lg">{item.question}</h3>
                </div>
                {expandedItems.has(index) ? (
                  <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-1" />
                )}
              </button>
              {expandedItems.has(index) && (
                <div className="px-4 pb-4 text-muted-foreground">
                  {item.answer}
                </div>
              )}
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-6 bg-primary/5">
          <h3 className="font-semibold text-lg mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-4">
            Can't find what you're looking for? Contact our support team through your profile menu → Help section.
          </p>
          <Button onClick={() => navigate("/feed")}>
            Go to Dashboard
          </Button>
        </Card>
      </div>
    </div>
  );
}