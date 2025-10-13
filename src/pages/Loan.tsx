import { useNavigate } from "react-router-dom";
import { ArrowLeft, Banknote, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
        <div className="text-center space-y-4 py-12">
          <div className="flex justify-center">
            <div className="bg-primary/10 p-6 rounded-full">
              <Banknote className="h-16 w-16 text-primary" />
            </div>
          </div>
          <h2 className="text-2xl font-bold">Loan Services Coming Soon</h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            We're working on integrating a comprehensive loan service to help you access quick financial assistance when you need it most.
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
