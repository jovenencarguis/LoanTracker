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
      <DialogContent className="sm:max-w-[400px] p-0 flex flex-col gap-0 overflow-hidden">
        <div className="px-6 pt-6 pb-4 shrink-0">
          <DialogHeader>
            <DialogTitle className="font-serif">Edit Borrower</DialogTitle>
          </DialogHeader>
        </div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto overscroll-contain px-6 pb-2 space-y-4">
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
            </div>
            <div className="shrink-0 px-6 py-4 border-t border-border flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" data-testid="button-save-edit">Save</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
