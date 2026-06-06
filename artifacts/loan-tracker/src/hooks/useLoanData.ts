import { useState, useEffect, useCallback } from "react";
import { openDB, type IDBPDatabase } from "idb";

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
// IndexedDB is the primary store. localStorage keys are only read once to
// migrate existing data, then removed so they never conflict again.
const DB_NAME = "LoanTrackerDB";
const DB_VERSION = 1;
const STORE = "keyval";
const RECORD_KEY = "borrowers";

// Legacy localStorage keys — checked once on first run, then cleared
const LEGACY_LS_KEYS = ["loanData_v2", "loanData_v1", "loanData"];

// ─── Open / create the IndexedDB database ─────────────────────────────────
let _db: IDBPDatabase | null = null;
async function getDB(): Promise<IDBPDatabase> {
  if (_db) return _db;
  _db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    },
  });
  return _db;
}

// ─── Read from IndexedDB ───────────────────────────────────────────────────
async function dbRead(): Promise<Borrower[]> {
  const db = await getDB();
  const data = await db.get(STORE, RECORD_KEY);
  return Array.isArray(data) ? data : [];
}

// ─── Write to IndexedDB ────────────────────────────────────────────────────
async function dbWrite(borrowers: Borrower[]): Promise<void> {
  const db = await getDB();
  await db.put(STORE, borrowers, RECORD_KEY);
}

// ─── One-time migration from localStorage → IndexedDB ─────────────────────
async function migrateFromLocalStorage(): Promise<Borrower[] | null> {
  for (const key of LEGACY_LS_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    try {
      const parsed: Borrower[] = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        await dbWrite(parsed);
        // Remove all legacy keys after a successful migration
        LEGACY_LS_KEYS.forEach(k => localStorage.removeItem(k));
        console.info(`[LoanTracker] Migrated ${parsed.length} borrower(s) from localStorage "${key}" → IndexedDB`);
        return parsed;
      }
    } catch {
      console.warn(`[LoanTracker] Could not parse legacy key "${key}" — skipping.`);
    }
  }
  return null;
}

// ─── Export / Import helpers ───────────────────────────────────────────────
export async function exportData(): Promise<void> {
  const data = await dbRead();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
    reader.onload = async (e) => {
      try {
        const parsed: Borrower[] = JSON.parse(e.target?.result as string);
        if (!Array.isArray(parsed)) throw new Error("Invalid format — expected an array.");
        // Back up current data before overwriting
        const existing = await dbRead();
        if (existing.length > 0) {
          const db = await getDB();
          await db.put(STORE, existing, `${RECORD_KEY}_pre_import_backup`);
        }
        await dbWrite(parsed);
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
    (async () => {
      try {
        // 1. Try IndexedDB first
        const existing = await dbRead();
        if (existing.length > 0) {
          setBorrowers(existing);
        } else {
          // 2. Fall back: migrate from localStorage if anything is there
          const migrated = await migrateFromLocalStorage();
          if (migrated) setBorrowers(migrated);
        }
      } catch (e) {
        console.error("[LoanTracker] Failed to load data — data left untouched.", e);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  const saveBorrowers = useCallback(async (next: Borrower[]) => {
    setBorrowers(next);
    await dbWrite(next);
  }, []);

  const addBorrower = useCallback(async (name: string) => {
    const b: Borrower = { id: crypto.randomUUID(), name, loans: [] };
    await saveBorrowers([...borrowers, b]);
    return b;
  }, [borrowers, saveBorrowers]);

  const updateBorrower = useCallback(async (id: string, name: string) => {
    await saveBorrowers(borrowers.map(b => b.id === id ? { ...b, name } : b));
  }, [borrowers, saveBorrowers]);

  const deleteBorrower = useCallback(async (id: string) => {
    await saveBorrowers(borrowers.filter(b => b.id !== id));
  }, [borrowers, saveBorrowers]);

  const addLoan = useCallback(async (
    borrowerId: string,
    data: Omit<Loan, "id" | "currentBalance" | "payments">
  ) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return null;
    const loan: Loan = { ...data, id: crypto.randomUUID(), currentBalance: data.startingBalance, payments: [] };
    const next = [...borrowers];
    next[bi] = { ...next[bi], loans: [...next[bi].loans, loan] };
    await saveBorrowers(next);
    return loan;
  }, [borrowers, saveBorrowers]);

  const updateLoan = useCallback(async (
    borrowerId: string,
    loanId: string,
    updates: Partial<Pick<Loan, "interestRate" | "dateBorrowed" | "notes">>
  ) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return;
    const next = [...borrowers];
    next[bi] = { ...next[bi], loans: next[bi].loans.map(l => l.id === loanId ? { ...l, ...updates } : l) };
    await saveBorrowers(next);
  }, [borrowers, saveBorrowers]);

  const deleteLoan = useCallback(async (borrowerId: string, loanId: string) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return;
    const next = [...borrowers];
    next[bi] = { ...next[bi], loans: next[bi].loans.filter(l => l.id !== loanId) };
    await saveBorrowers(next);
  }, [borrowers, saveBorrowers]);

  const markLoanAsPaid = useCallback(async (borrowerId: string, loanId: string) => {
    const bi = borrowers.findIndex(b => b.id === borrowerId);
    if (bi === -1) return;
    const next = [...borrowers];
    next[bi] = {
      ...next[bi],
      loans: next[bi].loans.map(l => l.id === loanId ? { ...l, currentBalance: 0 } : l),
    };
    await saveBorrowers(next);
  }, [borrowers, saveBorrowers]);

  const addPayment = useCallback(async (
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
    await saveBorrowers(next);
    return payment;
  }, [borrowers, saveBorrowers]);

  const deletePayment = useCallback(async (borrowerId: string, loanId: string, paymentId: string) => {
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
    await saveBorrowers(next);
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
