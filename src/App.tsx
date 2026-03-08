import { lazy, Suspense, useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { MiniPayAuthWrapper } from "@/components/MiniPayAuthWrapper";
import { DeferredManagers } from "@/components/DeferredManagers";
import GlobalErrorHandler from "@/components/GlobalErrorHandler";
import { OnboardingTour } from "@/components/OnboardingTour";
import { useAppState } from "@/hooks/useAppState";
import { WebRTCProvider } from "@/contexts/WebRTCContext";
import { AuthProvider } from "@/contexts/AuthContext";
import AuthRedirectHandler from "@/components/AuthRedirectHandler";
import ErrorBoundary from "@/components/ErrorBoundary";
import { detectMiniPaySync } from "@/lib/minipay";
import { useLoginLogger } from "@/hooks/useLoginLogger";
import { lazyWithRetry } from "@/utils/chunkErrorHandler";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

// Loading fallback with timeout recovery
const PageLoader = () => {
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 12_000);
    return () => clearTimeout(timer);
  }, []);

  if (timedOut) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center max-w-xs space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Page is taking too long to load.
          </p>
          <Button onClick={() => window.location.reload()} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reload
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
};

// ===== LAZY LOADED PAGES WITH CHUNK ERROR RECOVERY =====
// Auth pages (small, load fast)
const Welcome = lazy(lazyWithRetry(() => import("./pages/Welcome")));
const Login = lazy(lazyWithRetry(() => import("./pages/Login")));
const SignUp = lazy(lazyWithRetry(() => import("./pages/SignUp")));
const ForgotPassword = lazy(lazyWithRetry(() => import("./pages/ForgotPassword")));
const ResetPassword = lazy(lazyWithRetry(() => import("./pages/ResetPassword")));
const Onboarding = lazy(lazyWithRetry(() => import("./pages/Onboarding")));

// Core pages
const Index = lazy(lazyWithRetry(() => import("./pages/Index")));
const MainFeed = lazy(lazyWithRetry(() => import("./pages/MainFeed")));
const Profile = lazy(lazyWithRetry(() => import("./pages/Profile")));
const Search = lazy(lazyWithRetry(() => import("./pages/Search")));
const Settings = lazy(lazyWithRetry(() => import("./pages/Settings")));
const SetupPin = lazy(lazyWithRetry(() => import("./pages/SetupPin")));
const ActivityLog = lazy(lazyWithRetry(() => import("./pages/ActivityLog")));
const Dashboard = lazy(lazyWithRetry(() => import("./pages/Dashboard")));
const ClientDashboard = lazy(lazyWithRetry(() => import("./pages/ClientDashboard")));
const Analytics = lazy(lazyWithRetry(() => import("./pages/Analytics")));
const Notifications = lazy(lazyWithRetry(() => import("./pages/Notifications")));
const Bookmarks = lazy(lazyWithRetry(() => import("./pages/Bookmarks")));

// Jobs & Gigs
const PostJob = lazy(lazyWithRetry(() => import("./pages/PostJob")));
const Jobs = lazy(lazyWithRetry(() => import("./pages/Jobs")));
const JobsEnhanced = lazy(lazyWithRetry(() => import("./pages/JobsEnhanced")));
const JobDetail = lazy(lazyWithRetry(() => import("./pages/JobDetail")));
const MyGigs = lazy(lazyWithRetry(() => import("./pages/MyGigs")));
const EditGig = lazy(lazyWithRetry(() => import("./pages/EditGig")));

// Experts
const Experts = lazy(lazyWithRetry(() => import("./pages/Experts")));
const ExpertProfile = lazy(lazyWithRetry(() => import("./pages/ExpertProfile")));
const ExpertApplication = lazy(lazyWithRetry(() => import("./pages/ExpertApplication")));
const ExpertVerification = lazy(lazyWithRetry(() => import("./pages/ExpertVerification")));
const ExpertClass = lazy(lazyWithRetry(() => import("./pages/ExpertClass")));
const ClassRoom = lazy(lazyWithRetry(() => import("./pages/ClassRoom")));

// Chat & Communication
const Chat = lazy(lazyWithRetry(() => import('./pages/Chat')));
const ChatPage = lazy(lazyWithRetry(() => import("./pages/ChatPage")));
const CallHistoryPage = lazy(lazyWithRetry(() => import("./pages/CallHistoryPage")));
const GroupChat = lazy(lazyWithRetry(() => import("./pages/GroupChat")));
const Connections = lazy(lazyWithRetry(() => import("./pages/Connections")));
const AIChat = lazy(lazyWithRetry(() => import("./pages/AIChat")));
const AIHire = lazy(lazyWithRetry(() => import("./pages/AIHire")));
const CopilotPage = lazy(lazyWithRetry(() => import("./pages/CopilotPage")));

// Earn & Games
const EnhancedEarn = lazy(lazyWithRetry(() => import("./pages/EnhancedEarn")));
const SocialMediaTasks = lazy(lazyWithRetry(() => import("./pages/SocialMediaTasks").then(m => ({ default: m.SocialMediaTasks }))));
const Surveys = lazy(lazyWithRetry(() => import("./pages/Surveys").then(m => ({ default: m.Surveys }))));
const CpxSurveys = lazy(lazyWithRetry(() => import("./pages/CpxSurveys").then(m => ({ default: m.CpxSurveys }))));
const GuessNumberGame = lazy(lazyWithRetry(() => import("./pages/GuessNumberGame").then(m => ({ default: m.GuessNumberGame }))));
const Referrals = lazy(lazyWithRetry(() => import("./pages/Referrals").then(m => ({ default: m.Referrals }))));
const Tasks = lazy(lazyWithRetry(() => import("./pages/Tasks")));
const ReferralTasks = lazy(lazyWithRetry(() => import("./pages/ReferralTasks")));
const Articles = lazy(lazyWithRetry(() => import("./pages/Articles")));
const NigerianTrivia = lazy(lazyWithRetry(() => import("./components/NigerianTrivia")));
const SpinWheelGame = lazy(lazyWithRetry(() => import("./components/SpinWheelGame")));
const NaijaPredictor = lazy(lazyWithRetry(() => import("./components/NaijaPredictor")));

// Commerce
const DigitalProducts = lazy(lazyWithRetry(() => import("./pages/DigitalProducts")));
const ProductDetail = lazy(lazyWithRetry(() => import("./pages/ProductDetail")));
const Courses = lazy(lazyWithRetry(() => import("./pages/Courses")));
const CourseDetail = lazy(lazyWithRetry(() => import("./pages/CourseDetail")));
const Orders = lazy(lazyWithRetry(() => import("./pages/Orders")));
const OrderDetail = lazy(lazyWithRetry(() => import("./pages/OrderDetail")));

// Finance
const Fundraising = lazy(lazyWithRetry(() => import("./pages/Fundraising")));
const FundraisingDetail = lazy(lazyWithRetry(() => import("./pages/FundraisingDetail")));
const Emergency = lazy(lazyWithRetry(() => import("./pages/Emergency")));
const Loan = lazy(lazyWithRetry(() => import("./pages/Loan")));
const Donations = lazy(lazyWithRetry(() => import("./pages/Donations")));
const PaymentSuccess = lazy(lazyWithRetry(() => import("./pages/PaymentSuccess")));
const PaymentFailed = lazy(lazyWithRetry(() => import("./pages/PaymentFailed")));

// Learn
const Learn = lazy(lazyWithRetry(() => import("./pages/Learn")));
const LearnCourse = lazy(lazyWithRetry(() => import("./pages/LearnCourse")));
const Leaderboard = lazy(lazyWithRetry(() => import("./pages/Leaderboard")));
const CertificateView = lazy(lazyWithRetry(() => import("./pages/CertificateView")));
const VerifyCertificate = lazy(lazyWithRetry(() => import("./pages/VerifyCertificate")));

// Contests & Work
const Contests = lazy(lazyWithRetry(() => import("./pages/Contests")));
const ContestDetail = lazy(lazyWithRetry(() => import("./pages/ContestDetail")));
const WorkRooms = lazy(lazyWithRetry(() => import("./pages/WorkRooms")));
const WorkRoomDetail = lazy(lazyWithRetry(() => import("./pages/WorkRoomDetail")));
const WorkDiary = lazy(lazyWithRetry(() => import("./pages/WorkDiary")));

// Admin & Developer
const EnhancedAdminDashboard = lazy(lazyWithRetry(() => import("./pages/EnhancedAdminDashboard")));
const AdminExpertApplications = lazy(lazyWithRetry(() => import("./pages/AdminExpertApplications")));
const DeveloperPortal = lazy(lazyWithRetry(() => import("./pages/DeveloperPortal")));
const DeveloperDocs = lazy(lazyWithRetry(() => import("./pages/DeveloperDocs")));
const MiniAppsMarketplace = lazy(lazyWithRetry(() => import("./pages/MiniAppsMarketplace")));

// Public SEO pages
const PublicExpert = lazy(lazyWithRetry(() => import("./pages/PublicExpert")));
const PublicGig = lazy(lazyWithRetry(() => import("./pages/PublicGig")));
const PublicJob = lazy(lazyWithRetry(() => import("./pages/PublicJob")));
const PublicCourse = lazy(lazyWithRetry(() => import("./pages/PublicCourse")));
const PublicCampaign = lazy(lazyWithRetry(() => import("./pages/PublicCampaign")));
const PublicGigs = lazy(lazyWithRetry(() => import("./pages/PublicGigs")));
const PublicExperts = lazy(lazyWithRetry(() => import("./pages/PublicExperts")));
const PublicJobs = lazy(lazyWithRetry(() => import("./pages/PublicJobs")));
const Sitemap = lazy(lazyWithRetry(() => import("./pages/Sitemap")));
const InstallApp = lazy(lazyWithRetry(() => import("./pages/InstallApp")));

// Static pages
const FAQ = lazy(lazyWithRetry(() => import("./pages/FAQ")));
const HelpCenter = lazy(lazyWithRetry(() => import("./pages/HelpCenter")));
const TermsConditions = lazy(lazyWithRetry(() => import("./pages/TermsConditions")));
const PrivacyPolicy = lazy(lazyWithRetry(() => import("./pages/PrivacyPolicy")));
const RefundPolicy = lazy(lazyWithRetry(() => import("./pages/RefundPolicy")));
const NotFound = lazy(lazyWithRetry(() => import("./pages/NotFound")));

// Lazy load heavy components
const SmartAIAssistant = lazy(lazyWithRetry(() => import("@/components/SmartAIAssistant")));

// SYNC detection at module load
const isMiniPayEnv = detectMiniPaySync().isMiniPay;

const LoginLogger = () => {
  useLoginLogger();
  return null;
};

const AppStateManager = () => {
  useAppState();
  return null;
};

const App = () => (
  <ErrorBoundary>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <GlobalErrorHandler />
      <BrowserRouter>
        <AuthProvider>
          <WebRTCProvider>
            <MiniPayAuthWrapper>
              {!isMiniPayEnv && <AuthRedirectHandler />}
              {!isMiniPayEnv && <AppStateManager />}
              {!isMiniPayEnv && <LoginLogger />}
              {!isMiniPayEnv && <DeferredManagers />}
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* PUBLIC SEO PAGES */}
                <Route path="/p/expert/:userId" element={<PublicExpert />} />
                <Route path="/p/gig/:gigId" element={<PublicGig />} />
                <Route path="/p/job/:jobId" element={<PublicJob />} />
                <Route path="/p/course/:courseId" element={<PublicCourse />} />
                <Route path="/p/campaign/:campaignId" element={<PublicCampaign />} />
                <Route path="/p/gigs" element={<PublicGigs />} />
                <Route path="/p/experts" element={<PublicExperts />} />
                <Route path="/p/jobs" element={<PublicJobs />} />
                
                {/* Short URL aliases */}
                <Route path="/gig/:gigId" element={<PublicGig />} />
                <Route path="/job/:jobId" element={<PublicJob />} />
                <Route path="/expert/:userId" element={<PublicExpert />} />
                <Route path="/course/:courseId" element={<PublicCourse />} />
                <Route path="/campaign/:campaignId" element={<PublicCampaign />} />
                <Route path="/sitemap.xml" element={<Sitemap />} />
                <Route path="/sitemap" element={<Sitemap />} />
                
                {/* Public pages */}
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
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/terms-conditions" element={<TermsConditions />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/refund-policy" element={<RefundPolicy />} />
                <Route path="/developers" element={<DeveloperDocs />} />
                <Route path="/verify-certificate/:certificateId" element={<VerifyCertificate />} />
                <Route path="/payment-success" element={<PaymentSuccess />} />
                <Route path="/payment-failed" element={<PaymentFailed />} />
                
                {/* Protected routes */}
                <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
                <Route path="/feed" element={<ProtectedRoute><MainFeed /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/expert/:userId" element={<ProtectedRoute><ExpertProfile /></ProtectedRoute>} />
                <Route path="/expert-application" element={<ProtectedRoute><ExpertApplication /></ProtectedRoute>} />
                <Route path="/admin/expert-applications" element={<ProtectedRoute><AdminExpertApplications /></ProtectedRoute>} />
                <Route path="/admin/dashboard" element={<ProtectedRoute><EnhancedAdminDashboard /></ProtectedRoute>} />
                <Route path="/developer" element={<ProtectedRoute><DeveloperPortal /></ProtectedRoute>} />
                <Route path="/mini-apps" element={<ProtectedRoute><MiniAppsMarketplace /></ProtectedRoute>} />
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
                <Route path="/earn/referral-tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                <Route path="/referral-tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
                <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
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
                <Route path="/client-dashboard" element={<ProtectedRoute><ClientDashboard /></ProtectedRoute>} />
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

                <Route path="*" element={<NotFound />} />
              </Routes>
              </Suspense>
              {/* AI Assistant - lazy loaded & DISABLED in MiniPay */}
              {!isMiniPayEnv && (
                <Suspense fallback={null}>
                  <SmartAIAssistant />
                </Suspense>
              )}
            </MiniPayAuthWrapper>
          </WebRTCProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </ErrorBoundary>
);

export default App;
