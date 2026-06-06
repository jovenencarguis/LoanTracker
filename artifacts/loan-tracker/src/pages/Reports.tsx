import { useLoanData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface PaymentLine {
  borrowerName: string;
  date: string;
  repayment: number;
  interest: number;
  totalCollected: number;
}

export function Reports() {
  const { borrowers, isLoaded } = useLoanData();
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  if (!isLoaded) return null;

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const lines: PaymentLine[] = [];
  borrowers.forEach(b => {
    b.loans.forEach(loan => {
      loan.payments.forEach(p => {
        const d = new Date(p.date);
        if (d.getMonth() === month && d.getFullYear() === year) {
          lines.push({
            borrowerName: b.name,
            date: p.date,
            repayment: p.repayment,
            interest: p.interest,
            totalCollected: p.totalCollected,
          });
        }
      });
    });
  });

  lines.sort((a, b) => a.date.localeCompare(b.date));

  const totalCapital = lines.reduce((s, l) => s + l.repayment, 0);
  const totalInterest = lines.reduce((s, l) => s + l.interest, 0);
  const totalEarned = totalCapital + totalInterest;

  return (
    <div className="min-h-[100dvh] w-full max-w-[800px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-card print:border-b-2 print:border-black">
        <div className="flex items-center justify-between mb-4 no-print">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs">
            Print
          </Button>
        </div>

        <h1 className="text-2xl font-serif font-bold text-foreground mb-4">Monthly Report</h1>

        {/* Month navigator */}
        <div className="flex items-center gap-3 no-print">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-base font-medium min-w-[160px] text-center">
            {MONTH_NAMES[month]} {year}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="print-only text-sm font-medium mt-1">{MONTH_NAMES[month]} {year}</div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Capital Repaid</div>
            <div className="font-serif font-bold text-foreground">{formatMoney(totalCapital)}</div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Interest Earned</div>
            <div className="font-serif font-bold text-foreground">{formatMoney(totalInterest)}</div>
          </div>
          <div className="bg-primary/8 border border-primary/15 rounded-lg p-3 text-center">
            <div className="text-xs text-primary mb-1 uppercase tracking-wide font-medium">Total Collected</div>
            <div className="font-serif font-bold text-primary">{formatMoney(totalEarned)}</div>
          </div>
        </div>
      </header>

      {/* Payment breakdown table */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Payment Breakdown — {lines.length} transaction{lines.length !== 1 ? "s" : ""}
        </h2>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-secondary/60 text-left">
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border whitespace-nowrap">#</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border whitespace-nowrap">Borrower</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border whitespace-nowrap">Date</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Principal</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Interest</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Total</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground text-sm">
                    No payments recorded for {MONTH_NAMES[month]} {year}.
                  </td>
                </tr>
              ) : (
                <>
                  {lines.map((line, i) => (
                    <tr key={i} className={`border-b border-border/50 transition-colors hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                      <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 font-medium">{line.borrowerName}</td>
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{line.date}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(line.repayment)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(line.interest)}</td>
                      <td className="px-3 py-2.5 text-right font-serif font-medium text-primary">{formatMoney(line.totalCollected)}</td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr className="bg-secondary/40 font-medium">
                    <td colSpan={3} className="px-3 py-2.5 text-right text-muted-foreground text-xs uppercase tracking-wide">Totals</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(totalCapital)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(totalInterest)}</td>
                    <td className="px-3 py-2.5 text-right font-serif text-primary">{formatMoney(totalEarned)}</td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
