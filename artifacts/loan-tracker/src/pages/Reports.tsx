import { useLoanData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

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
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());

  if (!isLoaded) return null;

  // ── Build per-month aggregates for the selected year ──
  const yearlyData = Array.from({ length: 12 }, (_, m) => {
    let capital = 0, interest = 0;
    borrowers.forEach(b =>
      b.loans.forEach(loan =>
        loan.payments.forEach(p => {
          const d = new Date(p.date);
          if (d.getMonth() === m && d.getFullYear() === year) {
            capital += p.repayment;
            interest += p.interest;
          }
        })
      )
    );
    return { monthIndex: m, label: MONTH_SHORT[m], capital, interest, total: capital + interest };
  });

  const yearTotal = yearlyData.reduce((s, d) => s + d.total, 0);
  const yearCapital = yearlyData.reduce((s, d) => s + d.capital, 0);
  const yearInterest = yearlyData.reduce((s, d) => s + d.interest, 0);

  // ── Build payment lines for the selected month ──
  const lines: PaymentLine[] = [];
  borrowers.forEach(b =>
    b.loans.forEach(loan =>
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
      })
    )
  );
  lines.sort((a, b) => a.date.localeCompare(b.date));

  const monthCapital = lines.reduce((s, l) => s + l.repayment, 0);
  const monthInterest = lines.reduce((s, l) => s + l.interest, 0);
  const monthTotal = monthCapital + monthInterest;

  return (
    <div className="min-h-[100dvh] w-full max-w-[820px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* Top nav */}
      <header className="px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4 no-print">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-8 text-xs">Print</Button>
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Monthly Reports</h1>
      </header>

      <main className="flex-1 p-4 sm:p-6 space-y-8 overflow-x-auto">

        {/* ── Year Overview ── */}
        <section>
          {/* Year selector + yearly totals */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8 no-print" onClick={() => setYear(y => y - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-base font-semibold min-w-[60px] text-center">{year}</span>
              <Button variant="outline" size="icon" className="h-8 w-8 no-print" onClick={() => setYear(y => y + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground ml-1">— click a bar to see that month</span>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-muted-foreground">Interest: <strong className="text-foreground">{formatMoney(yearInterest)}</strong></span>
              <span className="text-muted-foreground">Capital: <strong className="text-foreground">{formatMoney(yearCapital)}</strong></span>
              <span className="text-primary font-semibold">Total: {formatMoney(yearTotal)}</span>
            </div>
          </div>

          {/* Bar chart */}
          <div className="rounded-lg border border-border bg-card p-4" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                onClick={(data) => {
                  if (data?.activePayload?.[0]) {
                    setMonth(data.activePayload[0].payload.monthIndex);
                  }
                }}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={48}
                  tickFormatter={v => v === 0 ? "0" : `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  cursor={{ fill: "rgba(0,0,0,0.04)" }}
                  formatter={(value: number, name: string) => [formatMoney(value), name === "capital" ? "Principal" : name === "interest" ? "Interest" : "Total"]}
                  labelFormatter={(label) => `${label} ${year}`}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                />
                <Bar dataKey="total" radius={[4, 4, 0, 0]} maxBarSize={36} cursor="pointer">
                  {yearlyData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.monthIndex === month ? "#2C5545" : "#2C554520"}
                      stroke={entry.monthIndex === month ? "#2C5545" : "transparent"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Monthly Drill-Down ── */}
        <section>
          {/* Month selector */}
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" size="icon" className="h-8 w-8 no-print"
              onClick={() => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); }}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-base font-semibold min-w-[140px] text-center">{MONTH_NAMES[month]} {year}</span>
            <Button variant="outline" size="icon" className="h-8 w-8 no-print"
              onClick={() => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); }}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Month summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Capital</div>
              <div className="font-serif font-bold">{formatMoney(monthCapital)}</div>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3 text-center">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Interest</div>
              <div className="font-serif font-bold">{formatMoney(monthInterest)}</div>
            </div>
            <div className="bg-primary/8 border border-primary/15 rounded-lg p-3 text-center">
              <div className="text-xs text-primary mb-1 uppercase tracking-wide font-medium">Total</div>
              <div className="font-serif font-bold text-primary">{formatMoney(monthTotal)}</div>
            </div>
          </div>

          {/* Payment breakdown table */}
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Payment Breakdown — {lines.length} transaction{lines.length !== 1 ? "s" : ""}
          </div>
          <div className="rounded-lg border border-border overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-secondary/60 text-left">
                  <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border">#</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border">Borrower</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border">Date</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right">Principal</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right">Interest</th>
                  <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground text-sm">
                      No payments recorded for {MONTH_NAMES[month]} {year}.
                    </td>
                  </tr>
                ) : (
                  <>
                    {lines.map((line, i) => (
                      <tr key={i} className={`border-b border-border/50 hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                        <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2.5 font-medium">{line.borrowerName}</td>
                        <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{line.date}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(line.repayment)}</td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(line.interest)}</td>
                        <td className="px-3 py-2.5 text-right font-serif font-medium text-primary">{formatMoney(line.totalCollected)}</td>
                      </tr>
                    ))}
                    <tr className="bg-secondary/40 font-medium">
                      <td colSpan={3} className="px-3 py-2.5 text-right text-muted-foreground text-xs uppercase tracking-wide">Totals</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(monthCapital)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(monthInterest)}</td>
                      <td className="px-3 py-2.5 text-right font-serif text-primary">{formatMoney(monthTotal)}</td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
