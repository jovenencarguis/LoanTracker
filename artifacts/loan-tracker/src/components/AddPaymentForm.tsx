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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Loan } from "@/hooks/useLoanData";
import { formatMoney } from "@/lib/utils";
import { getNextDueDate } from "@/lib/loanUtils";
import { toast } from "sonner";
import { useEffect } from "react";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  repayment: z.coerce.number().min(0, "Cannot be negative"),
  interest: z.coerce.number().min(0, "Cannot be negative"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddPaymentForm({
  loan,
  open,
  onOpenChange,
  addPayment,
}: {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addPayment: (data: { date: string; repayment: number; interest?: number }) => Promise<void>;
}) {
  const nextDue = getNextDueDate(loan);
  const nextDueStr = format(nextDue, "yyyy-MM-dd");
  const nextDueLabel = format(nextDue, "MMM d, yyyy");
  const interval = loan.paymentIntervalDays ?? 30;

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: nextDueStr,
      repayment: "" as unknown as number,
      interest: loan.currentBalance * (loan.interestRate / 100),
    },
  });

  useEffect(() => {
    if (open) {
      const due = getNextDueDate(loan);
      form.reset({
        date: format(due, "yyyy-MM-dd"),
        repayment: "" as unknown as number,
        interest: loan.currentBalance * (loan.interestRate / 100),
      });
    }
  }, [open, loan]);

  const repaymentValue = useWatch({ control: form.control, name: "repayment" });
  const interestValue = useWatch({ control: form.control, name: "interest" });

  const previousBalance = loan.currentBalance;
  const parsedRepayment = Number(repaymentValue) || 0;
  const parsedInterest = Number(interestValue) || 0;
  const isInterestOnly = parsedRepayment === 0;
  const newBalance = previousBalance - parsedRepayment;
  const totalCollected = parsedRepayment + parsedInterest;

  async function onSubmit(values: FormValues) {
    if (values.repayment > previousBalance) {
      form.setError("repayment", { message: "Cannot exceed current balance" });
      return;
    }
    await addPayment({ date: values.date, repayment: values.repayment, interest: values.interest });
    onOpenChange(false);
    toast.success(values.repayment > 0 ? "Payment recorded" : "Interest-only payment recorded");
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
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">
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
      </DialogContent>
    </Dialog>
  );
}
