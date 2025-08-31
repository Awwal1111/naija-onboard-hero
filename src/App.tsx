import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Welcome from "./pages/Welcome";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import Onboarding from "./pages/Onboarding";
import MainFeed from "./pages/MainFeed";
import Profile from "./pages/Profile";
import ExpertApplication from "./pages/ExpertApplication";
import PostJob from "./pages/PostJob";
import Experts from "./pages/Experts";
import Jobs from "./pages/Jobs";
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
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/feed" element={<MainFeed />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/expert-application" element={<ExpertApplication />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/experts" element={<Experts />} />
          <Route path="/jobs" element={<Jobs />} />
          <Route path="/earn" element={<Jobs />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
