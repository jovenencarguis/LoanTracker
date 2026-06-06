import { useState, useEffect, useCallback } from "react";

export interface Payment {
  id: string;
  date: string;
  previousBalance: number;
  interest: number;
  repayment: number;
  totalCollected: number;
  newBalance: number;
  type: "regular" | "interest-only";
}

export interface Loan {
  id: string;
  startingBalance: number;
  currentBalance: number;
  interestRate: number;
  dateBorrowed: string;
  notes?: string;
  payments: Payment[];
}

export interface Borrower {
  id: string;
  name: string;
  loans: Loan[];
}

// ─── Storage versioning ────────────────────────────────────────────────────
// IMPORTANT: Never rename STORAGE_KEY without adding the old key to LEGACY_KEYS.
// The migration below will automatically carry data forward to the new key so
// no user data is ever lost on upgrade.
const STORAGE_KEY = "loanData_v2";
const LEGACY_KEYS = ["loanData", "loanData_v1"];

// ─── Migration: check older keys and promote to current key ───────────────
function migrateFromLegacy(): Borrower[] | null {
  for (const legacyKey of LEGACY_KEYS) {
    const raw = localStorage.getItem(legacyKey);
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      // Save under current key and clean up the old one
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      localStorage.removeItem(legacyKey);
      console.info(`[LoanTracker] Migrated data from "${legacyKey}" → "${STORAGE_KEY}"`);
      return parsed;
    } catch {
      console.warn(`[LoanTracker] Found legacy key "${legacyKey}" but could not parse it — skipping.`);
    }
  }
  return null;
}

// ─── Export / Import helpers ───────────────────────────────────────────────
export function exportData(): void {
  const raw = localStorage.getItem(STORAGE_KEY) ?? "[]";
  const blob = new Blob([raw], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `loan-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importData(file: File): Promise<Borrower[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed: Borrower[] = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("Invalid format — expected an array.");
        // Back up existing data before overwriting
        const existing = localStorage.getItem(STORAGE_KEY);
        if (existing) {
          localStorage.setItem(`${STORAGE_KEY}_pre_import_backup`, existing);
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        resolve(parsed);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsText(file);
  });
}

export function useLoanData() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      // 1. Try current key first
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setBorrowers(JSON.parse(data));
      } else {
        // 2. Fall back to legacy keys and migrate if found
        const migrated = migrateFromLegacy();
        if (migrated) setBorrowers(migrated);
      }
    } catch (e) {
      console.error("[LoanTracker] Failed to load loan data — data left untouched.", e);
    }
    setIsLoaded(true);
  }, []);

  const saveBorrowers = useCallback((next: Borrower[]) => {
    setBorrowers(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const addBorrower = useCallback((name: string) => {
    const b: Borrower = { id: crypto.randomUUID(), name, loans: [] };
    saveBorrowers([...borrowers, b]);
    return b;
  }, [borrowers, saveBorrowers]);

  const updateBorrower = useCallback((id: string, name: string) => {
    saveBorrowers(borrowers.map(b => b.id === id ? { ...b, name } : b));
  }, [borrowers, saveBorrowers]);

  const deleteBorrower = useCallback((id: string) => {
    saveBorrowers(borrowers.filter(b => b.id !== id));
  }, [borrowers, saveBorrowers]);

  const addLoan = useCallback((
    borrowerId: string,
    data: Omit<Loan, "id" | "currentBalance" | "payments">
  ) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return null;
    const loan: Loan = { ...data, id: crypto.randomUUID(), currentBalance: data.startingBalance, payments: [] };
    const next = [...borrowers];
    next[bi] = { ...next[bi], loans: [...next[bi].loans, loan] };
    saveBorrowers(next);
    return loan;
  }, [borrowers, saveBorrowers]);

  const updateLoan = useCallback((
    borrowerId: string,
    loanId: string,
    updates: Partial<Pick<Loan, "interestRate" | "dateBorrowed" | "notes">>
  ) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return;
    const next = [...borrowers];
    next[bi] = { ...next[bi], loans: next[bi].loans.map(l => l.id === loanId ? { ...l, ...updates } : l) };
    saveBorrowers(next);
  }, [borrowers, saveBorrowers]);

  const deleteLoan = useCallback((borrowerId: string, loanId: string) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return;
    const next = [...borrowers];
    next[bi] = { ...next[bi], loans: next[bi].loans.filter(l => l.id !== loanId) };
    saveBorrowers(next);
  }, [borrowers, saveBorrowers]);

  const markLoanAsPaid = useCallback((borrowerId: string, loanId: string) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return;
    const next = [...borrowers];
    next[bi] = {
      ...next[bi],
      loans: next[bi].loans.map(l => l.id === loanId ? { ...l, currentBalance: 0 } : l),
    };
    saveBorrowers(next);
  }, [borrowers, saveBorrowers]);

  const addPayment = useCallback((
    borrowerId: string,
    loanId: string,
    data: { date: string; repayment: number; interest?: number }
  ) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return null;
    const borrower = borrowers[bi];
    const li = borrower.loans.findIndex(l => l.id === loanId);
    if (li === -1) return null;
    const loan = borrower.loans[li];

    const previousBalance = loan.currentBalance;
    const interest = data.interest !== undefined ? data.interest : previousBalance * (loan.interestRate / 100);
    const repayment = data.repayment;
    const newBalance = previousBalance - repayment;
    const totalCollected = repayment + interest;

    const payment: Payment = {
      id: crypto.randomUUID(),
      date: data.date,
      previousBalance,
      interest,
      repayment,
      totalCollected,
      newBalance,
      type: repayment === 0 ? "interest-only" : "regular",
    };

    const updatedLoans = [...borrower.loans];
    updatedLoans[li] = { ...loan, currentBalance: newBalance, payments: [...loan.payments, payment] };
    const next = [...borrowers];
    next[bi] = { ...borrower, loans: updatedLoans };
    saveBorrowers(next);
    return payment;
  }, [borrowers, saveBorrowers]);

  const deletePayment = useCallback((borrowerId: string, loanId: string, paymentId: string) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return;
    const borrower = borrowers[bi];
    const li = borrower.loans.findIndex(l => l.id === loanId);
    if (li === -1) return;
    const loan = borrower.loans[li];

    const updatedPayments = loan.payments.filter(p => p.id !== paymentId);
    const currentBalance = updatedPayments.length > 0
      ? updatedPayments[updatedPayments.length - 1].newBalance
      : loan.startingBalance;

    const updatedLoans = [...borrower.loans];
    updatedLoans[li] = { ...loan, payments: updatedPayments, currentBalance };
    const next = [...borrowers];
    next[bi] = { ...borrower, loans: updatedLoans };
    saveBorrowers(next);
  }, [borrowers, saveBorrowers]);

  const getBorrower = useCallback((id: string) => borrowers.find(b => b.id === id), [borrowers]);
  const getLoan = useCallback((borrowerId: string, loanId: string) => {
    return borrowers.find(b => b.id === borrowerId)?.loans.find(l => l.id === loanId);
  }, [borrowers]);

  return {
    borrowers, isLoaded,
    addBorrower, updateBorrower, deleteBorrower,
    addLoan, updateLoan, deleteLoan, markLoanAsPaid,
    addPayment, deletePayment,
    getBorrower, getLoan,
  };
}
