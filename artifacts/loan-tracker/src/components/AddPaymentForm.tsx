import { z } from "zod";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLoanData, type Borrower } from "@/hooks/useLoanData";
import { formatMoney } from "@/lib/utils";
import { toast } from "sonner";
import { useEffect } from "react";

const formSchema = z.object({
  date: z.string().min(1, "Date is required"),
  repayment: z.coerce.number().positive("Must be a positive number"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddPaymentForm({ 
  borrower,
  open, 
  onOpenChange 
}: { 
  borrower: Borrower;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { addPayment } = useLoanData();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: format(new Date(), "yyyy-MM-dd"),
      repayment: "" as unknown as number,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        date: format(new Date(), "yyyy-MM-dd"),
        repayment: "" as unknown as number,
      });
    }
  }, [open, form]);

  const repaymentValue = useWatch({
    control: form.control,
    name: "repayment",
  });

  const parsedRepayment = Number(repaymentValue) || 0;
  const previousBalance = borrower.currentBalance;
  const interest = previousBalance * (borrower.interestRate / 100);
  const totalCollected = parsedRepayment + interest;
  const newBalance = previousBalance - parsedRepayment;

  function onSubmit(values: FormValues) {
    if (values.repayment > previousBalance) {
      form.setError("repayment", { message: "Repayment cannot exceed current balance" });
      return;
    }

    addPayment(borrower.id, values);
    onOpenChange(false);
    toast.success("Payment recorded successfully");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Record Payment</DialogTitle>
          <DialogDescription>
            Enter the principal amount repaid. Interest is calculated automatically based on the current balance.
          </DialogDescription>
        </DialogHeader>
        
        <div className="bg-secondary/50 p-4 rounded-lg mb-2 text-sm space-y-2 font-mono">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Current Balance:</span>
            <span>{formatMoney(previousBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Interest ({borrower.interestRate}%):</span>
            <span className="text-destructive">+{formatMoney(interest)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Principal Repayment:</span>
            <span className="text-primary">-{formatMoney(parsedRepayment)}</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between font-medium">
            <span>Total to Collect:</span>
            <span>{formatMoney(totalCollected)}</span>
          </div>
          <div className="flex justify-between font-medium pt-1">
            <span>New Balance:</span>
            <span className={newBalance < 0 ? "text-destructive" : "text-primary"}>
              {formatMoney(newBalance)}
            </span>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Date</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="payment-input-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="repayment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Principal Repayment Amount (MOP)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="payment-input-amount" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" disabled={newBalance < 0} data-testid="button-submit-payment">
                Record Payment
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
