import { useLoanData, exportData, importData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Wallet, Users, BarChart2, TrendingUp, Download, Upload, ArrowRight, Bell, UserPlus, CreditCard } from "lucide-react";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import { formatMoney } from "@/lib/utils";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { type Borrower, type Loan } from "@/hooks/useLoanData";

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
      <DialogContent className="max-w-md max-h-[85dvh] overflow-y-auto overscroll-contain">
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

export function Dashboard() {
  const { borrowers, isLoaded, addBorrower } = useLoanData();
  const [showAdd, setShowAdd] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
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

          {/* Borrowers → navigate to /borrowers */}
          <Link href="/borrowers" className={`${cardDefault} w-full text-left no-print`}>
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Borrowers</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{pending.length}</div>
              <div className="text-xs text-muted-foreground">active — view all</div>
            </div>
          </Link>

          {/* Loans → navigate to /loans (browse all loans) */}
          <Link href="/loans" className={`${cardDefault} w-full text-left no-print`}>
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Loans</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{formatMoney(totalOutstanding)}</div>
              <div className="text-xs text-muted-foreground">{totalLoans} loan{totalLoans !== 1 ? "s" : ""} outstanding — browse list</div>
            </div>
          </Link>

          {/* Payments → navigate to /payments (record a new payment) */}
          <Link href="/payments" className={`${cardDefault} w-full text-left no-print`}>
            <div className="bg-primary/10 rounded-md p-1.5 mt-0.5 shrink-0">
              <TrendingUp className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide mb-0.5">Payments</div>
              <div className="font-serif font-bold text-foreground text-lg leading-tight">{formatMoney(totalCollected)}</div>
              <div className="text-xs text-muted-foreground">collected so far — tap to record new</div>
            </div>
          </Link>

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

        {/* Quick action buttons */}
        <div className="grid grid-cols-3 gap-2 no-print">
          <Button
            onClick={() => setShowAdd(true)}
            className="flex flex-col h-auto py-3 gap-1.5"
            data-testid="button-add-borrower"
          >
            <UserPlus className="w-4 h-4" />
            <span className="text-xs font-medium">Add Borrower</span>
          </Button>
          <Button
            variant="secondary"
            className="flex flex-col h-auto py-3 gap-1.5"
            asChild
          >
            <Link href="/payments">
              <CreditCard className="w-4 h-4" />
              <span className="text-xs font-medium">Add Payment</span>
            </Link>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col h-auto py-3 gap-1.5"
            asChild
          >
            <Link href="/reports">
              <BarChart2 className="w-4 h-4" />
              <span className="text-xs font-medium">Reports</span>
            </Link>
          </Button>
        </div>
      </header>

      <AddBorrowerForm open={showAdd} onOpenChange={setShowAdd} addBorrower={addBorrower} existingBorrowers={borrowers} />
      <NotificationsDialog
        open={showNotifications}
        onOpenChange={setShowNotifications}
        notifications={notifications}
      />
    </div>
  );
}
