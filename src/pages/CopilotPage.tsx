import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CopilotChat from '@/components/AICopilot/CopilotChat';

const CopilotPage = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col">
      {/* Back button overlay for mobile */}
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 z-50 p-2 bg-background/80 backdrop-blur rounded-full shadow-md md:hidden"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      
      <CopilotChat />
    </div>
  );
};

export default CopilotPage;
