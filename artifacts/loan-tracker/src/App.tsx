import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Dashboard } from "@/pages/Dashboard";
import { Borrowers } from "@/pages/Borrowers";
import { Loans } from "@/pages/Loans";
import { Payments } from "@/pages/Payments";
import { BorrowerDetail } from "@/pages/BorrowerDetail";
import { Reports } from "@/pages/Reports";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/borrowers" component={Borrowers} />
      <Route path="/loans" component={Loans} />
      <Route path="/payments" component={Payments} />
      <Route path="/borrowers/:borrowerId" component={BorrowerDetail} />
      <Route path="/reports" component={Reports} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
