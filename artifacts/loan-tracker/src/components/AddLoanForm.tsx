import { z } from "zod";
import { useForm } from "react-hook-form";
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
import { Textarea } from "@/components/ui/textarea";
import { type Loan } from "@/hooks/useLoanData";
import { toast } from "sonner";

const formSchema = z.object({
  startingBalance: z.coerce.number().positive("Must be a positive number"),
  interestRate: z.coerce.number().min(0, "Cannot be negative"),
  dateBorrowed: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function AddLoanForm({
  borrowerId,
  open,
  onOpenChange,
  addLoan,
}: {
  borrowerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addLoan: (borrowerId: string, data: Omit<Loan, "id" | "currentBalance" | "payments">) => Promise<Loan | null>;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      startingBalance: "" as unknown as number,
      interestRate: 10,
      dateBorrowed: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    },
  });

  async function onSubmit(values: FormValues) {
    await addLoan(borrowerId, values);
    form.reset({
      startingBalance: "" as unknown as number,
      interestRate: 10,
      dateBorrowed: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
    onOpenChange(false);
    toast.success("Loan added");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Add Loan</DialogTitle>
          <DialogDescription>Record a new loan for this borrower.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startingBalance"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Principal (MOP)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-loan-amount" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Interest Rate (%)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" placeholder="10" {...field} data-testid="input-loan-rate" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="dateBorrowed"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date Borrowed</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} data-testid="input-loan-date" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Agreed terms, purpose..." className="resize-none" {...field} data-testid="input-loan-notes" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" data-testid="button-submit-loan">Add Loan</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
