import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/home";
import AdminDashboard from "@/pages/admin-dashboard";
import PresenterOpportunities from "@/pages/presenter-opportunities";
import ProgramsTest from "@/pages/programs-test";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/coaching-opportunities">
        <Redirect to="/" />
      </Route>
      <Route path="/presenter-opportunities" component={PresenterOpportunities} />
      <Route path="/admin" component={AdminDashboard} />
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
