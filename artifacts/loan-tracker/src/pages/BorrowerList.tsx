import { useLoanData } from "@/hooks/useLoanData";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Users, Wallet, ArrowLeft } from "lucide-react";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { formatMoney, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

export function BorrowerList() {
  const { borrowers, isLoaded } = useLoanData();
  const [showAddModal, setShowAddModal] = useState(false);

  if (!isLoaded) return null;

  const totalOutstanding = borrowers.reduce((sum, b) => sum + b.currentBalance, 0);
  const activeBorrowers = borrowers.filter(b => b.currentBalance > 0).length;

  return (
    <div className="min-h-[100dvh] w-full max-w-[480px] mx-auto bg-background flex flex-col">
      <header className="px-6 pt-10 pb-6 border-b border-border bg-card sticky top-0 z-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          data-testid="link-back-dashboard"
        >
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <h1 className="text-2xl font-serif font-bold text-foreground mb-6" data-testid="text-app-title">
          All Borrowers
        </h1>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-secondary/50 rounded-lg p-4" data-testid="stat-total-balance">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Total Outstanding</span>
            </div>
            <div className="text-lg font-semibold text-primary font-serif">
              {formatMoney(totalOutstanding)}
            </div>
          </div>
          <div className="bg-secondary/50 rounded-lg p-4" data-testid="stat-active-borrowers">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Active</span>
            </div>
            <div className="text-lg font-semibold text-foreground font-serif">
              {activeBorrowers} <span className="text-sm font-sans font-normal text-muted-foreground">Borrowers</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto">
        {borrowers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center" data-testid="empty-state">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-6">
              <Wallet className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-serif font-medium text-foreground mb-2">No loans yet</h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-[280px]">
              Keep track of money you lend to friends and family with precise, reliable records.
            </p>
            <Button onClick={() => setShowAddModal(true)} size="lg" className="w-full sm:w-auto" data-testid="button-add-first-borrower">
              <Plus className="w-4 h-4 mr-2" />
              New Loan Record
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">All Records</h2>
              <Button onClick={() => setShowAddModal(true)} variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-add-borrower">
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            
            {borrowers.map((borrower, i) => (
              <motion.div
                key={borrower.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link href={`/borrowers/${borrower.id}`} className="block focus:outline-none focus-visible:ring-2 ring-primary rounded-xl" data-testid={`link-borrower-${borrower.id}`}>
                  <Card className="transition-all hover:border-primary/30 hover:shadow-md cursor-pointer border-border">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div>
                        <div className="font-medium text-foreground mb-1">{borrower.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(borrower.dateBorrowed)} • {borrower.interestRate}% interest
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-serif font-medium ${borrower.currentBalance > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          {formatMoney(borrower.currentBalance)}
                        </div>
                        {borrower.currentBalance === 0 && (
                          <div className="text-xs text-muted-foreground mt-0.5">Settled</div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AddBorrowerForm 
        open={showAddModal} 
        onOpenChange={setShowAddModal} 
      />
    </div>
  );
}
