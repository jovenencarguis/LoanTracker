import { useLoanData } from "@/hooks/useLoanData";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus, PenLine, Trash2, Calendar, Percent, FileText } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import NotFound from "./not-found";
import { AddLoanForm } from "@/components/AddLoanForm";
import { EditBorrowerForm } from "@/components/EditBorrowerForm";
import { useState } from "react";
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

export function BorrowerDetail() {
  const { borrowerId } = useParams();
  const [, setLocation] = useLocation();
  const { getBorrower, isLoaded, updateBorrower, deleteBorrower, addLoan, deleteLoan, markLoanAsPaid } = useLoanData();

  const [showAddLoan, setShowAddLoan] = useState(false);
  const [showEditBorrower, setShowEditBorrower] = useState(false);
  const [showDeleteBorrower, setShowDeleteBorrower] = useState(false);
  const [loanToDelete, setLoanToDelete] = useState<string | null>(null);
  const [loanToSettle, setLoanToSettle] = useState<string | null>(null);

  if (!isLoaded) return null;
  if (!borrowerId) return <NotFound />;

  const borrower = getBorrower(borrowerId);
  if (!borrower) return <NotFound />;

  const totalOutstanding = borrower.loans.reduce((s, l) => s + l.currentBalance, 0);
  const activeLoans = borrower.loans.filter(l => l.currentBalance > 0).length;

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col print:max-w-none">

      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4 no-print">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowEditBorrower(true)} className="text-muted-foreground hover:text-foreground">
              <PenLine className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteBorrower(true)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-1">{borrower.name}</h1>
            <p className="text-sm text-muted-foreground">
              {borrower.loans.length} loan{borrower.loans.length !== 1 ? "s" : ""} · {activeLoans} active
            </p>
          </div>
          <div className="bg-primary/8 border border-primary/15 rounded-lg px-4 py-3 text-center min-w-[130px] shrink-0">
            <div className="text-xs text-primary mb-1 uppercase tracking-wide font-medium">Total Outstanding</div>
            <div className="font-serif font-bold text-primary text-lg">{formatMoney(totalOutstanding)}</div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6 overflow-x-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Loans</h2>
          <Button
            onClick={() => {
              const hasPending = borrower.loans.some(l => l.currentBalance > 0);
              if (hasPending) {
                toast.error("Cannot add a new loan — this borrower still has an outstanding balance on an existing loan.");
                return;
              }
              setShowAddLoan(true);
            }}
            size="sm" className="h-8 no-print" data-testid="button-add-loan">
            <Plus className="w-3.5 h-3.5 mr-1" /> Add Loan
          </Button>
        </div>

        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm border-collapse" data-testid="loans-table">
            <thead>
              <tr className="bg-secondary/60 text-left">
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border whitespace-nowrap">#</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border whitespace-nowrap">Date</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Principal</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap">Rate</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-right whitespace-nowrap">Balance</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 font-medium text-muted-foreground border-b border-border text-center whitespace-nowrap no-print">Actions</th>
              </tr>
            </thead>
            <tbody>
              {borrower.loans.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground text-sm">
                    No loans yet. Add the first one above.
                  </td>
                </tr>
              ) : (
                borrower.loans.map((loan, i) => {
                  const settled = loan.currentBalance <= 0;
                  return (
                    <tr key={loan.id} className={`border-b border-border/50 transition-colors hover:bg-secondary/30 ${i % 2 === 0 ? "" : "bg-secondary/10"}`} data-testid={`loan-row-${loan.id}`}>
                      <td className="px-3 py-2.5 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{formatDate(loan.dateBorrowed)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-xs">{formatMoney(loan.startingBalance)}</td>
                      <td className="px-3 py-2.5 text-center text-xs">{loan.interestRate}%</td>
                      <td className="px-3 py-2.5 text-right font-serif font-medium text-primary">{formatMoney(loan.currentBalance)}</td>
                      <td className="px-3 py-2.5 text-center">
                        {settled ? (
                          <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">Settled</span>
                        ) : (
                          <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Active</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-center no-print">
                        <div className="flex items-center justify-center gap-1">
                          <Link href={`/borrowers/${borrowerId}/loans/${loan.id}`}>
                            <Button variant="outline" size="sm" className="h-7 text-xs" data-testid={`button-view-loan-${loan.id}`}>View</Button>
                          </Link>
                          {!settled && (
                            <Button variant="ghost" size="sm" className="h-7 text-xs text-green-700 hover:text-green-800 hover:bg-green-50" onClick={() => setLoanToSettle(loan.id)} data-testid={`button-settle-loan-${loan.id}`}>
                              Settle
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => setLoanToDelete(loan.id)} data-testid={`button-delete-loan-${loan.id}`}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Notes section if any loan has notes */}
        {borrower.loans.some(l => l.notes) && (
          <div className="mt-4 space-y-2">
            {borrower.loans.filter(l => l.notes).map((l, i) => (
              <div key={l.id} className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/30 rounded-lg px-3 py-2">
                <FileText className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span><span className="font-medium">Loan {i + 1}:</span> {l.notes}</span>
              </div>
            ))}
          </div>
        )}
      </main>

      <AddLoanForm borrowerId={borrowerId} open={showAddLoan} onOpenChange={setShowAddLoan} addLoan={addLoan} />

      <EditBorrowerForm borrower={borrower} open={showEditBorrower} onOpenChange={setShowEditBorrower} updateBorrower={updateBorrower} />

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
            <AlertDialogAction onClick={() => { if (loanToDelete) { deleteLoan(borrowerId, loanToDelete); setLoanToDelete(null); } }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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
              This will set the outstanding balance to MOP 0. The payment history will be kept. This cannot be undone.
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
    </div>
  );
}
