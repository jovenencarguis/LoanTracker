import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type Borrower } from "@/hooks/useLoanData";
import { useLocation } from "wouter";
import { toast } from "sonner";

const formSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

type FormValues = z.infer<typeof formSchema>;

export function AddBorrowerForm({
  open,
  onOpenChange,
  addBorrower,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addBorrower: (name: string) => Promise<Borrower>;
}) {
  const [, setLocation] = useLocation();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "" },
  });

  async function onSubmit(values: FormValues) {
    const borrower = await addBorrower(values.name);
    form.reset();
    onOpenChange(false);
    toast.success("Borrower added");
    setLocation(`/borrowers/${borrower.id}`);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="font-serif">Add Borrower</DialogTitle>
          <DialogDescription>Enter the borrower's name. You can add loans after.</DialogDescription>
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
                    <Input placeholder="e.g. Jane Doe" {...field} data-testid="input-name" autoFocus />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="pt-2 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" data-testid="button-submit-borrower">Add Borrower</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
