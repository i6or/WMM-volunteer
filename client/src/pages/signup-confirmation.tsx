import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CheckCircle } from "lucide-react";
import { useLocation } from "wouter";

export default function SignupConfirmation() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <div className="flex-1 container mx-auto px-4 py-8 max-w-2xl flex items-center justify-center">
        <Card className="w-full">
          <CardContent className="p-8 text-center">
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>

            <h2 className="text-2xl font-bold mb-4">Thank You for Signing Up!</h2>

            <p className="text-muted-foreground mb-6">
              Your registration has been submitted successfully. You will receive a confirmation email shortly with details about your coaching commitment.
            </p>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 text-left">
              <h4 className="font-semibold text-green-800 mb-2">What's Next?</h4>
              <ul className="text-sm text-green-700 space-y-2">
                <li>- Check your email for confirmation details</li>
                <li>- Look for the program schedule and Zoom links</li>
                <li>- Mark your calendar for the workshop dates</li>
                <li>- Complete any required coach training materials</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setLocation('/')}
                className="bg-[#2e7d32] text-white hover:bg-[#1b5e20]"
              >
                Browse More Opportunities
              </Button>
              <Button
                variant="outline"
                onClick={() => setLocation('/my-signups')}
              >
                View My Signups
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
