import { useLoanData, exportData, importData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, Users, BarChart2, TrendingUp, Download, Upload } from "lucide-react";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { formatMoney } from "@/lib/utils";
import { useState, useRef } from "react";
import { toast } from "sonner";
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
  const importRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      await importData(file);
      toast.success("Backup restored — reload to see your data.", {
        action: { label: "Reload", onClick: () => window.location.reload() },
        duration: 10000,
      });
    } catch (err: unknown) {
      toast.error(`Import failed: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  if (!isLoaded) return null;

  const withOutstanding = borrowers.map(b => ({
    borrower: b,
    outstanding: b.loans.reduce((s, l) => s + l.currentBalance, 0),
  }));

  const pending = withOutstanding.filter(r => r.outstanding > 0);
  const eligible = withOutstanding.filter(r => r.outstanding === 0);

  const totalOutstanding = pending.reduce((s, r) => s + r.outstanding, 0);
  const totalLoans = borrowers.reduce((s, b) => s + b.loans.length, 0);
  const totalCollected = borrowers.reduce((s, b) =>
    s + b.loans.reduce((s2, l) =>
      s2 + l.payments.reduce((s3, p) => s3 + p.totalCollected, 0), 0), 0);

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* Hidden file input for import */}
      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Header */}
      <header className="px-6 pt-8 pb-6 border-b border-border bg-card">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-serif font-bold text-foreground">Loan Tracker</h1>
          <div className="flex items-center gap-1.5 no-print">
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => exportData()}>
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => importRef.current?.click()}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-5">Borrowers Dashboard</p>

        {/* Stat cards grid */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          {/* Borrowers */}
          <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Borrowers</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{pending.length}</div>
              <div className="text-xs text-muted-foreground">active</div>
            </div>
          </div>

          {/* Loans */}
          <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Loans</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{formatMoney(totalOutstanding)}</div>
              <div className="text-xs text-muted-foreground">{totalLoans} total loan{totalLoans !== 1 ? "s" : ""}</div>
            </div>
          </div>

          {/* Payments collected */}
          <div className="bg-secondary/50 rounded-lg p-4 flex items-start gap-3">
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Payments</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{formatMoney(totalCollected)}</div>
              <div className="text-xs text-muted-foreground">collected all time</div>
            </div>
          </div>

          {/* Reports shortcut */}
          <Link href="/reports" className="block no-print">
            <div className="bg-primary/8 border border-primary/15 rounded-lg p-4 flex items-start gap-3 hover:bg-primary/12 transition-colors cursor-pointer h-full">
              <div className="bg-primary/15 rounded-md p-1.5 mt-0.5 shrink-0">
                <BarChart2 className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-xs text-primary uppercase tracking-wide mb-0.5 font-medium">Reports</div>
                <div className="text-sm font-medium text-foreground leading-tight">Monthly &amp; Yearly</div>
                <div className="text-xs text-muted-foreground">view breakdown</div>
              </div>
            </div>
          </Link>
        </div>

        {/* Add borrower button */}
        <Button onClick={() => setShowAdd(true)} className="w-full h-10 no-print" data-testid="button-add-borrower">
          <Plus className="w-4 h-4 mr-2" /> Add New Borrower
        </Button>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6 space-y-8 overflow-x-auto">

        {/* Pending section */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending</h2>
            {pending.length > 0 && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{pending.length}</span>
            )}
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
