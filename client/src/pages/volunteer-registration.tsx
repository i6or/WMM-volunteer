import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { VolunteerRegistrationForm } from "@/components/volunteer-registration-form";

export default function VolunteerRegistration() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <VolunteerRegistrationForm />
      </div>

      <Footer />
    </div>
  );
}
