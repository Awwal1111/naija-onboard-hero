import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useNavigate } from "react-router-dom";
import { User, Briefcase, FileText, GraduationCap, Heart, AlertCircle, Banknote, Gift, Phone } from "lucide-react";

interface MoreMenuDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MoreMenuDrawer = ({ open, onOpenChange }: MoreMenuDrawerProps) => {
  const navigate = useNavigate();

  const menuItems = [
    { icon: User, label: "Profile", path: "/profile", color: "text-blue-500" },
    { icon: Briefcase, label: "Jobs", path: "/jobs-enhanced", color: "text-purple-500" },
    { icon: Phone, label: "Call History", path: "/call-history", color: "text-green-500" },
    { icon: FileText, label: "Digital Products", path: "/digital-products", color: "text-green-500" },
    { icon: GraduationCap, label: "Courses", path: "/courses", color: "text-orange-500" },
    { icon: Heart, label: "Fundraising", path: "/fundraising", color: "text-red-500" },
    { icon: AlertCircle, label: "Emergency", path: "/emergency", color: "text-yellow-500" },
    { icon: Banknote, label: "Loan", path: "/loan", color: "text-indigo-500" },
    { icon: Gift, label: "Donations", path: "/donations", color: "text-pink-500" },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[280px] sm:w-[350px]">
        <SheetHeader>
          <SheetTitle>More Options</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-2">
          {menuItems.map((item) => (
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
      </SheetContent>
    </Sheet>
  );
};
