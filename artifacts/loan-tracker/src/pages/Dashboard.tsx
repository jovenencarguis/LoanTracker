import { useLoanData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Users } from "lucide-react";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";

export function Dashboard() {
  const { borrowers, isLoaded, addBorrower } = useLoanData();
  const [showAdd, setShowAdd] = useState(false);

  if (!isLoaded) return null;

  const totalOutstanding = borrowers.reduce(
    (sum, b) => sum + b.loans.reduce((s, l) => s + l.currentBalance, 0),
    0
  );
  const activeBorrowers = borrowers.filter(b => b.loans.some(l => l.currentBalance > 0)).length;

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* Header */}
      <header className="px-6 pt-10 pb-6 border-b border-border bg-card">
        <h1 className="text-2xl font-serif font-bold text-foreground mb-1">Loan Tracker</h1>
        <p className="text-sm text-muted-foreground mb-6">Borrowers Dashboard</p>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Outstanding</span>
            </div>
            <div className="text-lg font-serif font-bold text-primary">{formatMoney(totalOutstanding)}</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Active</span>
            </div>
            <div className="text-lg font-serif font-bold text-foreground">
              {activeBorrowers} <span className="text-sm font-sans font-normal text-muted-foreground">borrowers</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">All Borrowers</h2>
          <Button onClick={() => setShowAdd(true)} size="sm" className="h-8 no-print" data-testid="button-add-borrower">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Borrower
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm border-collapse" data-testid="borrowers-table">
            <thead>
              <tr className="bg-secondary/60 text-left">
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border whitespace-nowrap">#</th>
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border whitespace-nowrap">Name</th>
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap">Total Loans</th>
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Outstanding Balance</th>
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {borrowers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground text-sm">
                    No borrowers yet. Add your first one above.
                  </td>
                </tr>
              ) : (
                borrowers.map((b, i) => {
                  const outstanding = b.loans.reduce((s, l) => s + l.currentBalance, 0);
                  const totalLoans = b.loans.length;
                  return (
                    <tr key={b.id} className={`border-b border-border/50 transition-colors hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`} data-testid={`borrower-row-${b.id}`}>
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium">{b.name}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded-full">{totalLoans}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-serif font-medium text-primary">{formatMoney(outstanding)}</td>
                      <td className="px-4 py-3 text-center">
                        {outstanding > 0 ? (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Pending</span>
                        ) : (
                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Eligible</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center no-print">
                        <Link href={`/borrowers/${b.id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs" data-testid={`button-view-${b.id}`}>
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      <AddBorrowerForm open={showAdd} onOpenChange={setShowAdd} addBorrower={addBorrower} />
    </div>
  );
}
