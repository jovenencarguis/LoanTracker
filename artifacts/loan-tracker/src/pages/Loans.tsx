import { useLoanData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { ArrowLeft, ArrowRight, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/utils";

export function Loans() {
  const { borrowers, isLoaded } = useLoanData();

  if (!isLoaded) return null;

  const allLoans = borrowers.flatMap(b =>
    b.loans.map(l => ({ borrower: b, loan: l }))
  );
  const outstanding = allLoans.filter(({ loan }) => loan.currentBalance > 0);
  const settled = allLoans.filter(({ loan }) => loan.currentBalance === 0);
  const totalOutstanding = outstanding.reduce((s, { loan }) => s + loan.currentBalance, 0);

  const renderRow = ({ borrower: b, loan: l }: { borrower: typeof borrowers[number]; loan: typeof borrowers[number]["loans"][number] }, i: number) => (
    <Link key={l.id} href={`/borrowers/${b.id}/loans/${l.id}`}>
      <div className={`rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors cursor-pointer flex items-center justify-between gap-3 ${i % 2 === 0 ? "bg-background" : "bg-secondary/10"}`} data-testid={`loan-row-${l.id}`}>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{b.name}</div>
          <div className="text-xs text-muted-foreground">
            {l.interestRate}% interest · borrowed {l.dateBorrowed}
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className={`font-serif font-bold text-sm ${l.currentBalance > 0 ? "text-primary" : "text-green-600"}`}>
            {formatMoney(l.currentBalance)}
          </div>
          <div className="text-xs text-muted-foreground">
            {l.currentBalance > 0 ? "outstanding" : "settled"}
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
      </div>
    </Link>
  );

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-1 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" /> Loans
        </h1>
        <p className="text-sm text-muted-foreground">
          {allLoans.length} total · {formatMoney(totalOutstanding)} outstanding
        </p>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        {allLoans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">No loans recorded yet.</p>
        ) : (
          <div className="space-y-6">
            {outstanding.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Outstanding</h3>
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{outstanding.length}</span>
                </div>
                <div className="space-y-1.5">
                  {outstanding.map((r, i) => renderRow(r, i))}
                </div>
              </div>
            )}

            {settled.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">Settled</h3>
                  <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">{settled.length}</span>
                </div>
                <div className="space-y-1.5">
                  {settled.map((r, i) => renderRow(r, i))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
