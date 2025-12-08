import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { User, Briefcase, FileText, GraduationCap, Heart, AlertCircle, Banknote, Gift, BarChart3, Settings, Video, Wallet, Bookmark, Search } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface MoreMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MoreMenuDrawer = ({ open, onOpenChange }: MoreMenuDrawerProps) => {
  const navigate = useNavigate();

  const primaryItems = [
    { icon: BarChart3, label: "Dashboard", path: "/dashboard", color: "text-primary", description: "Analytics & insights" },
    { icon: User, label: "Profile", path: "/profile", color: "text-blue-500", description: "Your profile" },
    { icon: Wallet, label: "Wallet", path: "/profile", color: "text-emerald-500", description: "Balance & transactions" },
    { icon: Bookmark, label: "Saved Items", path: "/bookmarks", color: "text-amber-500", description: "Jobs, experts, courses" },
    { icon: Search, label: "Search", path: "/search", color: "text-cyan-500", description: "Find anything" },
  ];

  const businessItems = [
    { icon: Briefcase, label: "Jobs & Gigs", path: "/jobs", color: "text-purple-500" },
    { icon: Video, label: "Expert Classes", path: "/expert-class", color: "text-indigo-500" },
    { icon: GraduationCap, label: "Courses", path: "/courses", color: "text-orange-500" },
    { icon: FileText, label: "Digital Products", path: "/digital-products", color: "text-green-500" },
    { icon: Heart, label: "Fundraising", path: "/fundraising", color: "text-red-500" },
  ];

  const otherItems = [
    { icon: AlertCircle, label: "Emergency", path: "/emergency", color: "text-yellow-500" },
    { icon: Banknote, label: "Loan", path: "/loan", color: "text-indigo-500" },
    { icon: Gift, label: "Donations", path: "/donations", color: "text-pink-500" },
    { icon: Settings, label: "Settings", path: "/settings", color: "text-gray-500" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[300px] sm:w-[380px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Primary Actions */}
          <div className="space-y-1">
            {primaryItems.map((item) => (
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

          <Separator />

          {/* Business Section */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">Business</h3>
            <div className="space-y-1">
              {businessItems.map((item) => (
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

          {/* Other */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-3">More</h3>
            <div className="space-y-1">
              {otherItems.map((item) => (
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
        </div>
      </SheetContent>
    </Sheet>
  );
};
