import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { type Loan } from "@/hooks/useLoanData";
import { toast } from "sonner";
import { useEffect } from "react";

const formSchema = z.object({
  interestRate: z.coerce.number().min(0, "Cannot be negative"),
  dateBorrowed: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditLoanForm({
  loan,
  open,
  onOpenChange,
  updateLoan,
}: {
  loan: Loan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateLoan: (updates: Partial<Pick<Loan, "interestRate" | "dateBorrowed" | "notes">>) => void;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      interestRate: loan.interestRate,
      dateBorrowed: loan.dateBorrowed,
      notes: loan.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        interestRate: loan.interestRate,
        dateBorrowed: loan.dateBorrowed,
        notes: loan.notes || "",
      });
    }
  }, [open, loan, form]);

  function onSubmit(values: FormValues) {
    updateLoan(values);
    onOpenChange(false);
    toast.success("Loan updated");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Loan</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" {...field} data-testid="edit-loan-rate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateBorrowed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Borrowed</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="edit-loan-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea className="resize-none" {...field} data-testid="edit-loan-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" data-testid="button-save-loan-edit">Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
