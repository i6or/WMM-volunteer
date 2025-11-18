import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import VolunteerRegistration from "@/pages/volunteer-registration";
import AdminDashboard from "@/pages/admin-dashboard";
import PresenterOpportunities from "@/pages/presenter-opportunities";
import MySignups from "@/pages/my-signups";
import ProgramsTest from "@/pages/programs-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/coaching-opportunities" component={Home} />
      <Route path="/presenter-opportunities" component={PresenterOpportunities} />
      <Route path="/register" component={VolunteerRegistration} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/my-signups" component={MySignups} />
      <Route path="/programs-test" component={ProgramsTest} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
