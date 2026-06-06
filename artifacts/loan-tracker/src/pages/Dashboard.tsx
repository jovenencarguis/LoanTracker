import { useLoanData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Users, BarChart2 } from "lucide-react";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";
import { type Borrower } from "@/hooks/useLoanData";

function BorrowerTable({ rows, emptyMessage }: { rows: { borrower: Borrower; outstanding: number }[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-border px-4 py-6 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-secondary/60 text-left">
            <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border whitespace-nowrap">#</th>
            <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border whitespace-nowrap">Name</th>
            <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap">Loans</th>
            <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Outstanding</th>
            <th className="px-4 py-3 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap no-print">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ borrower: b, outstanding }, i) => (
            <tr key={b.id} className={`border-b border-border/50 transition-colors hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`} data-testid={`borrower-row-${b.id}`}>
              <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
              <td className="px-4 py-3 font-medium">{b.name}</td>
              <td className="px-4 py-3 text-center">
                <span className="text-xs font-medium bg-secondary px-2 py-0.5 rounded-full">{b.loans.length}</span>
              </td>
              <td className="px-4 py-3 text-right font-serif font-medium text-primary">{formatMoney(outstanding)}</td>
              <td className="px-4 py-3 text-center no-print">
                <Link href={`/borrowers/${b.id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs" data-testid={`button-view-${b.id}`}>View</Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Dashboard() {
  const { borrowers, isLoaded, addBorrower } = useLoanData();
  const [showAdd, setShowAdd] = useState(false);

  if (!isLoaded) return null;

  const withOutstanding = borrowers.map(b => ({
    borrower: b,
    outstanding: b.loans.reduce((s, l) => s + l.currentBalance, 0),
  }));

  const pending = withOutstanding.filter(r => r.outstanding > 0);
  const eligible = withOutstanding.filter(r => r.outstanding === 0);

  const totalOutstanding = pending.reduce((s, r) => s + r.outstanding, 0);

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* Header */}
      <header className="px-6 pt-10 pb-6 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-2xl font-serif font-bold text-foreground">Loan Tracker</h1>
          <Link href="/reports">
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground no-print">
              <BarChart2 className="w-4 h-4 mr-1.5" /> Reports
            </Button>
          </Link>
        </div>
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
              {pending.length} <span className="text-sm font-sans font-normal text-muted-foreground">borrowers</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6 space-y-8 overflow-x-auto">

        {/* Pending section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending</h2>
              {pending.length > 0 && (
                <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{pending.length}</span>
              )}
            </div>
            <Button onClick={() => setShowAdd(true)} size="sm" className="h-8 no-print" data-testid="button-add-borrower">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Borrower
            </Button>
          </div>
          <BorrowerTable rows={pending} emptyMessage="No pending borrowers." />
        </section>

        {/* Eligible section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-green-700 uppercase tracking-wider">Eligible</h2>
            {eligible.length > 0 && (
              <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">{eligible.length}</span>
            )}
          </div>
          <BorrowerTable rows={eligible} emptyMessage="No eligible borrowers yet." />
        </section>

      </main>

      <AddBorrowerForm open={showAdd} onOpenChange={setShowAdd} addBorrower={addBorrower} />
    </div>
  );
}
