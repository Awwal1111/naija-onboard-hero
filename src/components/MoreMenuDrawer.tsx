import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Briefcase, FileText, GraduationCap, Heart, AlertCircle, Banknote, Gift, BarChart3, Settings, Video, Wallet, Bookmark, Search, Trophy, Bell, Package, Sparkles, Users, FolderKanban, Timer, UserCheck, Award, Bot, PlusCircle, Target, ShoppingBag, Bug, HelpCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useRoleFeatures } from "@/hooks/useRoleFeatures";
import { Badge } from "@/components/ui/badge";
import BugReportDialog from "@/components/BugReportDialog";

interface MoreMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MoreMenuDrawer = ({ open, onOpenChange }: MoreMenuDrawerProps) => {
  const navigate = useNavigate();
  const { mode, isFreelancer, isClient } = useRoleFeatures();
  const [showBugReport, setShowBugReport] = useState(false);

  // Role labels for display
  const modeLabel = mode === 'freelancer' ? 'Freelancer' : mode === 'client' ? 'Client' : 'Freelancer & Client';
  const modeColor = mode === 'freelancer' ? 'bg-emerald-500' : mode === 'client' ? 'bg-blue-500' : 'bg-purple-500';

  const primaryItems = [
    { icon: BarChart3, label: "Dashboard", path: "/dashboard", color: "text-primary", description: "Analytics & insights", forRoles: ['freelancer', 'both'] },
    { icon: Target, label: "Hiring Hub", path: "/client-dashboard", color: "text-blue-500", description: "Manage your hires", forRoles: ['client', 'both'] },
    { icon: Bell, label: "Notifications", path: "/notifications", color: "text-rose-500", description: "All your alerts", forRoles: ['freelancer', 'client', 'both'] },
    { icon: User, label: "Profile", path: "/profile", color: "text-blue-500", description: "Your profile", forRoles: ['freelancer', 'client', 'both'] },
    { icon: Wallet, label: "Wallet", path: "/earn", color: "text-emerald-500", description: "Balance & transactions", forRoles: ['freelancer', 'client', 'both'] },
    { icon: Bookmark, label: "Saved Items", path: "/bookmarks", color: "text-amber-500", description: "Jobs, experts, courses", forRoles: ['freelancer', 'client', 'both'] },
    { icon: Search, label: "Search", path: "/search", color: "text-cyan-500", description: "Find anything", forRoles: ['freelancer', 'client', 'both'] },
  ];

  // Freelancer-focused items
  const freelancerItems = [
    { icon: Briefcase, label: "My Gigs", path: "/my-gigs", color: "text-purple-500", description: "Manage your services" },
    { icon: Search, label: "Find Jobs", path: "/jobs", color: "text-blue-500", description: "Browse job listings" },
    { icon: Video, label: "Expert Classes", path: "/expert-class", color: "text-indigo-500", description: "Teach live classes" },
    { icon: GraduationCap, label: "Create Courses", path: "/courses", color: "text-orange-500", description: "Sell your knowledge" },
    { icon: ShoppingBag, label: "Sell Products", path: "/digital-products", color: "text-green-500", description: "Digital products" },
    { icon: Trophy, label: "Contests", path: "/contests", color: "text-yellow-500", description: "Compete for prizes" },
    { icon: Award, label: "Get Verified", path: "/expert-verification", color: "text-primary", description: "Earn badges" },
    { icon: Timer, label: "Work Diary", path: "/work-diary", color: "text-teal-500", description: "Track your time" },
  ];

  // Client-focused items
  const clientItems = [
    { icon: PlusCircle, label: "Post a Job", path: "/post-job", color: "text-emerald-500", description: "Hire freelancers" },
    { icon: Users, label: "Find Experts", path: "/experts", color: "text-blue-500", description: "Browse talent" },
    { icon: Bot, label: "AI Hire Assistant", path: "/ai-hire", color: "text-primary", description: "AI-powered matching" },
    { icon: Award, label: "Run Contest", path: "/contests", color: "text-yellow-500", description: "Crowdsource designs" },
  ];

  const sharedBusinessItems = [
    { icon: Package, label: "My Orders", path: "/orders", color: "text-teal-500" },
    { icon: FolderKanban, label: "WorkRooms", path: "/workrooms", color: "text-cyan-500" },
    { icon: Users, label: "Connections", path: "/connections", color: "text-indigo-500" },
  ];

  const learningItems = [
    { icon: GraduationCap, label: "Learn Hub", path: "/learn", color: "text-cyan-500", description: "Courses & paths" },
  ];

  const otherItems = [
    { icon: Trophy, label: "Leaderboard", path: "/leaderboard", color: "text-yellow-500", forRoles: ['freelancer', 'both'] },
    { icon: Gift, label: "Referrals", path: "/referrals", color: "text-pink-500", forRoles: ['freelancer', 'client', 'both'] },
    { icon: Heart, label: "Fundraising", path: "/fundraising", color: "text-red-500", forRoles: ['freelancer', 'client', 'both'] },
    { icon: AlertCircle, label: "Emergency", path: "/emergency", color: "text-amber-500", forRoles: ['freelancer', 'both'] },
    { icon: Banknote, label: "Loan", path: "/loan", color: "text-indigo-500", forRoles: ['freelancer', 'both'] },
    { icon: Gift, label: "Donations", path: "/donations", color: "text-pink-500", forRoles: ['freelancer', 'client', 'both'] },
    { icon: HelpCircle, label: "Help Center", path: "/help", color: "text-blue-500", forRoles: ['freelancer', 'client', 'both'] },
    { icon: Settings, label: "Settings", path: "/settings", color: "text-muted-foreground", forRoles: ['freelancer', 'client', 'both'] },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  // Filter items based on role
  const filterByRole = (items: any[]) => {
    return items.filter(item => {
      if (!item.forRoles) return true;
      if (mode === 'both') return true;
      return item.forRoles.includes(mode) || item.forRoles.includes('both');
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[380px] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Menu</SheetTitle>
            <Badge className={`${modeColor} text-white text-xs`}>
              {modeLabel}
            </Badge>
          </div>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Primary Actions */}
          <div className="space-y-1">
            {filterByRole(primaryItems).map((item) => (
              <button
                key={item.path + item.label}
                onClick={() => handleNavigation(item.path)}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-colors"
              >
                <div className={`p-2 rounded-lg bg-primary/10 ${item.color}`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <span className="text-sm font-medium block">{item.label}</span>
                  {item.description && (
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          <Separator />

          {/* Freelancer Section - Only visible to freelancers */}
          {isFreelancer && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  Freelancer Tools
                </h3>
                <div className="space-y-1">
                  {freelancerItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-colors"
                    >
                      <div className={`p-2 rounded-lg bg-primary/10 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium block">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Client Section - Only visible to clients */}
          {isClient && (
            <>
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">
                  Hiring Tools
                </h3>
                <div className="space-y-1">
                  {clientItems.map((item) => (
                    <button
                      key={item.path}
                      onClick={() => handleNavigation(item.path)}
                      className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-colors"
                    >
                      <div className={`p-2 rounded-lg bg-primary/10 ${item.color}`}>
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div className="text-left">
                        <span className="text-sm font-medium block">{item.label}</span>
                        {item.description && (
                          <span className="text-xs text-muted-foreground">{item.description}</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <Separator />
            </>
          )}

          {/* Shared Business Items */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">Business</h3>
            <div className="space-y-1">
              {sharedBusinessItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Learning Section */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">Learn</h3>
            <div className="space-y-1">
              {learningItems.map((item) => (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-accent transition-colors"
                >
                  <div className={`p-2 rounded-lg bg-primary/10 ${item.color}`}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div className="text-left">
                    <span className="text-sm font-medium block">{item.label}</span>
                    {item.description && (
                      <span className="text-xs text-muted-foreground">{item.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <Separator />

          {/* Other */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">More</h3>
            <div className="space-y-1">
              {filterByRole(otherItems).map((item) => (
                <button
                  key={item.path + item.label}
                  onClick={() => handleNavigation(item.path)}
                  className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
                >
                  <item.icon className={`h-5 w-5 ${item.color}`} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              ))}
              
              {/* Bug Report Button */}
              <button
                onClick={() => {
                  setShowBugReport(true);
                  onOpenChange(false);
                }}
                className="w-full flex items-center gap-4 p-3 rounded-lg hover:bg-accent transition-colors"
              >
                <Bug className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">Report a Bug</span>
              </button>
            </div>
          </div>
        </div>
      </SheetContent>
      
      {/* Bug Report Dialog */}
      <BugReportDialog 
        isOpen={showBugReport} 
        onOpenChange={setShowBugReport} 
      />
    </Sheet>
  );
};
