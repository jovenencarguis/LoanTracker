import { useLoanData } from "@/hooks/useLoanData";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Calendar, FileText, Percent, Plus, PenLine, Trash2, Printer } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import NotFound from "./not-found";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import { EditLoanForm } from "@/components/EditLoanForm";
import { useState } from "react";
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

export function LoanDetail() {
  const { borrowerId, loanId } = useParams();
  const [, setLocation] = useLocation();
  const { getBorrower, getLoan, isLoaded, addPayment, updateLoan, deleteLoan, deletePayment } = useLoanData();

  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditLoan, setShowEditLoan] = useState(false);
  const [showDeleteLoan, setShowDeleteLoan] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  if (!isLoaded) return null;
  if (!borrowerId || !loanId) return <NotFound />;

  const borrower = getBorrower(borrowerId);
  const loan = getLoan(borrowerId, loanId);
  if (!borrower || !loan) return <NotFound />;

  return (
    <div className="min-h-[100dvh] w-full max-w-[900px] mx-auto bg-background flex flex-col print:max-w-none print:min-h-0">

      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-card print:static print:border-b-2 print:border-black">
        <div className="flex items-center justify-between mb-4 no-print">
          <Link href={`/borrowers/${borrowerId}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> {borrower.name}
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => window.print()} className="text-muted-foreground hover:text-foreground" title="Print record">
              <Printer className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowEditLoan(true)} className="text-muted-foreground hover:text-foreground">
              <PenLine className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteLoan(true)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="text-xs text-muted-foreground mb-1">{borrower.name}</div>
            <h1 className="text-xl font-serif font-bold text-foreground mb-2">
              Loan — {formatMoney(loan.startingBalance)}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(loan.dateBorrowed)}</span>
              <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> {loan.interestRate}% per period</span>
              {loan.notes && (
                <span className="flex items-center gap-1.5 w-full sm:w-auto">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="line-clamp-1">{loan.notes}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-3 shrink-0">
            <div className="bg-secondary/60 rounded-lg px-4 py-3 text-center min-w-[110px]">
              <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Starting</div>
              <div className="font-serif font-semibold">{formatMoney(loan.startingBalance)}</div>
            </div>
            <div className="bg-primary/8 border border-primary/15 rounded-lg px-4 py-3 text-center min-w-[110px]">
              <div className="text-xs text-primary mb-1 uppercase tracking-wide font-medium">Balance</div>
              <div className="font-serif font-bold text-primary text-lg">{formatMoney(loan.currentBalance)}</div>
            </div>
          </div>
        </div>
      </header>

      {/* Payment table */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Payment History</h2>
          <Button onClick={() => setShowAddPayment(true)} disabled={loan.currentBalance <= 0} size="sm" className="h-8 no-print" data-testid="button-add-payment">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Payment
          </Button>
        </div>

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
              {/* Initial row */}
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
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => setPaymentToDelete(payment.id)} data-testid={`button-delete-payment-${payment.id}`}>
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
      </main>

      <AddPaymentForm loan={loan} open={showAddPayment} onOpenChange={setShowAddPayment}
        addPayment={(data) => addPayment(borrowerId, loanId, data)} />

      <EditLoanForm loan={loan} open={showEditLoan} onOpenChange={setShowEditLoan}
        updateLoan={(updates) => updateLoan(borrowerId, loanId, updates)} />

      {/* Delete Loan */}
      <AlertDialog open={showDeleteLoan} onOpenChange={setShowDeleteLoan}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this loan?</AlertDialogTitle>
            <AlertDialogDescription>
              All {loan.payments.length} payment record{loan.payments.length !== 1 ? "s" : ""} will be deleted. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { deleteLoan(borrowerId, loanId); setLocation(`/borrowers/${borrowerId}`); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
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
            <AlertDialogAction onClick={() => { if (paymentToDelete) { deletePayment(borrowerId, loanId, paymentToDelete); setPaymentToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
