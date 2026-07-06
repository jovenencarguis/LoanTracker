import { useLoanData, type Loan } from "@/hooks/useLoanData";
import { Link, useParams, useLocation, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, PenLine, Trash2, Mail, Phone, FileText, ChevronDown, ChevronUp, Printer, Calendar, Percent } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import NotFound from "./not-found";
import { AddLoanForm } from "@/components/AddLoanForm";
import { EditBorrowerForm } from "@/components/EditBorrowerForm";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import { EditLoanForm } from "@/components/EditLoanForm";
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

function PaymentHistoryTable({ loan, onDeletePayment }: { loan: Loan; onDeletePayment: (paymentId: string) => void }) {
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
            <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap no-print">Action</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-border/50 bg-secondary/20">
            <td className="px-3 py-2.5 text-muted-foreground">0</td>
            <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatDate(loan.dateBorrowed)}</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right text-muted-foreground">—</td>
            <td className="px-3 py-2.5 text-right font-serif font-medium">{formatMoney(loan.startingBalance)}</td>
            <td className="px-3 py-2.5 no-print" />
          </tr>

          {loan.payments.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-muted-foreground text-sm">No payments recorded yet.</td>
            </tr>
          ) : (
            loan.payments.map((payment, i) => {
              const isInterestOnly = payment.type === "interest-only";
              return (
                <tr key={payment.id} className={`border-b border-border/50 transition-colors hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`} data-testid={`payment-row-${payment.id}`}>
                  <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(payment.date)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(payment.previousBalance)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(payment.interest)}</td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs">
                    {isInterestOnly ? <span className="text-muted-foreground">—</span> : formatMoney(payment.repayment)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-xs font-medium">{formatMoney(payment.totalCollected)}</td>
                  <td className="px-3 py-2.5 text-right font-serif font-medium text-primary">{formatMoney(payment.newBalance)}</td>
                  <td className="px-3 py-2.5 text-center no-print">
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => onDeletePayment(payment.id)} data-testid={`button-delete-payment-${payment.id}`}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              );
            })
          )}

          {loan.currentBalance === 0 && loan.payments.length > 0 && (
            <tr className="bg-green-50/50">
              <td colSpan={8} className="px-3 py-3 text-center text-sm font-medium text-green-700">Loan fully settled</td>
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
  const { borrowers, getBorrower, isLoaded, updateBorrower, deleteBorrower, addLoan, addPayment, updateLoan, deleteLoan, deletePayment, markLoanAsPaid } = useLoanData();

  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showEditBorrower, setShowEditBorrower] = useState(false);
  const [showDeleteBorrower, setShowDeleteBorrower] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [loanToSettle, setLoanToSettle] = useState<string | null>(null);
  const [expandedLoanId, setExpandedLoanId] = useState<string | null>(null);
  const [addPaymentLoanId, setAddPaymentLoanId] = useState<string | null>(null);
  const [editLoanId, setEditLoanId] = useState<string | null>(null);
  const [paymentToDelete, setPaymentToDelete] = useState<{ loanId: string; paymentId: string } | null>(null);

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

  const avatarColors = ["bg-emerald-700","bg-blue-600","bg-violet-600","bg-rose-600","bg-amber-600","bg-teal-600","bg-cyan-700","bg-indigo-600"];
  const avatarBg = avatarColors[borrower.name.split("").reduce((a,c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  const initials = (() => { const p = borrower.name.trim().split(/\s+/); return p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length-1][0]).toUpperCase(); })();

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
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Active</span>
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
                          <Button variant="ghost" size="icon" onClick={() => window.print()} className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Print record">
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
                        <Button onClick={() => setAddPaymentLoanId(loan.id)} disabled={settled} size="sm" className="h-8 no-print" data-testid={`button-add-payment-${loan.id}`}>
                          <Plus className="w-3.5 h-3.5 mr-1" /> Add Payment
                        </Button>
                      </div>

                      <PaymentHistoryTable
                        loan={loan}
                        onDeletePayment={(paymentId) => setPaymentToDelete({ loanId: loan.id, paymentId })}
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
    </div>
  );
}
