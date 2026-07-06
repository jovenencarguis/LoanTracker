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
  const settledCount = allLoans.length - outstanding.length;
  const totalOutstanding = outstanding.reduce((s, { loan }) => s + loan.currentBalance, 0);

  const renderRow = ({ borrower: b, loan: l }: { borrower: typeof borrowers[number]; loan: typeof borrowers[number]["loans"][number] }, i: number) => (
    <Link key={l.id} href={`/borrowers/${b.id}?loan=${l.id}`}>
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
          {outstanding.length} outstanding · {formatMoney(totalOutstanding)}
          {settledCount > 0 && ` · ${settledCount} settled`}
        </p>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        {outstanding.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">
            {allLoans.length === 0 ? "No loans recorded yet." : "No outstanding loans — everyone's paid up."}
          </p>
        ) : (
          <div className="space-y-1.5">
            {outstanding.map((r, i) => renderRow(r, i))}
          </div>
        )}
      </main>
    </div>
  );
}
