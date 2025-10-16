import { useNavigate } from "react-router-dom";
import { ArrowLeft, Banknote, Lock, ExternalLink, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Loan() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Loan Services</h1>
        </div>
      </div>

      <div className="p-4 max-w-2xl mx-auto space-y-6">
        {/* Third-Party Service Warning */}
        <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <AlertDescription className="text-sm">
            <strong className="block mb-2">⚠️ Third-Party Service</strong>
            The loan service below is provided by FairMoney, a third-party financial service.
            NaijaLancers is <strong>NOT responsible</strong> for any transactions, issues, or disputes
            related to FairMoney. Use at your own discretion.
          </AlertDescription>
        </Alert>

        {/* FairMoney Referral Card */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Banknote className="h-6 w-6 text-primary" />
              Quick Loan via FairMoney
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Get instant access to loans with flexible repayment options through our partner FairMoney.
            </p>
            <ul className="text-sm space-y-2 text-muted-foreground">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Fast approval (within minutes)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Competitive interest rates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Flexible repayment terms
              </li>
            </ul>
            <Button 
              className="w-full" 
              size="lg"
              onClick={() => window.open("https://fairmoney.io/referral?referral_code=8PBFK", "_blank")}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Apply for Loan with FairMoney
            </Button>
            <p className="text-xs text-center text-muted-foreground italic">
              You will be redirected to FairMoney's website
            </p>
          </CardContent>
        </Card>

        <div className="text-center space-y-4 py-8">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-6 rounded-full">
              <Banknote className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Native Loan Services Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're working on integrating our own comprehensive loan service to help you access quick financial assistance directly through NaijaLancers.
          </p>
        </div>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Quick Loans
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Get instant access to short-term loans with flexible repayment options.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Low Interest Rates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Enjoy competitive interest rates and transparent terms.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Fast Approval
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Quick application process with same-day approval for eligible users.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-muted p-4 rounded-lg text-center">
          <p className="text-sm text-muted-foreground">
            We'll notify you as soon as this feature becomes available. Stay tuned!
          </p>
        </div>
      </div>
    </div>
  );
}
