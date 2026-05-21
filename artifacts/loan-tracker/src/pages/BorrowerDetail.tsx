import { useLoanData } from "@/hooks/useLoanData";
import { Link, useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Calendar, FileText, Percent, Plus, PenLine, Trash2 } from "lucide-react";
import { formatMoney, formatDate } from "@/lib/utils";
import NotFound from "./not-found";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import { EditBorrowerForm } from "@/components/EditBorrowerForm";
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

export function BorrowerDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { getBorrower, isLoaded, deleteBorrower, deletePayment } = useLoanData();
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [showEditBorrower, setShowEditBorrower] = useState(false);
  const [showDeleteBorrower, setShowDeleteBorrower] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);

  if (!isLoaded) return null;
  if (!id) return <NotFound />;

  const borrower = getBorrower(id);
  if (!borrower) return <NotFound />;

  function handleDeleteBorrower() {
    deleteBorrower(id!);
    setLocation("/");
  }

  function handleDeletePayment() {
    if (!paymentToDelete || !id) return;
    deletePayment(id, paymentToDelete);
    setPaymentToDelete(null);
  }

  return (
    <div className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-background flex flex-col">
      <header className="px-6 py-6 border-b border-border bg-card sticky top-0 z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="inline-flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowEditBorrower(true)} className="text-muted-foreground hover:text-foreground" data-testid="button-edit-borrower">
              <PenLine className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setShowDeleteBorrower(true)} className="text-muted-foreground hover:text-destructive" data-testid="button-delete-borrower">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground mb-1" data-testid="text-borrower-name">
            {borrower.name}
          </h1>
          <div className="text-sm text-muted-foreground flex items-center gap-4">
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> {formatDate(borrower.dateBorrowed)}</span>
            <span className="flex items-center gap-1.5"><Percent className="w-3.5 h-3.5" /> {borrower.interestRate}% interest</span>
          </div>
          {borrower.notes && (
            <div className="mt-4 text-sm text-foreground bg-secondary/30 p-3 rounded-lg flex gap-2 items-start" data-testid="text-borrower-notes">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="leading-relaxed">{borrower.notes}</p>
            </div>
          )}
        </div>

        <div className="bg-primary/5 border border-primary/10 rounded-xl p-5" data-testid="card-current-balance">
          <div className="text-xs font-medium uppercase tracking-wider text-primary mb-1">Current Balance</div>
          <div className="text-3xl font-serif font-bold text-primary">
            {formatMoney(borrower.currentBalance)}
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Payment Ledger</h2>
          <Button 
            onClick={() => setShowAddPayment(true)} 
            disabled={borrower.currentBalance <= 0}
            size="sm"
            className="h-8"
            data-testid="button-add-payment"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Payment
          </Button>
        </div>

        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[11px] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
          {/* Initial Loan Entry */}
          <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background bg-border text-muted-foreground absolute left-0 md:left-1/2 -translate-x-1/2 z-10 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
            </div>
            <Card className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 shadow-sm border-border">
              <CardContent className="p-4">
                <div className="text-xs font-medium text-muted-foreground mb-1">{formatDate(borrower.dateBorrowed)}</div>
                <div className="text-sm">Initial loan of <span className="font-serif font-medium">{formatMoney(borrower.startingBalance)}</span></div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Entries */}
          {borrower.payments.map((payment) => (
            <div key={payment.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active" data-testid={`payment-entry-${payment.id}`}>
              <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background bg-primary/20 text-primary absolute left-0 md:left-1/2 -translate-x-1/2 z-10 shrink-0">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
              <Card className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 shadow-sm border-border">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-medium text-muted-foreground">{formatDate(payment.date)}</div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive -mr-1"
                      onClick={() => setPaymentToDelete(payment.id)}
                      data-testid={`button-delete-payment-${payment.id}`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {payment.type === "interest-only" ? (
                    <div className="text-sm leading-relaxed space-y-1.5">
                      <span className="inline-block text-xs font-medium uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Interest Only</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                        <span className="text-muted-foreground">Interest paid</span>
                        <span className="text-right font-medium">{formatMoney(payment.interest)}</span>
                        <span className="text-muted-foreground">Principal</span>
                        <span className="text-right">MOP 0 <span className="text-muted-foreground">(unchanged)</span></span>
                        <span className="text-muted-foreground">Total collected</span>
                        <span className="text-right font-medium">{formatMoney(payment.totalCollected)}</span>
                        <span className="text-muted-foreground">Balance</span>
                        <span className="text-right font-serif font-medium text-primary">{formatMoney(payment.newBalance)}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm leading-relaxed space-y-1.5">
                      <span className="inline-block text-xs font-medium uppercase tracking-wide text-primary/70 bg-primary/5 border border-primary/10 px-2 py-0.5 rounded-full">Principal + Interest</span>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-1">
                        <span className="text-muted-foreground">Interest paid</span>
                        <span className="text-right font-medium">{formatMoney(payment.interest)}</span>
                        <span className="text-muted-foreground">Principal paid</span>
                        <span className="text-right font-medium text-foreground">{formatMoney(payment.repayment)}</span>
                        <span className="text-muted-foreground">Total collected</span>
                        <span className="text-right font-medium">{formatMoney(payment.totalCollected)}</span>
                        <span className="text-muted-foreground">New balance</span>
                        <span className="text-right font-serif font-medium text-primary">{formatMoney(payment.newBalance)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
          
          {borrower.currentBalance === 0 && borrower.payments.length > 0 && (
             <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
             <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-background bg-green-100 absolute left-0 md:left-1/2 -translate-x-1/2 z-10 shrink-0">
               <div className="w-1.5 h-1.5 rounded-full bg-green-600" />
             </div>
             <Card className="w-[calc(100%-2rem)] md:w-[calc(50%-1.5rem)] ml-8 md:ml-0 shadow-sm border-transparent bg-green-50/50">
               <CardContent className="p-4 text-center">
                 <div className="text-sm font-medium text-green-700">Loan fully settled</div>
               </CardContent>
             </Card>
           </div>
          )}
        </div>
      </main>

      <AddPaymentForm 
        borrower={borrower}
        open={showAddPayment}
        onOpenChange={setShowAddPayment}
      />

      <EditBorrowerForm
        borrower={borrower}
        open={showEditBorrower}
        onOpenChange={setShowEditBorrower}
      />

      {/* Delete Borrower Confirmation */}
      <AlertDialog open={showDeleteBorrower} onOpenChange={setShowDeleteBorrower}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {borrower.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this borrower and all {borrower.payments.length} payment record{borrower.payments.length !== 1 ? "s" : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-borrower">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBorrower}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-borrower"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Payment Confirmation */}
      <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => { if (!open) setPaymentToDelete(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this payment?</AlertDialogTitle>
            <AlertDialogDescription>
              The balance will be recalculated from the remaining payments. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-payment">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePayment}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete-payment"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
