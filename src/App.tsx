import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Onboarding from "./pages/Onboarding";
import MainFeed from "./pages/MainFeed";
import Profile from "./pages/Profile";
import ExpertApplication from "./pages/ExpertApplication";
import PostJob from "./pages/PostJob";
import Experts from "./pages/Experts";
import Jobs from "./pages/Jobs";
import Chat from "./pages/Chat";
import ChatList from "./pages/ChatList";
import { TapEarn } from "./pages/TapEarn";
import { Earn } from "./pages/Earn";
import { SocialMediaTasks } from "./pages/SocialMediaTasks";
import { Surveys } from "./pages/Surveys";
import { GuessNumberGame } from "./pages/GuessNumberGame";
import { Referrals } from "./pages/Referrals";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
          <Route path="/feed" element={<ProtectedRoute><MainFeed /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/expert-application" element={<ProtectedRoute><ExpertApplication /></ProtectedRoute>} />
          <Route path="/post-job" element={<ProtectedRoute><PostJob /></ProtectedRoute>} />
          <Route path="/experts" element={<ProtectedRoute><Experts /></ProtectedRoute>} />
          <Route path="/jobs" element={<ProtectedRoute><Jobs /></ProtectedRoute>} />
          <Route path="/tap-earn" element={<ProtectedRoute><TapEarn /></ProtectedRoute>} />
          <Route path="/surveys" element={<ProtectedRoute><Surveys /></ProtectedRoute>} />
          <Route path="/games/guess-number" element={<ProtectedRoute><GuessNumberGame /></ProtectedRoute>} />
          <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
          <Route path="/earn" element={<ProtectedRoute><Earn /></ProtectedRoute>} />
          <Route path="/earn/social-tasks" element={<ProtectedRoute><SocialMediaTasks /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><ChatList /></ProtectedRoute>} />
          <Route path="/chat/:userId" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
