import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Loan } from "@/hooks/useLoanData";
import { getNextDueDate, SKIP_REASONS } from "@/lib/loanUtils";
import { formatMoney } from "@/lib/utils";

const schema = z.object({
  date: z.string().min(1, "Date is required"),
  reason: z.string().min(1, "Please select a reason"),
  customReason: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface Props {
  loan: Loan;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  addSkip: (data: { date: string; reason: string }) => Promise<unknown>;
}

export function SkipPeriodForm({ loan, open, onOpenChange, addSkip }: Props) {
  const nextDue = getNextDueDate(loan);
  const nextDueStr = nextDue.toISOString().slice(0, 10);
  const interestPreview = loan.currentBalance * (loan.interestRate / 100);
  const newBalancePreview = loan.currentBalance + interestPreview;

  const { register, handleSubmit, watch, setValue, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { date: nextDueStr, reason: "", customReason: "" },
  });

  const selectedReason = watch("reason");

  async function onSubmit(values: FormValues) {
    const reason = values.reason === "Other"
      ? (values.customReason?.trim() || "Other")
      : values.reason;
    await addSkip({ date: values.date, reason });
    reset({ date: nextDueStr, reason: "", customReason: "" });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Skip Payment Period</DialogTitle>
          <DialogDescription>
            No payment will be collected this period. Interest accrues and is added to the balance.
          </DialogDescription>
        </DialogHeader>

        {/* Impact preview */}
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm space-y-1.5">
          <div className="flex justify-between">
            <span className="text-amber-800">Current balance</span>
            <span className="font-mono font-medium text-amber-900">{formatMoney(loan.currentBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-amber-800">Interest capitalized ({loan.interestRate}%)</span>
            <span className="font-mono font-medium text-amber-900">+ {formatMoney(interestPreview)}</span>
          </div>
          <div className="flex justify-between border-t border-amber-200 pt-1.5">
            <span className="text-amber-900 font-semibold">New balance after skip</span>
            <span className="font-mono font-bold text-amber-900">{formatMoney(newBalancePreview)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="skip-date">Period date</Label>
            <Input id="skip-date" type="date" {...register("date")} />
            {errors.date && <p className="text-xs text-destructive">{errors.date.message}</p>}
            <p className="text-xs text-muted-foreground">Defaults to next due date</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="skip-reason">Reason for skipping</Label>
            <Select onValueChange={(v) => setValue("reason", v, { shouldValidate: true })} value={selectedReason}>
              <SelectTrigger id="skip-reason">
                <SelectValue placeholder="Select a reason…" />
              </SelectTrigger>
              <SelectContent>
                {SKIP_REASONS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.reason && <p className="text-xs text-destructive">{errors.reason.message}</p>}
          </div>

          {selectedReason === "Other" && (
            <div className="space-y-1.5">
              <Label htmlFor="skip-custom-reason">Describe the reason</Label>
              <Input id="skip-custom-reason" placeholder="e.g. Agreed deferral for renovation" {...register("customReason")} />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting} className="bg-amber-600 hover:bg-amber-700 text-white">
              {isSubmitting ? "Saving…" : "Record Skip"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
