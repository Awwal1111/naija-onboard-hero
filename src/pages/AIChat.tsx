import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import AIChatInterface from '@/components/AIChatInterface';

const AIChat = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col">
      <AIChatInterface />
    </div>
  );
};

export default AIChat;
