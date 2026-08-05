import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Loan } from "@/hooks/useLoanData";
import { formatMoney } from "@/lib/utils";
import { getNextDueDate, SKIP_REASONS } from "@/lib/loanUtils";

export function SkipPeriodForm({
  loan,
  open,
  onOpenChange,
  addSkip,
}: {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addSkip: (data: { date: string; reason: string }) => Promise<void>;
}) {
  const interval = loan.paymentIntervalDays ?? 30;
  const nextDue = getNextDueDate(loan);
  const nextDueStr = format(nextDue, "yyyy-MM-dd");

  const [skipDate, setSkipDate] = useState(nextDueStr);
  const [skipReason, setSkipReason] = useState("");
  const [skipCustomReason, setSkipCustomReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      const due = getNextDueDate(loan);
      setSkipDate(format(due, "yyyy-MM-dd"));
      setSkipReason("");
      setSkipCustomReason("");
    }
  }, [open, loan]);

  const previousBalance = loan.currentBalance;
  const skipInterest = previousBalance * (loan.interestRate / 100);
  const skipNewBalance = previousBalance + skipInterest;

  const resolvedReason = skipReason === "Other"
    ? (skipCustomReason.trim() || "")
    : skipReason;
  const canSubmit = resolvedReason.length > 0;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await addSkip({ date: skipDate, reason: resolvedReason });
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] p-0 flex flex-col gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="font-serif">Skip Period</DialogTitle>
            <DialogDescription>
              No payment is collected. Interest accrues and is added to the balance. The next due date advances by {interval} days.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-2 space-y-4">
          {/* Impact preview */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm space-y-1.5">
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

          {/* Reason */}
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
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
            className="bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Record Skip"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
