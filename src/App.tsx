import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MiniPayAuthWrapper } from "@/components/MiniPayAuthWrapper";
import SmartAIAssistant from "@/components/SmartAIAssistant";
import WalletInitializer from "@/components/WalletInitializer";
import GlobalCallManager from "@/components/GlobalCallManager";
import GlobalPresenceManager from "@/components/GlobalPresenceManager";
import { QuidaxRampManager } from "@/components/QuidaxRampManager";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { PushNotificationManager } from "@/components/PushNotificationManager";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useAppState } from "@/hooks/useAppState";
import { WebRTCProvider } from "@/contexts/WebRTCContext";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import MainFeed from "./pages/MainFeed";
import Profile from "./pages/Profile";
import PostJob from "./pages/PostJob";
import Experts from "./pages/Experts";
import Jobs from "./pages/Jobs";
import MyGigs from "./pages/MyGigs";
import EditGig from "./pages/EditGig";
import Chat from './pages/Chat'
import ChatPage from "./pages/ChatPage";
import CallHistoryPage from "./pages/CallHistoryPage";
import GroupChat from "./pages/GroupChat";
import Connections from "./pages/Connections";
import EnhancedEarn from "./pages/EnhancedEarn";
import { SocialMediaTasks } from "./pages/SocialMediaTasks";
import { Surveys } from "./pages/Surveys";
import { CpxSurveys } from "./pages/CpxSurveys";
import { GuessNumberGame } from "./pages/GuessNumberGame";
import { Referrals } from "./pages/Referrals";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailed from "./pages/PaymentFailed";
import ReferralTasks from "./pages/ReferralTasks";
import DigitalProducts from "./pages/DigitalProducts";
import Courses from "./pages/Courses";
import Fundraising from "./pages/Fundraising";
import Emergency from "./pages/Emergency";
import Loan from "./pages/Loan";
import Donations from "./pages/Donations";
import JobsEnhanced from "./pages/JobsEnhanced";
import ExpertProfile from "./pages/ExpertProfile";
import ExpertApplication from "./pages/ExpertApplication";
import AdminExpertApplications from "./pages/AdminExpertApplications";
import ClassRoom from "./pages/ClassRoom";
import TermsConditions from "./pages/TermsConditions";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Settings from "./pages/Settings";
import SetupPin from "./pages/SetupPin";
import ActivityLog from "./pages/ActivityLog";
import EnhancedAdminDashboard from "./pages/EnhancedAdminDashboard";
import Articles from "./pages/Articles";
import NotFound from "./pages/NotFound";
import NigerianTrivia from "./components/NigerianTrivia";
import FundraisingDetail from "./pages/FundraisingDetail";
import ProductDetail from "./pages/ProductDetail";
import CourseDetail from "./pages/CourseDetail";
import JobDetail from "./pages/JobDetail";
import SpinWheelGame from "./components/SpinWheelGame";
import NaijaPredictor from "./components/NaijaPredictor";
import FAQ from "./pages/FAQ";
import Index from "./pages/Index";
import Search from "./pages/Search";
import PublicExpert from "./pages/PublicExpert";
import PublicGig from "./pages/PublicGig";
import PublicJob from "./pages/PublicJob";
import PublicCourse from "./pages/PublicCourse";
import PublicCampaign from "./pages/PublicCampaign";
import Sitemap from "./pages/Sitemap";
import InstallApp from "./pages/InstallApp";
import AIChat from "./pages/AIChat";
import AIHire from "./pages/AIHire";
import Analytics from "./pages/Analytics";
import Dashboard from "./pages/Dashboard";
import Bookmarks from "./pages/Bookmarks";
import CopilotPage from "./pages/CopilotPage";
import Leaderboard from "./pages/Leaderboard";
import Learn from "./pages/Learn";
import LearnCourse from "./pages/LearnCourse";
import ExpertClass from "./pages/ExpertClass";
import Notifications from "./pages/Notifications";
import Orders from "./pages/Orders";
import OrderDetail from "./pages/OrderDetail";
import CertificateView from "./pages/CertificateView";
import VerifyCertificate from "./pages/VerifyCertificate";
import ExpertVerification from "./pages/ExpertVerification";
import Contests from "./pages/Contests";
import ContestDetail from "./pages/ContestDetail";
import WorkRooms from "./pages/WorkRooms";
import WorkRoomDetail from "./pages/WorkRoomDetail";
import WorkDiary from "./pages/WorkDiary";
import DeveloperPortal from "./pages/DeveloperPortal";
import DeveloperDocs from "./pages/DeveloperDocs";

// Component to handle app state persistence
const AppStateManager = () => {
  useAppState();
  return null;
};

const App = () => (
  <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <WebRTCProvider>
          <MiniPayAuthWrapper>
            <AppStateManager />
            <WalletInitializer />
            <GlobalCallManager />
            <GlobalPresenceManager />
            <QuidaxRampManager />
            <PWAInstallPrompt />
            <PushNotificationManager />
            <Routes>
              {/* PUBLIC SEO PAGES - Must be BEFORE protected routes to prevent redirect issues */}
              <Route path="/p/expert/:userId" element={<PublicExpert />} />
              <Route path="/p/gig/:gigId" element={<PublicGig />} />
              <Route path="/p/job/:jobId" element={<PublicJob />} />
              <Route path="/p/course/:courseId" element={<PublicCourse />} />
              <Route path="/p/campaign/:campaignId" element={<PublicCampaign />} />
              <Route path="/sitemap.xml" element={<Sitemap />} />
              <Route path="/sitemap" element={<Sitemap />} />
              
              {/* Public pages - no auth required */}
              <Route path="/" element={<Index />} />
              <Route path="/install" element={<InstallApp />} />
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<SignUp />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/fundraising" element={<Fundraising />} />
              <Route path="/fundraising/:id" element={<FundraisingDetail />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/terms-conditions" element={<TermsConditions />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/developers" element={<DeveloperDocs />} />
              <Route path="/verify-certificate/:certificateId" element={<VerifyCertificate />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-failed" element={<PaymentFailed />} />
              
              {/* Protected routes - require authentication */}
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/feed" element={<ProtectedRoute><MainFeed /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/expert/:userId" element={<ProtectedRoute><ExpertProfile /></ProtectedRoute>} />
              <Route path="/expert-application" element={<ProtectedRoute><ExpertApplication /></ProtectedRoute>} />
              <Route path="/admin/expert-applications" element={<ProtectedRoute><AdminExpertApplications /></ProtectedRoute>} />
              <Route path="/admin/dashboard" element={<ProtectedRoute><EnhancedAdminDashboard /></ProtectedRoute>} />
              <Route path="/developer" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
              <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
              <Route path="/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
              <Route path="/experts" element={<ProtectedRoute><Experts /></ProtectedRoute>} />
              <Route path="/expert-verification" element={<ProtectedRoute><ExpertVerification /></ProtectedRoute>} />
              <Route path="/expert-class" element={<ProtectedRoute><ExpertClass /></ProtectedRoute>} />
              <Route path="/expert-class/room/:classId" element={<ProtectedRoute><ClassRoom /></ProtectedRoute>} />
              <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
              <Route path="/my-gigs" element={<ProtectedRoute><MyGigs /></ProtectedRoute>} />
              <Route path="/edit-gig/:gigId" element={<ProtectedRoute><EditGig /></ProtectedRoute>} />
              <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
              <Route path="/cpx-surveys" element={<ProtectedRoute><CpxSurveys /></ProtectedRoute>} />
              <Route path="/games/guess-number" element={<ProtectedRoute><GuessNumberGame /></ProtectedRoute>} />
              <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
              <Route path="/earn" element={<ProtectedRoute><EnhancedEarn /></ProtectedRoute>} />
              <Route path="/earn/social-tasks" element={<ProtectedRoute><SocialMediaTasks /></ProtectedRoute>} />
              <Route path="/earn/referral-tasks" element={<ProtectedRoute><ReferralTasks /></ProtectedRoute>} />
              <Route path="/referral-tasks" element={<ProtectedRoute><ReferralTasks /></ProtectedRoute>} />
              <Route path="/digital-products" element={<ProtectedRoute><DigitalProducts /></ProtectedRoute>} />
              <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
              <Route path="/courses" element={<ProtectedRoute><Courses /></ProtectedRoute>} />
              <Route path="/courses/:id" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
              <Route path="/jobs/:id" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
              <Route path="/emergency" element={<ProtectedRoute><Emergency /></ProtectedRoute>} />
              <Route path="/loan" element={<ProtectedRoute><Loan /></ProtectedRoute>} />
              <Route path="/donations" element={<ProtectedRoute><Donations /></ProtectedRoute>} />
              <Route path="/jobs-enhanced" element={<ProtectedRoute><JobsEnhanced /></ProtectedRoute>} />
              <Route path="/earn/guess-number" element={<ProtectedRoute><GuessNumberGame /></ProtectedRoute>} />
              <Route path="/earn/trivia" element={<ProtectedRoute><NigerianTrivia /></ProtectedRoute>} />
              <Route path="/earn/spin-wheel" element={<ProtectedRoute><SpinWheelGame /></ProtectedRoute>} />
              <Route path="/earn/predictor" element={<ProtectedRoute><NaijaPredictor /></ProtectedRoute>} />
              <Route path="/earn/articles" element={<ProtectedRoute><Articles /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
              <Route path="/chat/ai" element={<ProtectedRoute><AIChat /></ProtectedRoute>} />
              <Route path="/ai-hire" element={<ProtectedRoute><AIHire /></ProtectedRoute>} />
              <Route path="/chat/copilot" element={<ProtectedRoute><CopilotPage /></ProtectedRoute>} />
              <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/call-history" element={<ProtectedRoute><CallHistoryPage /></ProtectedRoute>} />
              <Route path="/groups/:groupId" element={<ProtectedRoute><GroupChat /></ProtectedRoute>} />
              <Route path="/connections" element={<ProtectedRoute><Connections /></ProtectedRoute>} />
              <Route path="/main-feed" element={<ProtectedRoute><MainFeed /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
              <Route path="/settings/pin" element={<ProtectedRoute><SetupPin /></ProtectedRoute>} />
              <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
              <Route path="/bookmarks" element={<ProtectedRoute><Bookmarks /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/learn" element={<ProtectedRoute><Learn /></ProtectedRoute>} />
              <Route path="/learn/course/:courseId" element={<ProtectedRoute><LearnCourse /></ProtectedRoute>} />
              <Route path="/certificate/:certificateId" element={<ProtectedRoute><CertificateView /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
              <Route path="/orders/:orderId" element={<ProtectedRoute><OrderDetail /></ProtectedRoute>} />
              <Route path="/contests" element={<ProtectedRoute><Contests /></ProtectedRoute>} />
              <Route path="/contests/:contestId" element={<ProtectedRoute><ContestDetail /></ProtectedRoute>} />
              <Route path="/workrooms" element={<ProtectedRoute><WorkRooms /></ProtectedRoute>} />
              <Route path="/workrooms/:roomId" element={<ProtectedRoute><WorkRoomDetail /></ProtectedRoute>} />
              <Route path="/work-diary" element={<ProtectedRoute><WorkDiary /></ProtectedRoute>} />

              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* AI Assistant - Available on all protected routes */}
            <SmartAIAssistant />
          </MiniPayAuthWrapper>
        </WebRTCProvider>
      </BrowserRouter>
    </TooltipProvider>
);

export default App;
