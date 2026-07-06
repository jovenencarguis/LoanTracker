import { useLoanData, type Borrower, type Loan } from "@/hooks/useLoanData";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, ChevronLeft, TrendingUp } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { AddPaymentForm } from "@/components/AddPaymentForm";
import { useState } from "react";
import { toast } from "sonner";

type Step =
  | { kind: "borrowers" }
  | { kind: "loans"; borrower: Borrower }
  | { kind: "payment"; borrower: Borrower; loan: Loan };

export function Payments() {
  const [, setLocation] = useLocation();
  const { borrowers, isLoaded, addPayment } = useLoanData();
  const [step, setStep] = useState<Step>({ kind: "borrowers" });

  if (!isLoaded) return null;

  const activeBorrowers = borrowers.filter(b => b.loans.some(l => l.currentBalance > 0));
  const totalCollected = borrowers.reduce((s, b) =>
    s + b.loans.reduce((s2, l) =>
      s2 + l.payments.reduce((s3, p) => s3 + p.totalCollected, 0), 0), 0);

  const backLabel = step.kind === "borrowers" ? "Dashboard" : step.kind === "loans" ? "Borrowers" : `${step.borrower.name}`;
  const handleBack = () => {
    if (step.kind === "loans") setStep({ kind: "borrowers" });
    else if (step.kind === "payment") setStep({ kind: "loans", borrower: step.borrower });
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          {step.kind === "borrowers" ? (
            <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" /> Dashboard
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleBack}
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> {backLabel}
            </button>
          )}
        </div>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-1 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {step.kind === "borrowers" ? "Payments" : step.kind === "loans" ? `${step.borrower.name} — Select Loan` : "Record Payment"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {step.kind === "borrowers"
            ? `${formatMoney(totalCollected)} collected — choose a borrower to record a payment`
            : step.kind === "loans"
            ? "Choose which loan to apply the payment to."
            : "Enter the payment details below."}
        </p>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        {step.kind === "borrowers" && (
          activeBorrowers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-16 text-center">No borrowers with an outstanding balance.</p>
          ) : (
            <div className="space-y-1.5">
              {activeBorrowers.map((b, i) => {
                const outstanding = b.loans.reduce((s, l) => s + l.currentBalance, 0);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setStep({ kind: "loans", borrower: b })}
                    className={`w-full rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3 text-left ${i % 2 === 0 ? "bg-background" : "bg-secondary/10"}`}
                    data-testid={`payment-borrower-${b.id}`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{b.name}</div>
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
          )
        )}

        {step.kind === "loans" && (
          <div className="space-y-1.5">
            {step.borrower.loans.filter(l => l.currentBalance > 0).map((l, i) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setStep({ kind: "payment", borrower: step.borrower, loan: l })}
                className={`w-full rounded-lg border border-border p-3 hover:bg-secondary/40 transition-colors flex items-center justify-between gap-3 text-left ${i % 2 === 0 ? "bg-background" : "bg-secondary/10"}`}
                data-testid={`payment-loan-${l.id}`}
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
      </main>

      {step.kind === "payment" && (
        <AddPaymentForm
          loan={step.loan}
          open={true}
          onOpenChange={(v) => { if (!v) setStep({ kind: "loans", borrower: step.borrower }); }}
          addPayment={async (data) => {
            await addPayment(step.borrower.id, step.loan.id, data);
            toast.success("Payment recorded");
            setLocation("/");
          }}
        />
      )}
    </div>
  );
}
