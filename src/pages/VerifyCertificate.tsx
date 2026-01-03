import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Award, Calendar, User, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function VerifyCertificate() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();

  const { data: certificate, isLoading, error } = useQuery({
    queryKey: ['verify-certificate', certificateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_certificates')
        .select('*')
        .eq('certificate_id', certificateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!certificateId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8">
          <div className="text-center space-y-4">
            <Skeleton className="h-16 w-16 rounded-full mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </Card>
      </div>
    );
  }

  const learnerName = certificate?.learner_name || 'NaijaLancers Learner';

  return (
    <>
      <Helmet>
        <title>Verify Certificate | NaijaLancers</title>
        <meta name="description" content="Verify the authenticity of a NaijaLancers certificate" />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8">
            {certificate ? (
              <div className="text-center space-y-6">
                {/* Verified Badge */}
                <div className="inline-flex items-center justify-center w-20 h-20 bg-green-500/20 rounded-full">
                  <CheckCircle className="h-10 w-10 text-green-500" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-green-600 mb-2">Certificate Verified</h1>
                  <p className="text-muted-foreground">
                    This is a valid NaijaLancers certificate
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">Awarded to</p>
                      <p className="font-medium">{learnerName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">Course Completed</p>
                      <p className="font-medium">{certificate.skill_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div className="text-left">
                      <p className="text-xs text-muted-foreground">Issue Date</p>
                      <p className="font-medium">
                        {format(new Date(certificate.issued_at), 'MMMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-2">
                  <Badge variant="secondary">{certificate.skill_level}</Badge>
                  {certificate.final_exam_score && (
                    <Badge variant="outline">Score: {certificate.final_exam_score}%</Badge>
                  )}
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Certificate ID</p>
                  <p className="font-mono text-sm">{certificate.certificate_id}</p>
                </div>

                <Button onClick={() => navigate('/learn')} className="w-full">
                  Explore NaijaLancers Learning
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-6">
                {/* Not Found Badge */}
                <div className="inline-flex items-center justify-center w-20 h-20 bg-red-500/20 rounded-full">
                  <XCircle className="h-10 w-10 text-red-500" />
                </div>

                <div>
                  <h1 className="text-2xl font-bold text-red-600 mb-2">Certificate Not Found</h1>
                  <p className="text-muted-foreground">
                    This certificate ID is invalid or the certificate has been revoked.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm text-muted-foreground">
                    If you believe this is an error, please contact support or ask the certificate holder for the correct certificate ID.
                  </p>
                </div>

                <div className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Searched ID</p>
                  <p className="font-mono text-sm">{certificateId}</p>
                </div>

                <Button onClick={() => navigate('/')} className="w-full">
                  Go to NaijaLancers
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
