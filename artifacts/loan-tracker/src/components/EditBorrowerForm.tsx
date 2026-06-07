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
import { type Borrower } from "@/hooks/useLoanData";
import { toast } from "sonner";
import { useEffect } from "react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function EditBorrowerForm({
  borrower,
  open,
  onOpenChange,
  updateBorrower,
  existingBorrowers,
}: {
  borrower: Borrower;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  updateBorrower: (id: string, name: string) => Promise<void>;
  existingBorrowers: Borrower[];
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: borrower.name },
  });

  useEffect(() => {
    if (open) form.reset({ name: borrower.name });
  }, [open, borrower, form]);

  async function onSubmit(values: FormValues) {
    const trimmed = values.name.trim();
    const isDuplicate = existingBorrowers.some(
      b => b.id !== borrower.id && b.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      form.setError("name", { message: "A borrower with this name already exists" });
      return;
    }
    await updateBorrower(borrower.id, trimmed);
    onOpenChange(false);
    toast.success("Name updated");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Borrower</DialogTitle>
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
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" data-testid="button-save-edit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
