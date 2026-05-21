import { useLoanData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Users, Wallet, Plus, ListChecks, Printer } from "lucide-react";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";

export function Dashboard() {
  const { borrowers, isLoaded } = useLoanData();
  const [showAddModal, setShowAddModal] = useState(false);

  if (!isLoaded) return null;

  const totalOutstanding = borrowers.reduce((sum, b) => sum + b.currentBalance, 0);
  const activeBorrowers = borrowers.filter(b => b.currentBalance > 0).length;
  const totalBorrowers = borrowers.length;

  return (
    <div className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* ── Header ── */}
      <header className="px-6 pt-10 pb-6 border-b border-border bg-card">
        <h1 className="text-2xl font-serif font-bold text-foreground mb-1">Loan Tracker</h1>
        <p className="text-sm text-muted-foreground">Dashboard</p>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 p-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm" data-testid="stat-total-outstanding">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Outstanding</span>
            </div>
            <div className="text-xl font-serif font-bold text-primary">{formatMoney(totalOutstanding)}</div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-sm" data-testid="stat-total-borrowers">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Borrowers</span>
            </div>
            <div className="text-xl font-serif font-bold text-foreground">
              {activeBorrowers}
              <span className="text-sm font-sans font-normal text-muted-foreground ml-1">active</span>
            </div>
            {totalBorrowers > activeBorrowers && (
              <div className="text-xs text-muted-foreground mt-0.5">{totalBorrowers} total</div>
            )}
          </div>
        </div>

        {/* Action cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</h2>

          <button
            onClick={() => setShowAddModal(true)}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all text-left cursor-pointer"
            data-testid="button-dash-add-borrower"
          >
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
              <Plus className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-medium text-foreground">Add New Borrower</div>
              <div className="text-xs text-muted-foreground mt-0.5">Create a new loan record</div>
            </div>
          </button>

          <Link href="/borrowers" className="block focus:outline-none focus-visible:ring-2 ring-primary rounded-xl">
            <div
              className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all cursor-pointer"
              data-testid="button-dash-view-borrowers"
            >
              <div className="w-10 h-10 bg-secondary/80 rounded-full flex items-center justify-center shrink-0">
                <ListChecks className="w-5 h-5 text-foreground/70" />
              </div>
              <div>
                <div className="font-medium text-foreground">View All Borrowers</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {totalBorrowers === 0 ? "No records yet" : `${totalBorrowers} record${totalBorrowers !== 1 ? "s" : ""}`}
                </div>
              </div>
            </div>
          </Link>

          <button
            onClick={() => window.print()}
            className="w-full flex items-center gap-4 bg-card border border-border rounded-xl p-5 shadow-sm hover:border-primary/30 hover:shadow-md transition-all text-left cursor-pointer no-print"
            data-testid="button-dash-print"
          >
            <div className="w-10 h-10 bg-secondary/80 rounded-full flex items-center justify-center shrink-0">
              <Printer className="w-5 h-5 text-foreground/70" />
            </div>
            <div>
              <div className="font-medium text-foreground">Print Dashboard</div>
              <div className="text-xs text-muted-foreground mt-0.5">PDF-ready summary</div>
            </div>
          </button>
        </div>

      </main>

      <AddBorrowerForm open={showAddModal} onOpenChange={setShowAddModal} />
    </div>
  );
}
