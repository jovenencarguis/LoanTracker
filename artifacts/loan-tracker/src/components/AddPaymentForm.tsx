import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Loan } from "@/hooks/useLoanData";
import { formatMoney } from "@/lib/utils";
import { getNextDueDate, SKIP_REASONS } from "@/lib/loanUtils";
import { toast } from "sonner";
import { useEffect, useState } from "react";

const paymentSchema = z.object({
  date: z.string().min(1, "Date is required"),
  repayment: z.coerce.number().min(0, "Cannot be negative"),
  interest: z.coerce.number().min(0, "Cannot be negative"),
});
type PaymentValues = z.infer<typeof paymentSchema>;

export function AddPaymentForm({
  loan,
  open,
  onOpenChange,
  addPayment,
  addSkip,
}: {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addPayment: (data: { date: string; repayment: number; interest?: number }) => Promise<void>;
  addSkip: (data: { date: string; reason: string }) => Promise<void>;
}) {
  const nextDue = getNextDueDate(loan);
  const nextDueStr = format(nextDue, "yyyy-MM-dd");
  const nextDueLabel = format(nextDue, "MMM d, yyyy");
  const interval = loan.paymentIntervalDays ?? 30;

  const [mode, setMode] = useState<"payment" | "skip">("payment");
  const [skipReason, setSkipReason] = useState("");
  const [skipCustomReason, setSkipCustomReason] = useState("");
  const [skipDate, setSkipDate] = useState(nextDueStr);
  const [skipSubmitting, setSkipSubmitting] = useState(false);

  const form = useForm<PaymentValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: nextDueStr,
      repayment: "" as unknown as number,
      interest: loan.currentBalance * (loan.interestRate / 100),
    },
  });

  useEffect(() => {
    if (open) {
      const due = getNextDueDate(loan);
      const dueStr = format(due, "yyyy-MM-dd");
      form.reset({
        date: dueStr,
        repayment: "" as unknown as number,
        interest: loan.currentBalance * (loan.interestRate / 100),
      });
      setMode("payment");
      setSkipReason("");
      setSkipCustomReason("");
      setSkipDate(dueStr);
    }
  }, [open, loan]);

  const repaymentValue = useWatch({ control: form.control, name: "repayment" });
  const interestValue  = useWatch({ control: form.control, name: "interest" });

  const previousBalance  = loan.currentBalance;
  const parsedRepayment  = Number(repaymentValue) || 0;
  const parsedInterest   = Number(interestValue) || 0;
  const isInterestOnly   = parsedRepayment === 0;
  const newBalance       = previousBalance - parsedRepayment;
  const totalCollected   = parsedRepayment + parsedInterest;

  const skipInterest     = previousBalance * (loan.interestRate / 100);
  const skipNewBalance   = previousBalance + skipInterest;
  const resolvedSkipReason = skipReason === "Other"
    ? (skipCustomReason.trim() || "")
    : skipReason;
  const canSubmitSkip = resolvedSkipReason.length > 0;

  async function onSubmitPayment(values: PaymentValues) {
    if (values.repayment > previousBalance) {
      form.setError("repayment", { message: "Cannot exceed current balance" });
      return;
    }
    await addPayment({ date: values.date, repayment: values.repayment, interest: values.interest });
    onOpenChange(false);
    toast.success(values.repayment > 0 ? "Payment recorded" : "Interest-only payment recorded");
  }

  async function onSubmitSkip() {
    if (!canSubmitSkip) return;
    setSkipSubmitting(true);
    try {
      await addSkip({ date: skipDate, reason: resolvedSkipReason });
      onOpenChange(false);
      toast.success("Period deferred — interest capitalized to balance");
    } finally {
      setSkipSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 flex flex-col gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-2 shrink-0">
          <DialogHeader>
            <DialogTitle className="font-serif">Record Payment</DialogTitle>
            <DialogDescription>
              Next due: <strong>{nextDueLabel}</strong> · every {interval} days
            </DialogDescription>
          </DialogHeader>

          {/* Mode toggle */}
          <div className="flex mt-4 rounded-lg bg-secondary/60 p-1 gap-1">
            <button
              type="button"
              onClick={() => setMode("payment")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                mode === "payment"
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Record Payment
            </button>
            <button
              type="button"
              onClick={() => setMode("skip")}
              className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${
                mode === "skip"
                  ? "bg-background shadow-sm text-amber-700"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Skip Period
            </button>
          </div>
        </div>

        {/* ── PAYMENT MODE ── */}
        {mode === "payment" && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitPayment)} className="flex flex-col min-h-0">
              <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-2 space-y-4">

                {/* Live summary */}
                <div className="bg-secondary/50 p-4 rounded-lg text-sm space-y-2 font-mono overflow-x-auto">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Current Balance:</span>
                    <span>{formatMoney(previousBalance)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Interest ({loan.interestRate}%):</span>
                    <span className="text-destructive">+{formatMoney(parsedInterest)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground shrink-0">Principal Repayment:</span>
                    <span className="text-primary">-{formatMoney(parsedRepayment)}</span>
                  </div>
                  <div className="h-px bg-border my-1" />
                  <div className="flex justify-between gap-4 font-medium">
                    <span className="shrink-0">Total to Collect:</span>
                    <span>{formatMoney(totalCollected)}</span>
                  </div>
                  <div className="flex justify-between gap-4 font-medium">
                    <span className="shrink-0">New Balance:</span>
                    <span className={newBalance < 0 ? "text-destructive" : isInterestOnly ? "text-muted-foreground" : "text-primary"}>
                      {formatMoney(newBalance)}
                      {isInterestOnly && <span className="text-xs font-sans font-normal ml-1">(unchanged)</span>}
                    </span>
                  </div>
                  {isInterestOnly && (
                    <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 font-sans">
                      Interest-only — principal stays the same
                    </div>
                  )}
                </div>

                <FormField control={form.control} name="date" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Date</FormLabel>
                    <FormControl><Input type="date" {...field} data-testid="payment-input-date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="repayment" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal Repayment ($)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00 — leave at 0 for interest-only" {...field} data-testid="payment-input-repayment" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="interest" render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Interest Payment ($)</FormLabel>
                      <span className="text-xs text-muted-foreground">auto-calculated, editable</span>
                    </div>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" {...field} data-testid="payment-input-interest" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={newBalance < 0} data-testid="button-submit-payment">Record Payment</Button>
              </div>
            </form>
          </Form>
        )}

        {/* ── SKIP MODE ── */}
        {mode === "skip" && (
          <div className="flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-2 space-y-4">

              {/* Impact preview */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm space-y-1.5">
                <p className="text-amber-800 text-xs mb-2">
                  No payment is collected. Interest accrues and is added to the balance. The next due date advances by {interval} days.
                </p>
                <div className="flex justify-between font-mono">
                  <span className="text-amber-800">Current balance</span>
                  <span className="font-medium text-amber-900">{formatMoney(previousBalance)}</span>
                </div>
                <div className="flex justify-between font-mono">
                  <span className="text-amber-800">Interest capitalized ({loan.interestRate}%)</span>
                  <span className="font-medium text-amber-900">+ {formatMoney(skipInterest)}</span>
                </div>
                <div className="flex justify-between font-mono border-t border-amber-200 pt-1.5">
                  <span className="text-amber-900 font-semibold">New balance after skip</span>
                  <span className="font-bold text-amber-900">{formatMoney(skipNewBalance)}</span>
                </div>
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Period date</label>
                <Input
                  type="date"
                  value={skipDate}
                  onChange={e => setSkipDate(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">Defaults to next due date</p>
              </div>

              {/* Reason — required */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Reason for skipping <span className="text-destructive">*</span>
                </label>
                <Select value={skipReason} onValueChange={setSkipReason}>
                  <SelectTrigger className={!skipReason ? "border-amber-300" : ""}>
                    <SelectValue placeholder="Select a reason to continue…" />
                  </SelectTrigger>
                  <SelectContent>
                    {SKIP_REASONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!skipReason && (
                  <p className="text-xs text-amber-700">A reason is required before you can skip a period.</p>
                )}
              </div>

              {skipReason === "Other" && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">
                    Describe the reason <span className="text-destructive">*</span>
                  </label>
                  <Input
                    placeholder="e.g. Agreed deferral for home renovation"
                    value={skipCustomReason}
                    onChange={e => setSkipCustomReason(e.target.value)}
                  />
                  {!skipCustomReason.trim() && (
                    <p className="text-xs text-amber-700">Please describe the reason.</p>
                  )}
                </div>
              )}
            </div>

            <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button
                type="button"
                disabled={!canSubmitSkip || skipSubmitting}
                onClick={onSubmitSkip}
                className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
              >
                {skipSubmitting ? "Saving…" : "Record Skip"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
