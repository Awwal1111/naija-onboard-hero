import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Share2, Award, CheckCircle, QrCode, Calendar, User } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

export default function CertificateView() {
  const { certificateId } = useParams<{ certificateId: string }>();
  const navigate = useNavigate();

  const { data: certificate, isLoading } = useQuery({
    queryKey: ['certificate', certificateId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('learning_certificates')
        .select('*')
        .eq('id', certificateId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!certificateId,
  });

  const generateQRData = () => {
    if (!certificate) return '';
    const verifyUrl = `${window.location.origin}/verify-certificate/${certificate.certificate_id}`;
    return verifyUrl;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-2xl mx-auto">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </div>
    );
  }

  if (!certificate) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <h2 className="text-xl font-bold mb-2">Certificate Not Found</h2>
          <p className="text-muted-foreground mb-4">This certificate doesn't exist or has been revoked.</p>
          <Button onClick={() => navigate('/learn')}>Back to Learn Hub</Button>
        </Card>
      </div>
    );
  }

  const learnerName = certificate?.learner_name || 'NaijaLancers Learner';

  return (
    <>
      <Helmet>
        <title>Certificate - {certificate.skill_name} | NaijaLancers</title>
        <meta name="description" content={`Verified certificate for ${certificate.skill_name} issued by NaijaLancers`} />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 pb-20">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button size="sm">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          {/* Certificate Card */}
          <Card className="relative overflow-hidden border-2 border-primary/20 bg-gradient-to-br from-background via-primary/5 to-background">
            {/* Decorative elements */}
            <div className="absolute top-0 left-0 w-32 h-32 bg-primary/10 rounded-br-full" />
            <div className="absolute bottom-0 right-0 w-32 h-32 bg-primary/10 rounded-tl-full" />
            
            <CardContent className="p-8 relative">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/20 rounded-full mb-4">
                  <Award className="h-8 w-8 text-primary" />
                </div>
                <h1 className="text-lg text-muted-foreground font-medium">CERTIFICATE OF COMPLETION</h1>
                <p className="text-sm text-muted-foreground">NaijaLancers Learning Hub</p>
              </div>

              {/* Main Content */}
              <div className="text-center space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">This is to certify that</p>
                <h2 className="text-3xl font-bold text-primary">
                  {learnerName}
                </h2>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground mb-2">has successfully completed the course</p>
                  <h3 className="text-2xl font-semibold">{certificate.skill_name}</h3>
                </div>

                <div className="flex justify-center gap-4">
                  <Badge variant="secondary" className="text-sm px-4 py-1">
                    {certificate.skill_level}
                  </Badge>
                  {certificate.final_exam_score && (
                    <Badge variant="outline" className="text-sm px-4 py-1">
                      Score: {certificate.final_exam_score}%
                    </Badge>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                  <div className="text-left">
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Issue Date
                    </p>
                    <p className="font-medium">
                      {format(new Date(certificate.issued_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <QrCode className="h-3 w-3" />
                      Certificate ID
                    </p>
                    <p className="font-mono text-sm font-medium">{certificate.certificate_id}</p>
                  </div>
                </div>

                {/* QR Code Section */}
                <div className="pt-6 border-t">
                  <div className="flex items-center justify-center gap-4">
                    <div className="p-4 bg-white rounded-lg shadow-inner">
                      {/* QR Code - Using a simple placeholder that would be replaced with actual QR library */}
                      <div className="w-24 h-24 bg-muted flex items-center justify-center rounded">
                        <QrCode className="h-16 w-16 text-primary" />
                      </div>
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-medium">Scan to Verify</p>
                      <p className="text-xs text-muted-foreground">
                        Verify this certificate's<br />authenticity in the<br />NaijaLancers app
                      </p>
                    </div>
                  </div>
                </div>

                {/* Verification Badge */}
                <div className="flex items-center justify-center gap-2 pt-4">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-green-600 font-medium">Verified Certificate</span>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  This certificate was issued by NaijaLancers and can be verified at
                </p>
                <p className="text-xs text-primary font-mono">
                  naijalancers.com/verify/{certificate.certificate_id}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Additional Info */}
          <Card className="mt-4">
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Certificate Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Skill</span>
                  <span className="font-medium">{certificate.skill_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Level</span>
                  <span className="font-medium">{certificate.skill_level}</span>
                </div>
                {certificate.final_exam_score && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Final Exam Score</span>
                    <span className="font-medium">{certificate.final_exam_score}%</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Issued</span>
                  <span className="font-medium">
                    {format(new Date(certificate.issued_at), 'PPP')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Certificate ID</span>
                  <span className="font-mono text-xs">{certificate.certificate_id}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
