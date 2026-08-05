import { useLoanData, type Loan, type SkipRecord } from "@/hooks/useLoanData";
import { Link, useParams, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, PenLine, Trash2, Mail, Phone, FileText, ChevronDown, ChevronUp, Printer, Calendar, Percent, X, SkipForward, PrinterCheck } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import { getPaymentStatus, statusLabel, BADGE_STYLES } from "@/lib/loanUtils";
import NotFound from "./not-found";
import { AddLoanForm } from "@/components/AddLoanForm";
import { EditBorrowerForm } from "@/components/EditBorrowerForm";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import { EditLoanForm } from "@/components/EditLoanForm";
import { SkipPeriodForm } from "@/components/SkipPeriodForm";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type TableEvent =
  | { kind: "payment"; seq: number; data: import("@/hooks/useLoanData").Payment }
  | { kind: "skip";    seq: number; data: SkipRecord };

function PaymentHistoryTable({
  loan, onDeletePayment, onDeleteSkip, hideActions,
}: {
  loan: Loan;
  onDeletePayment: (paymentId: string) => void;
  onDeleteSkip?: (skipId: string) => void;
  hideActions?: boolean;
}) {
  const colCount = hideActions ? 7 : 8;

  const events: TableEvent[] = [
    ...loan.payments.map(p => ({ kind: "payment" as const, date: p.date, data: p })),
    ...(loan.skips ?? []).map(s => ({ kind: "skip" as const, date: s.date, data: s })),
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e, i) => ({ kind: e.kind, seq: i + 1, data: e.data } as TableEvent));

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm border-collapse" data-testid="payment-history-table">
        <thead>
          <tr className="bg-secondary/60 text-left">
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border whitespace-nowrap">#</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border whitespace-nowrap">Date</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Prev Balance</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Interest</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Principal</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Total Collected</th>
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">New Balance</th>
            {!hideActions && (
              <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap no-print">Action</th>
            )}
          </tr>
        </thead>
        <tbody>
          {/* Row 0 — loan origination */}
          <tr className="border-b border-border/50 bg-secondary/20">
            <td className="px-3 py-2.5 text-muted-foreground">0</td>
            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(loan.dateBorrowed)}</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right font-serif font-medium">{formatMoney(loan.startingBalance)}</td>
            {!hideActions && <td className="px-3 py-2.5 no-print" />}
          </tr>

          {events.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-3 py-8 text-center text-muted-foreground text-sm">No payments recorded yet.</td>
            </tr>
          ) : (
            events.map((ev) => {
              if (ev.kind === "payment") {
                const payment = ev.data;
                const isInterestOnly = payment.type === "interest-only";
                return (
                  <tr key={payment.id} className="border-b border-border/50 transition-colors hover:bg-secondary/30" data-testid={`payment-row-${payment.id}`}>
                    <td className="px-3 py-2.5 text-muted-foreground">{ev.seq}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(payment.date)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(payment.previousBalance)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(payment.interest)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs">
                      {isInterestOnly ? <span className="text-muted-foreground">—</span> : formatMoney(payment.repayment)}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-xs font-medium">{formatMoney(payment.totalCollected)}</td>
                    <td className="px-3 py-2.5 text-right font-serif font-medium text-primary">{formatMoney(payment.newBalance)}</td>
                    {!hideActions && (
                      <td className="px-3 py-2.5 text-center no-print">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeletePayment(payment.id)} data-testid={`button-delete-payment-${payment.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </td>
                    )}
                  </tr>
                );
              }

              // Skip row
              const skip = ev.data;
              return (
                <tr key={skip.id} className="border-b border-amber-100 bg-amber-50/60 transition-colors hover:bg-amber-50" data-testid={`skip-row-${skip.id}`}>
                  <td className="px-3 py-2.5 text-amber-600">{ev.seq}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span>{formatDate(skip.date)}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded">Deferred</span>
                    </div>
                    <div className="text-xs text-amber-600 mt-0.5">{skip.reason}</div>
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-amber-700">{formatMoney(skip.previousBalance)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs text-amber-700">
                    <span title="Capitalized — added to balance">+{formatMoney(skip.interestCapitalized)}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-amber-400">—</td>
                  <td className="px-3 py-2.5 text-right text-amber-400">—</td>
                  <td className="px-3 py-2.5 text-right font-serif font-medium text-amber-800">{formatMoney(skip.newBalance)}</td>
                  {!hideActions && (
                    <td className="px-3 py-2.5 text-center no-print">
                      {onDeleteSkip && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeleteSkip(skip.id)} data-testid={`button-delete-skip-${skip.id}`}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}

          {loan.currentBalance === 0 && events.length > 0 && (
            <tr className="bg-green-50/50">
              <td colSpan={colCount} className="px-3 py-3 text-center text-sm font-medium text-green-700">Loan fully settled</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function BorrowerDetail() {
  const { borrowerId } = useParams();
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { borrowers, getBorrower, isLoaded, updateBorrower, deleteBorrower, addLoan, addPayment, updateLoan, deleteLoan, deletePayment, markLoanAsPaid, addSkip, deleteSkip } = useLoanData();

  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showEditBorrower, setShowEditBorrower] = useState(false);
  const [showDeleteBorrower, setShowDeleteBorrower] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [loanToSettle, setLoanToSettle] = useState<string | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [addPaymentLoanId, setAddPaymentLoanId] = useState<string | null>(null);
  const [skipLoanId, setSkipLoanId] = useState<string | null>(null);
  const [editLoanId, setEditLoanId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{ loanId: string; paymentId: string } | null>(null);
  const [skipToDelete, setSkipToDelete] = useState<{ loanId: string; skipId: string } | null>(null);
  const [screenshotLoanId, setScreenshotLoanId] = useState<string | null>(null);

  const hasAutoExpanded = useRef(false);
  const expandedRef = useRef<HTMLDivElement>(null);
  const borrower = borrowerId ? getBorrower(borrowerId) : undefined;

  useEffect(() => {
    if (hasAutoExpanded.current) return;
    if (!borrower) return;

    const params = new URLSearchParams(search);
    const loanParam = params.get("loan");
    if (loanParam) {
      setExpandedLoanId(loanParam);
      hasAutoExpanded.current = true;
      setTimeout(() => expandedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      return;
    }

    // No specific loan requested — auto-expand so payment history is visible
    // without an extra click. Prefer the single active loan; otherwise the
    // most recently borrowed loan.
    const active = borrower.loans.filter(l => l.currentBalance > 0);
    const defaultLoan = active.length === 1 ? active[0] : borrower.loans[borrower.loans.length - 1];
    if (defaultLoan) {
      setExpandedLoanId(defaultLoan.id);
    }
    hasAutoExpanded.current = true;
  }, [search, borrower]);

  if (!isLoaded) return null;
  if (!borrowerId) return <NotFound />;
  if (!borrower) return <NotFound />;

  const totalOutstanding = borrower.loans.reduce((s, l) => s + l.currentBalance, 0);
  const activeLoans = borrower.loans.filter(l => l.currentBalance > 0).length;
  const addPaymentLoan = addPaymentLoanId ? borrower.loans.find(l => l.id === addPaymentLoanId) : undefined;
  const editLoan = editLoanId ? borrower.loans.find(l => l.id === editLoanId) : undefined;
  const screenshotLoan = screenshotLoanId ? borrower.loans.find(l => l.id === screenshotLoanId) : undefined;

  const avatarColors = ["bg-emerald-700","bg-blue-600","bg-violet-600","bg-rose-600","bg-amber-600","bg-teal-600","bg-cyan-700","bg-indigo-600"];
  const avatarBg = avatarColors[borrower.name.split("").reduce((a,c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  const initials = (() => { const p = borrower.name.trim().split(/\s+/); return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase(); })();

  // ── Full-page clean view for screenshot / print ──────────────────────────
  if (screenshotLoan) {
    return (
      <div className="bg-white w-full min-h-screen">
        <div className="max-w-[720px] mx-auto px-6 pt-6 pb-16">
          {/* Toolbar — hidden when printing */}
          <div className="flex items-center justify-between mb-6 no-print">
            <button
              onClick={() => setScreenshotLoanId(null)}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              <X className="w-4 h-4" /> Close
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 rounded-lg px-3 py-1.5 transition-colors"
            >
              <PrinterCheck className="w-4 h-4" /> Print / Save PDF
            </button>
          </div>

          {/* Header */}
          <div className="mb-6 pb-5 border-b border-gray-200">
            <h1 className="text-3xl font-serif font-bold text-gray-900 leading-tight">{borrower.name}</h1>
            {(borrower.email || borrower.phone) && (
              <p className="text-sm text-gray-500 mt-1">
                {[borrower.email, borrower.phone].filter(Boolean).join(" · ")}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
              <span><span className="font-medium">Loan amount:</span> {formatMoney(screenshotLoan.startingBalance)}</span>
              <span><span className="font-medium">Interest rate:</span> {screenshotLoan.interestRate}% per period</span>
              <span><span className="font-medium">Date borrowed:</span> {formatDate(screenshotLoan.dateBorrowed)}</span>
              {screenshotLoan.paymentIntervalDays && (
                <span><span className="font-medium">Interval:</span> every {screenshotLoan.paymentIntervalDays} days</span>
              )}
            </div>
            <p className="text-sm font-semibold mt-2" style={{ color: screenshotLoan.currentBalance <= 0 ? "rgb(22 163 74)" : "#2C5545" }}>
              {screenshotLoan.currentBalance <= 0
                ? "Fully settled"
                : `${formatMoney(screenshotLoan.currentBalance)} outstanding`}
            </p>
            {screenshotLoan.notes && (
              <p className="mt-2 text-sm text-gray-500 italic">{screenshotLoan.notes}</p>
            )}
          </div>

          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Payment History</h2>
          <PaymentHistoryTable loan={screenshotLoan} onDeletePayment={() => {}} hideActions />

          {/* Summary footer */}
          <div className="mt-6 pt-4 border-t border-gray-200 flex flex-wrap gap-6 text-sm text-gray-600">
            <span><span className="font-medium">Total payments:</span> {screenshotLoan.payments.length}</span>
            <span>
              <span className="font-medium">Total collected:</span>{" "}
              {formatMoney(screenshotLoan.payments.reduce((s, p) => s + p.totalCollected, 0))}
            </span>
            <span>
              <span className="font-medium">Principal repaid:</span>{" "}
              {formatMoney(screenshotLoan.startingBalance - screenshotLoan.currentBalance)}
            </span>
          </div>
          <p className="mt-4 text-xs text-gray-400">Generated {new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-[900px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* Header — profile style */}
      <header className="relative bg-card border-b border-border">
        {/* Cover backdrop */}
        <div
          className="h-24 sm:h-28 w-full"
          style={{ background: "linear-gradient(135deg, var(--color-primary) 0%, rgba(44,85,69,0.65) 100%)" }}
        />

        <div className="flex items-center justify-between px-4 sm:px-6 pt-3 absolute top-0 left-0 right-0 no-print">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/90 hover:text-white transition-colors drop-shadow-sm">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowEditBorrower(true)} className="text-white/90 hover:text-white hover:bg-white/15">
              <PenLine className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteBorrower(true)} className="text-white/90 hover:text-white hover:bg-white/15">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-5 -mt-10 sm:-mt-12">
          <div className="flex flex-col items-center text-center">
            <div className={`shrink-0 w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center text-white font-serif font-bold text-2xl sm:text-3xl select-none ring-4 ring-card shadow-md ${avatarBg}`}>
              {initials}
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-foreground mt-3">{borrower.name}</h1>

            <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 mt-2">
              {borrower.email && (
                <a href={`mailto:${borrower.email}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Mail className="w-3 h-3 shrink-0" /> {borrower.email}
                </a>
              )}
              {borrower.phone && (
                <a href={`tel:${borrower.phone}`} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Phone className="w-3 h-3 shrink-0" /> {borrower.phone}
                </a>
              )}
            </div>

            <div className="flex items-stretch gap-2 sm:gap-3 mt-5 w-full max-w-sm">
              <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-center">
                <div className="font-serif font-bold text-lg text-foreground">{borrower.loans.length}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Loan{borrower.loans.length !== 1 ? "s" : ""}</div>
              </div>
              <div className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-center">
                <div className="font-serif font-bold text-lg text-foreground">{activeLoans}</div>
                <div className="text-[11px] text-muted-foreground uppercase tracking-wide mt-0.5">Active</div>
              </div>
              <div className="flex-[1.4] rounded-xl border border-primary/20 bg-primary/8 px-3 py-2.5 text-center">
                <div className="font-serif font-bold text-lg text-primary">{formatMoney(totalOutstanding)}</div>
                <div className="text-[11px] text-primary/80 uppercase tracking-wide mt-0.5">Outstanding</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Loans</h2>
          {activeLoans === 0 && (
            <Button
              onClick={() => setShowAddLoan(true)}
              size="sm" className="h-8 no-print" data-testid="button-add-loan">
              <Plus className="w-3.5 h-3.5 mr-1" /> Add Loan
            </Button>
          )}
        </div>

        {borrower.loans.length === 0 ? (
          <div className="rounded-lg border border-border py-10 text-center text-muted-foreground text-sm">
            No loans yet. Add the first one above.
          </div>
        ) : (
          <div className="space-y-2">
            {borrower.loans.map((loan, i) => {
              const settled = loan.currentBalance <= 0;
              const isExpanded = expandedLoanId === loan.id;
              const progress = loan.startingBalance > 0
                ? Math.min(100, Math.round(((loan.startingBalance - loan.currentBalance) / loan.startingBalance) * 100))
                : 0;
              return (
                <div
                  key={loan.id}
                  ref={isExpanded ? expandedRef : undefined}
                  className="rounded-lg border border-border overflow-hidden"
                  data-testid={`loan-card-${loan.id}`}
                >
                  {/* Summary row — click to expand/collapse */}
                  <button
                    type="button"
                    onClick={() => setExpandedLoanId(isExpanded ? null : loan.id)}
                    className={`w-full flex items-center justify-between gap-3 p-3 text-left transition-colors hover:bg-secondary/40 ${i % 2 === 0 ? "bg-background" : "bg-secondary/10"}`}
                    data-testid={`button-toggle-loan-${loan.id}`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{formatMoney(loan.startingBalance)} loan</span>
                        {settled ? (
                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Settled</span>
                        ) : (
                          <>
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Active</span>
                            {(() => {
                              const ps = getPaymentStatus(loan);
                              return (
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${BADGE_STYLES[ps.kind]}`}>
                                  {statusLabel(ps)}
                                </span>
                              );
                            })()}
                          </>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {loan.interestRate}% interest · borrowed {formatDate(loan.dateBorrowed)}
                      </div>
                      <div className="mt-1.5 h-1 bg-secondary rounded-full overflow-hidden max-w-[160px]">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${progress}%`,
                            background: settled ? "rgb(22 163 74)" : "var(--color-primary)",
                            opacity: settled ? 1 : 0.6,
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-serif font-bold text-sm text-primary">{formatMoney(loan.currentBalance)}</div>
                      <div className="text-xs text-muted-foreground">{settled ? "settled" : "remaining"}</div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="p-3 sm:p-4 border-t border-border bg-card">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3 no-print">
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(loan.dateBorrowed)}</span>
                          <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> {loan.interestRate}% per period</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => setScreenshotLoanId(loan.id)} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Screenshot-friendly view" data-testid={`button-screenshot-loan-${loan.id}`}>
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setEditLoanId(loan.id)} className="h-7 w-7 text-muted-foreground hover:text-foreground">
                            <PenLine className="w-3.5 h-3.5" />
                          </Button>
                          {!settled && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-700 hover:text-green-800 hover:bg-green-50" onClick={() => setLoanToSettle(loan.id)} data-testid={`button-settle-loan-${loan.id}`}>
                              Settle
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setLoanToDelete(loan.id)} data-testid={`button-delete-loan-${loan.id}`}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      {loan.notes && (
                        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2 mb-3">
                          <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                          <span>{loan.notes}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Payment History</h3>
                        <div className="flex items-center gap-1 no-print">
                          <Button variant="outline" size="sm" className="h-8 text-amber-700 border-amber-200 hover:bg-amber-50 hover:border-amber-300" onClick={() => setSkipLoanId(loan.id)} disabled={settled} data-testid={`button-skip-period-${loan.id}`}>
                            <SkipForward className="w-3.5 h-3.5 mr-1" /> Skip Period
                          </Button>
                          <Button onClick={() => setAddPaymentLoanId(loan.id)} disabled={settled} size="sm" className="h-8" data-testid={`button-add-payment-${loan.id}`}>
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Payment
                          </Button>
                        </div>
                      </div>

                      <PaymentHistoryTable
                        loan={loan}
                        onDeletePayment={(paymentId) => setPaymentToDelete({ loanId: loan.id, paymentId })}
                        onDeleteSkip={(skipId) => setSkipToDelete({ loanId: loan.id, skipId })}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AddLoanForm borrowerId={borrowerId} open={showAddLoan} onOpenChange={setShowAddLoan} addLoan={addLoan} />

      <EditBorrowerForm borrower={borrower} open={showEditBorrower} onOpenChange={setShowEditBorrower} updateBorrower={updateBorrower} existingBorrowers={borrowers} />

      {addPaymentLoan && (
        <AddPaymentForm
          loan={addPaymentLoan}
          open={!!addPaymentLoanId}
          onOpenChange={(v) => { if (!v) setAddPaymentLoanId(null); }}
          addPayment={async (data) => {
            await addPayment(borrowerId, addPaymentLoan.id, data);
            setAddPaymentLoanId(null);
          }}
        />
      )}

      {skipLoanId && (() => {
        const skipLoan = borrower.loans.find(l => l.id === skipLoanId);
        return skipLoan ? (
          <SkipPeriodForm
            loan={skipLoan}
            open={!!skipLoanId}
            onOpenChange={(v) => { if (!v) setSkipLoanId(null); }}
            addSkip={async (data) => {
              await addSkip(borrowerId, skipLoan.id, data);
              setSkipLoanId(null);
              toast.success("Period skipped — interest capitalized to balance");
            }}
          />
        ) : null;
      })()}

      {editLoan && (
        <EditLoanForm
          loan={editLoan}
          open={!!editLoanId}
          onOpenChange={(v) => { if (!v) setEditLoanId(null); }}
          updateLoan={(updates) => updateLoan(borrowerId, editLoan.id, updates)}
        />
      )}

      {/* Delete Borrower */}
      <AlertDialog open={showDeleteBorrower} onOpenChange={setShowDeleteBorrower}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {borrower.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this borrower and all {borrower.loans.length} loan{borrower.loans.length !== 1 ? "s" : ""} and their payment records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => { await deleteBorrower(borrowerId); setLocation("/"); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Loan */}
      <AlertDialog open={!!loanToDelete} onOpenChange={open => { if (!open) setLoanToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
            <AlertDialogDescription>
              All payment records for this loan will also be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (loanToDelete) { deleteLoan(borrowerId, loanToDelete); if (expandedLoanId === loanToDelete) setExpandedLoanId(null); setLoanToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settle Loan */}
      <AlertDialog open={!!loanToSettle} onOpenChange={open => { if (!open) setLoanToSettle(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark loan as fully settled?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set the outstanding balance to $0. The payment history will be kept. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (loanToSettle) {
                  markLoanAsPaid(borrowerId, loanToSettle);
                  setLoanToSettle(null);
                  toast.success("Loan marked as settled");
                }
              }}
              className="bg-green-700 text-white hover:bg-green-800"
            >
              Mark as Settled
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={open => { if (!open) setPaymentToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>The balance will be recalculated. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (paymentToDelete) { deletePayment(borrowerId, paymentToDelete.loanId, paymentToDelete.paymentId); setPaymentToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Skip */}
      <AlertDialog open={!!skipToDelete} onOpenChange={open => { if (!open) setSkipToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this deferred period?</AlertDialogTitle>
            <AlertDialogDescription>The capitalized interest will be reversed and the balance recalculated. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (skipToDelete) { deleteSkip(borrowerId, skipToDelete.loanId, skipToDelete.skipId); setSkipToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
