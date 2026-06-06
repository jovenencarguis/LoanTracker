import { useLoanData, exportData, importData } from "@/hooks/useLoanData";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Wallet, Users, BarChart2, TrendingUp, Download, Upload, ArrowRight, ChevronLeft, Bell } from "lucide-react";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import { formatMoney } from "@/lib/utils";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { type Borrower, type Loan } from "@/hooks/useLoanData";

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

function AllLoansDialog({ open, onOpenChange, borrowers }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  borrowers: Borrower[];
}) {
  const allLoans = borrowers.flatMap(b =>
    b.loans.map(l => ({ borrower: b, loan: l }))
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">All Loans</DialogTitle>
          <DialogDescription>Browse all loans across every borrower. Tap a row to open its detail page.</DialogDescription>
        </DialogHeader>
        {allLoans.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No loans recorded yet.</p>
        ) : (
          <div className="space-y-2 mt-1">
            {allLoans.map(({ borrower: b, loan: l }, i) => (
              <Link key={l.id} href={`/borrowers/${b.id}/loans/${l.id}`} onClick={() => onOpenChange(false)}>
                <div className={`rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors cursor-pointer flex items-center justify-between gap-3 ${i % 2 === 0 ? "bg-background" : "bg-secondary/10"}`}>
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
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Payment due-date logic ─────────────────────────────────────────────────
type PaymentStatus =
  | { kind: "paid";      lastDate: string; nextDueDate: Date }
  | { kind: "overdue";   lastDate: string; nextDueDate: Date; daysLate: number }
  | { kind: "due-soon";  lastDate: string; nextDueDate: Date; daysLeft: number }
  | { kind: "upcoming";  lastDate: string; nextDueDate: Date; daysLeft: number };

function getPaymentStatus(loan: Loan): PaymentStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastPayment = loan.payments.length > 0
    ? loan.payments[loan.payments.length - 1]
    : null;

  const refDateStr = lastPayment ? lastPayment.date : loan.dateBorrowed;
  const refDate = new Date(refDateStr);

  // Paid if last payment is in the current calendar month
  if (lastPayment) {
    const lp = new Date(lastPayment.date);
    if (lp.getMonth() === today.getMonth() && lp.getFullYear() === today.getFullYear()) {
      const next = new Date(lp);
      next.setMonth(next.getMonth() + 1);
      return { kind: "paid", lastDate: lastPayment.date, nextDueDate: next };
    }
  }

  // Next due = ref date + 1 month
  const nextDue = new Date(refDate);
  nextDue.setMonth(nextDue.getMonth() + 1);

  const diffDays = Math.ceil((nextDue.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0)  return { kind: "overdue",  lastDate: refDateStr, nextDueDate: nextDue, daysLate: -diffDays };
  if (diffDays <= 7) return { kind: "due-soon", lastDate: refDateStr, nextDueDate: nextDue, daysLeft: diffDays };
  return                    { kind: "upcoming", lastDate: refDateStr, nextDueDate: nextDue, daysLeft: diffDays };
}

interface LoanNotification {
  borrower: Borrower;
  loan: Loan;
  status: PaymentStatus;
}

function statusLabel(s: PaymentStatus) {
  if (s.kind === "paid")     return "Paid this month";
  if (s.kind === "overdue")  return `Overdue by ${s.daysLate} day${s.daysLate !== 1 ? "s" : ""}`;
  if (s.kind === "due-soon") return s.daysLeft === 0 ? "Due today!" : `Due in ${s.daysLeft} day${s.daysLeft !== 1 ? "s" : ""}`;
  return `Due in ${(s as { daysLeft: number }).daysLeft} days`;
}

const STATUS_STYLES: Record<PaymentStatus["kind"], string> = {
  overdue:   "bg-red-50 border-red-200 text-red-700",
  "due-soon":"bg-amber-50 border-amber-200 text-amber-700",
  upcoming:  "bg-blue-50 border-blue-200 text-blue-700",
  paid:      "bg-green-50 border-green-200 text-green-700",
};

const BADGE_STYLES: Record<PaymentStatus["kind"], string> = {
  overdue:   "bg-red-100 text-red-700 border border-red-200",
  "due-soon":"bg-amber-100 text-amber-700 border border-amber-200",
  upcoming:  "bg-blue-100 text-blue-700 border border-blue-200",
  paid:      "bg-green-100 text-green-700 border border-green-200",
};

function NotificationsDialog({ open, onOpenChange, notifications }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  notifications: LoanNotification[];
}) {
  const order: PaymentStatus["kind"][] = ["overdue", "due-soon", "upcoming", "paid"];
  const sorted = [...notifications].sort(
    (a, b) => order.indexOf(a.status.kind) - order.indexOf(b.status.kind)
  );

  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[82vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" /> Payment Notifications
          </DialogTitle>
          <DialogDescription>
            Monthly payment status for all active loans.
          </DialogDescription>
        </DialogHeader>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 text-xs mt-1">
          {(["overdue", "due-soon", "upcoming", "paid"] as PaymentStatus["kind"][]).map(k => (
            <span key={k} className={`px-2 py-0.5 rounded-full font-medium ${BADGE_STYLES[k]}`}>
              {k === "overdue" ? "Overdue" : k === "due-soon" ? "Due Soon" : k === "upcoming" ? "Upcoming" : "Paid"}
            </span>
          ))}
        </div>

        <div className="space-y-2 mt-2">
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground py-6 text-center">No active loans to track.</p>
          )}
          {sorted.map(({ borrower: b, loan: l, status: s }) => (
            <Link
              key={`${b.id}-${l.id}`}
              href={`/borrowers/${b.id}/loans/${l.id}`}
              onClick={() => onOpenChange(false)}
            >
              <div className={`rounded-lg border p-3 transition-colors hover:opacity-90 cursor-pointer ${STATUS_STYLES[s.kind]}`}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div>
                    <div className="font-semibold text-sm">{b.name}</div>
                    <div className="text-xs opacity-70">{formatMoney(l.startingBalance)} loan · {l.interestRate}% interest</div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${BADGE_STYLES[s.kind]}`}>
                    {statusLabel(s)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs opacity-80">
                  <span>Last payment: <strong>{s.lastDate}</strong></span>
                  <span>Next due: <strong>{fmt(s.nextDueDate)}</strong></span>
                </div>
                <div className="mt-1.5 text-xs opacity-70 font-medium">
                  Balance remaining: {formatMoney(l.currentBalance)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Quick Payment wizard: Pick borrower → pick loan → add payment ──────────
type QpStep =
  | { kind: "borrowers" }
  | { kind: "loans"; borrower: Borrower }
  | { kind: "payment"; borrower: Borrower; loan: Loan };

function QuickPaymentDialog({ open, onOpenChange, borrowers, addPayment }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  borrowers: Borrower[];
  addPayment: (borrowerId: string, loanId: string, data: { date: string; repayment: number; interest?: number }) => void;
}) {
  const [step, setStep] = useState<QpStep>({ kind: "borrowers" });

  const reset = () => setStep({ kind: "borrowers" });
  const handleClose = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  // Only borrowers that have at least one loan with balance > 0
  const activeBorrowers = borrowers.filter(b => b.loans.some(l => l.currentBalance > 0));

  if (step.kind === "payment") {
    const { borrower, loan } = step;
    return (
      <AddPaymentForm
        loan={loan}
        open={open}
        onOpenChange={(v) => { handleClose(v); }}
        addPayment={(data) => {
          addPayment(borrower.id, loan.id, data);
          toast.success("Payment recorded");
          handleClose(false);
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step.kind === "loans" && (
              <button
                type="button"
                onClick={() => setStep({ kind: "borrowers" })}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <DialogTitle className="font-serif">
              {step.kind === "borrowers" ? "Record a Payment" : `${step.borrower.name} — Select Loan`}
            </DialogTitle>
          </div>
          <DialogDescription>
            {step.kind === "borrowers"
              ? "Choose a borrower to record a payment for."
              : "Choose which loan to apply the payment to."}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: borrower list */}
        {step.kind === "borrowers" && (
          <div className="space-y-2 mt-1">
            {activeBorrowers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">No borrowers with an outstanding balance.</p>
            ) : activeBorrowers.map((b) => {
              const outstanding = b.loans.reduce((s, l) => s + l.currentBalance, 0);
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setStep({ kind: "loans", borrower: b })}
                  className="w-full rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors flex items-center justify-between gap-3 text-left"
                >
                  <div>
                    <div className="text-sm font-medium">{b.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {b.loans.filter(l => l.currentBalance > 0).length} active loan{b.loans.filter(l => l.currentBalance > 0).length !== 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-serif font-bold text-primary text-sm">{formatMoney(outstanding)}</div>
                    <div className="text-xs text-muted-foreground">outstanding</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* Step 2: loan list for selected borrower */}
        {step.kind === "loans" && (
          <div className="space-y-2 mt-1">
            {step.borrower.loans.filter(l => l.currentBalance > 0).map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setStep({ kind: "payment", borrower: step.borrower, loan: l })}
                className="w-full rounded-lg border border-border p-3 hover:bg-secondary/50 transition-colors flex items-center justify-between gap-3 text-left"
              >
                <div>
                  <div className="text-sm font-medium">{formatMoney(l.startingBalance)} loan</div>
                  <div className="text-xs text-muted-foreground">
                    {l.interestRate}% interest · since {l.dateBorrowed}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-serif font-bold text-primary text-sm">{formatMoney(l.currentBalance)}</div>
                  <div className="text-xs text-muted-foreground">remaining</div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function Dashboard() {
  const { borrowers, isLoaded, addBorrower, addPayment } = useLoanData();
  const [showAdd, setShowAdd] = useState(false);
  const [showLoans, setShowLoans] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const tableRef = useRef<HTMLElement>(null);
  const [, navigate] = useLocation();

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

  const scrollToBorrowers = () => {
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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

  // Notifications — all active loans with their payment status
  const notifications: LoanNotification[] = borrowers.flatMap(b =>
    b.loans
      .filter(l => l.currentBalance > 0)
      .map(l => ({ borrower: b, loan: l, status: getPaymentStatus(l) }))
  );
  const urgentCount = notifications.filter(n => n.status.kind === "overdue" || n.status.kind === "due-soon").length;

  const cardBase = "rounded-lg p-4 flex items-start gap-3 cursor-pointer transition-all duration-150 select-none active:scale-[0.97]";
  const cardDefault = `bg-secondary/50 hover:bg-secondary/80 hover:shadow-sm ${cardBase}`;
  const cardPrimary = `bg-primary/8 border border-primary/15 hover:bg-primary/14 hover:shadow-sm ${cardBase}`;

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col print:max-w-none">

      <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />

      {/* Header */}
      <header className="px-6 pt-8 pb-6 border-b border-border bg-card">
        <div className="flex items-start justify-between mb-1">
          <h1 className="text-2xl font-serif font-bold text-foreground">Loan Tracker</h1>
          <div className="flex items-center gap-1.5 no-print">
            {/* Notification bell */}
            <button
              type="button"
              onClick={() => setShowNotifications(true)}
              className="relative h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
              aria-label="Payment notifications"
            >
              <Bell className="w-4 h-4" />
              {urgentCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
                  {urgentCount}
                </span>
              )}
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
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

        {/* Stat cards — each is clickable */}
        <div className="grid grid-cols-2 gap-3 mb-3">

          {/* Borrowers → scroll to table */}
          <button type="button" className={`${cardDefault} w-full text-left`} onClick={scrollToBorrowers}>
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Borrowers</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{pending.length}</div>
              <div className="text-xs text-muted-foreground">active ↓</div>
            </div>
          </button>

          {/* Loans → open all-loans modal */}
          <button type="button" className={`${cardDefault} w-full text-left`} onClick={() => setShowLoans(true)}>
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Loans</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{formatMoney(totalOutstanding)}</div>
              <div className="text-xs text-muted-foreground">{totalLoans} loan{totalLoans !== 1 ? "s" : ""} — view all</div>
            </div>
          </button>

          {/* Payments → open quick-payment wizard */}
          <button type="button" className={`${cardDefault} w-full text-left`} onClick={() => setShowPayment(true)}>
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Payments</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{formatMoney(totalCollected)}</div>
              <div className="text-xs text-muted-foreground">collected — add payment</div>
            </div>
          </button>

          {/* Reports → navigate to /reports */}
          <Link href="/reports" className="block no-print">
            <div className={`${cardPrimary} h-full`}>
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

        <Button onClick={() => setShowAdd(true)} className="w-full h-10 no-print" data-testid="button-add-borrower">
          <Plus className="w-4 h-4 mr-2" /> Add New Borrower
        </Button>
      </header>

      {/* Main */}
      <main ref={tableRef} className="flex-1 p-4 sm:p-6 space-y-8 overflow-x-auto scroll-mt-4">

        <section>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending</h2>
            {pending.length > 0 && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{pending.length}</span>
            )}
          </div>
          <BorrowerTable rows={pending} emptyMessage="No pending borrowers." />
        </section>

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
      <AllLoansDialog open={showLoans} onOpenChange={setShowLoans} borrowers={borrowers} />
      <QuickPaymentDialog
        open={showPayment}
        onOpenChange={setShowPayment}
        borrowers={borrowers}
        addPayment={addPayment}
      />
      <NotificationsDialog
        open={showNotifications}
        onOpenChange={setShowNotifications}
        notifications={notifications}
      />
    </div>
  );
}
