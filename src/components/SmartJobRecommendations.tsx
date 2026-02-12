import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, Sparkles, MapPin, Clock, ArrowRight, ChevronLeft, ChevronRight, Zap, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { usePersonalizedJobPosts, usePersonalizedGigs } from '@/hooks/usePersonalizedDiscovery';
import { useProfile } from '@/hooks/useProfile';
import { useRoleFeatures } from '@/hooks/useRoleFeatures';
import { formatDistanceToNow } from 'date-fns';

interface SmartJobRecommendationsProps {
  maxItems?: number;
  showGigs?: boolean;
}

const SmartJobRecommendations: React.FC<SmartJobRecommendationsProps> = ({ 
  maxItems = 5, 
  showGigs = true 
}) => {
  const navigate = useNavigate();
  const { profile } = useProfile();
  const { isFreelancer, isClient, mode } = useRoleFeatures();
  const { jobPosts, loading: jobsLoading } = usePersonalizedJobPosts(maxItems);
  const { gigs, loading: gigsLoading } = usePersonalizedGigs(maxItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // Default tab based on user role
  // Freelancers see Jobs first, Clients see Gigs/Services first
  const getDefaultTab = () => {
    if (mode === 'client') return 'gigs';
    return 'jobs';
  };
  
  const [activeTab, setActiveTab] = useState<'jobs' | 'gigs'>(getDefaultTab());
  
  // Update default tab when mode changes
  useEffect(() => {
    setActiveTab(getDefaultTab());
    setCurrentIndex(0);
  }, [mode]);

  // Combine and sort by relevance score
  const items = activeTab === 'jobs' ? jobPosts : gigs;
  const loading = activeTab === 'jobs' ? jobsLoading : gigsLoading;

  const handlePrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex(prev => Math.min(items.length - 1, prev + 1));
  };

  const formatBudget = (min?: number | null, max?: number | null) => {
    if (!min && !max) return 'Negotiable';
    if (min && max) return `₦${min.toLocaleString()} - ₦${max.toLocaleString()}`;
    if (min) return `From ₦${min.toLocaleString()}`;
    if (max) return `Up to ₦${max.toLocaleString()}`;
    return 'Negotiable';
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-background">
        <CardContent className="py-8 flex justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  const currentItem = items[currentIndex];
  const matchScore = Math.round((currentItem?.relevance_score || 0) * 100);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-accent/5 overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              {mode === 'client' ? (
                <Users className="h-4 w-4 text-primary" />
              ) : (
                <Sparkles className="h-4 w-4 text-primary" />
              )}
            </div>
            <span>
              {mode === 'client' 
                ? 'Recommended Talent' 
                : mode === 'freelancer' 
                ? 'Jobs For You'
                : 'AI-Matched For You'}
            </span>
          </CardTitle>
          
          {/* Show tabs only for 'both' mode, otherwise show single relevant view */}
          {mode === 'both' && showGigs && (
            <div className="flex gap-1 p-0.5 bg-muted rounded-lg">
              <Button
                size="sm"
                variant={activeTab === 'jobs' ? 'default' : 'ghost'}
                className="h-7 px-3 text-xs"
                onClick={() => { setActiveTab('jobs'); setCurrentIndex(0); }}
              >
                Jobs
              </Button>
              <Button
                size="sm"
                variant={activeTab === 'gigs' ? 'default' : 'ghost'}
                className="h-7 px-3 text-xs"
                onClick={() => { setActiveTab('gigs'); setCurrentIndex(0); }}
              >
                Services
              </Button>
            </div>
          )}
        </div>
        
        {/* Role-specific subtitle */}
        {mode === 'freelancer' && profile?.profession && (
          <p className="text-xs text-muted-foreground mt-1">
            Based on your skills: <span className="font-medium text-foreground">{profile.profession}</span>
          </p>
        )}
        {mode === 'client' && (
          <p className="text-xs text-muted-foreground mt-1">
            Top-rated freelancers matching your needs
          </p>
        )}
        {mode === 'both' && profile?.profession && (
          <p className="text-xs text-muted-foreground mt-1">
            Based on your profile: <span className="font-medium text-foreground">{profile.profession}</span>
          </p>
        )}
      </CardHeader>

      <CardContent className="pb-4">
        {activeTab === 'jobs' ? (
          // Job card
          <div 
            className="p-4 bg-background rounded-xl border cursor-pointer hover:shadow-md transition-all"
            onClick={() => navigate(`/job/${currentItem.id}`)}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Badge variant="outline" className="text-[10px] mb-2 border-blue-500/30 text-blue-600 dark:text-blue-400">
                  HIRING — JOB POST
                </Badge>
                <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                  {currentItem.title}
                </h3>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  {currentItem.poster_name && (
                    <span>{currentItem.poster_name}</span>
                  )}
                  {currentItem.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {currentItem.location}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {matchScore > 0 && (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs">
                  <Zap className="h-3 w-3 mr-0.5" />
                  {matchScore}% match
                </Badge>
              )}
            </div>

            <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
              {currentItem.description}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <span className="font-semibold text-primary">
                  {formatBudget(currentItem.budget_min, currentItem.budget_max)}
                </span>
                {currentItem.created_at && (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(currentItem.created_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              
              <Button size="sm" className="h-7 text-xs gap-1">
                Apply <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            {currentItem.required_skills && currentItem.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                {currentItem.required_skills.slice(0, 4).map((skill: string, idx: number) => (
                  <Badge key={idx} variant="secondary" className="text-[10px] h-5">
                    {skill}
                  </Badge>
                ))}
                {currentItem.required_skills.length > 4 && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    +{currentItem.required_skills.length - 4}
                  </Badge>
                )}
              </div>
            )}
          </div>
        ) : (
          // Gig card
          <div 
            className="p-4 bg-background rounded-xl border cursor-pointer hover:shadow-md transition-all"
            onClick={() => navigate(`/gig/${currentItem.id}`)}
          >
            <Badge variant="outline" className="text-[10px] mb-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              SERVICE / GIG
            </Badge>
            <div className="flex gap-3">
              {currentItem.photo_urls?.[0] && (
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  <img 
                    src={currentItem.photo_urls[0]} 
                    alt={currentItem.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm line-clamp-2">
                    {currentItem.title}
                  </h3>
                  {matchScore > 0 && (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs flex-shrink-0">
                      <Zap className="h-3 w-3 mr-0.5" />
                      {matchScore}%
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-2 mt-1">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={currentItem.seller_picture} />
                    <AvatarFallback className="text-[10px]">
                      {currentItem.seller_name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground">{currentItem.seller_name}</span>
                  {currentItem.seller_is_expert && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1">Expert</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t">
              <span className="font-bold text-primary">
                ₦{currentItem.price?.toLocaleString()}
              </span>
              <Button size="sm" className="h-7 text-xs gap-1">
                View Gig <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {items.length > 1 && (
          <div className="flex items-center justify-between mt-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrev}
              disabled={currentIndex === 0}
              className="h-8 px-2"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-1">
              {items.slice(0, 5).map((_, idx) => (
                <button
                  key={idx}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    idx === currentIndex ? 'bg-primary' : 'bg-muted-foreground/30'
                  }`}
                  onClick={() => setCurrentIndex(idx)}
                />
              ))}
              {items.length > 5 && (
                <span className="text-xs text-muted-foreground ml-1">
                  +{items.length - 5}
                </span>
              )}
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              disabled={currentIndex === items.length - 1}
              className="h-8 px-2"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* View All */}
        <Button
          variant="link"
          className="w-full mt-2 text-xs"
          onClick={() => navigate(activeTab === 'jobs' ? '/jobs' : '/jobs?tab=gigs')}
        >
          View all {activeTab === 'jobs' ? 'job opportunities' : 'services'} →
        </Button>
      </CardContent>
    </Card>
  );
};

export default SmartJobRecommendations;
