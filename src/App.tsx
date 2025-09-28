import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import SmartAIAssistant from "@/components/SmartAIAssistant";
import WalletInitializer from "@/components/WalletInitializer";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import MainFeed from "./pages/MainFeed";
import Profile from "./pages/Profile";
import ExpertApplication from "./pages/ExpertApplication";
import AdminExpertApplications from "./pages/AdminExpertApplications";
import PostJob from "./pages/PostJob";
import Experts from "./pages/Experts";
import Jobs from "./pages/Jobs";
import Chat from './pages/Chat'
import ChatPage from "./pages/ChatPage";
import GroupChat from "./pages/GroupChat";
import Connections from "./pages/Connections";
import EnhancedEarn from "./pages/EnhancedEarn";
import { SocialMediaTasks } from "./pages/SocialMediaTasks";
import { Surveys } from "./pages/Surveys";
import { GuessNumberGame } from "./pages/GuessNumberGame";
import { Referrals } from "./pages/Referrals";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import { ReferralTasks } from "./pages/ReferralTasks";
import ExpertProfile from "./pages/ExpertProfile";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Settings from "./pages/Settings";
import ActivityLog from "./pages/ActivityLog";
import EnhancedAdminDashboard from "./pages/EnhancedAdminDashboard";
import NotFound from "./pages/NotFound";
import NigerianTrivia from "./components/NigerianTrivia";
import SpinWheelGame from "./components/SpinWheelGame";
import NaijaPredictor from "./components/NaijaPredictor";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WalletInitializer />
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><MainFeed /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/expert/:userId" element={<ProtectedRoute><ExpertProfile /></ProtectedRoute>} />
          <Route path="/expert-application" element={<ProtectedRoute><ExpertApplication /></ProtectedRoute>} />
          <Route path="/admin/expert-applications" element={<ProtectedRoute><AdminExpertApplications /></ProtectedRoute>} />
          <Route path="/admin/dashboard" element={<ProtectedRoute><EnhancedAdminDashboard /></ProtectedRoute>} />
          <Route path="/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
          <Route path="/experts" element={<ProtectedRoute><Experts /></ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
          <Route path="/games/guess-number" element={<ProtectedRoute><GuessNumberGame /></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
          <Route path="/earn" element={<ProtectedRoute><EnhancedEarn /></ProtectedRoute>} />
          <Route path="/earn/social-tasks" element={<ProtectedRoute><SocialMediaTasks /></ProtectedRoute>} />
          <Route path="/earn/referral-tasks" element={<ProtectedRoute><ReferralTasks /></ProtectedRoute>} />
          <Route path="/earn/guess-number" element={<ProtectedRoute><GuessNumberGame /></ProtectedRoute>} />
          <Route path="/earn/trivia" element={<ProtectedRoute><NigerianTrivia /></ProtectedRoute>} />
          <Route path="/earn/spin-wheel" element={<ProtectedRoute><SpinWheelGame /></ProtectedRoute>} />
          <Route path="/earn/predictor" element={<ProtectedRoute><NaijaPredictor /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
          <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
          <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
          <Route path="/terms-conditions" element={<TermsConditions />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/main-feed" element={<ProtectedRoute><MainFeed /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-failed" element={<PaymentFailed />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        {/* AI Assistant - Available on all protected routes */}
        <SmartAIAssistant />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
