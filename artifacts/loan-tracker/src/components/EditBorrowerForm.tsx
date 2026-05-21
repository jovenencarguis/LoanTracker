import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { useLoanData, type Borrower } from "@/hooks/useLoanData";
import { toast } from "sonner";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
  interestRate: z.coerce.number().min(0, "Interest cannot be negative"),
  dateBorrowed: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

export function EditBorrowerForm({ 
  borrower,
  open, 
  onOpenChange 
}: { 
  borrower: Borrower;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { updateBorrower } = useLoanData();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: borrower.name,
      interestRate: borrower.interestRate || 10,
      dateBorrowed: borrower.dateBorrowed,
      notes: borrower.notes || "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        name: borrower.name,
        interestRate: borrower.interestRate || 10,
        dateBorrowed: borrower.dateBorrowed,
        notes: borrower.notes || "",
      });
    }
  }, [open, borrower, form]);

  function onSubmit(values: FormValues) {
    updateBorrower(borrower.id, values);
    onOpenChange(false);
    toast.success("Borrower updated successfully");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Record</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Borrower Name</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="edit-input-name" />
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
                    <Input type="number" step="0.1" {...field} data-testid="edit-input-interest" />
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
                    <Input type="date" {...field} data-testid="edit-input-date" />
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
                    <Textarea 
                      className="resize-none" 
                      {...field} 
                      data-testid="edit-input-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4 flex justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="mr-2">
                Cancel
              </Button>
              <Button type="submit" data-testid="button-save-edit">Save Changes</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
