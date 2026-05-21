import { useState, useEffect, useCallback } from "react";

export interface Payment {
  id: string;
  date: string;
  previousBalance: number;
  interest: number;
  repayment: number;
  totalCollected: number;
  newBalance: number;
}

export interface Borrower {
  id: string;
  name: string;
  startingBalance: number;
  currentBalance: number;
  interestRate: number;
  dateBorrowed: string;
  notes?: string;
  payments: Payment[];
}

const STORAGE_KEY = "loanData";

export function useLoanData() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        setBorrowers(JSON.parse(data));
      }
    } catch (e) {
      console.error("Failed to load loan data from localStorage", e);
    }
    setIsLoaded(true);
  }, []);

  const saveBorrowers = useCallback((newBorrowers: Borrower[]) => {
    setBorrowers(newBorrowers);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBorrowers));
  }, []);

  const addBorrower = useCallback((borrower: Omit<Borrower, "id" | "currentBalance" | "payments">) => {
    const newBorrower: Borrower = {
      ...borrower,
      id: crypto.randomUUID(),
      currentBalance: borrower.startingBalance,
      payments: []
    };
    saveBorrowers([...borrowers, newBorrower]);
    return newBorrower;
  }, [borrowers, saveBorrowers]);

  const updateBorrower = useCallback((id: string, updates: Partial<Pick<Borrower, "name" | "interestRate" | "dateBorrowed" | "notes">>) => {
    saveBorrowers(borrowers.map(b => b.id === id ? { ...b, ...updates } : b));
  }, [borrowers, saveBorrowers]);

  const addPayment = useCallback((borrowerId: string, paymentData: { date: string; repayment: number }) => {
    const borrowerIndex = borrowers.findIndex(b => b.id === borrowerId);
    if (borrowerIndex === -1) return null;

    const borrower = borrowers[borrowerIndex];
    const previousBalance = borrower.currentBalance;
    const interest = previousBalance * (borrower.interestRate / 100);
    const newBalance = previousBalance - paymentData.repayment;
    const totalCollected = paymentData.repayment + interest;

    const payment: Payment = {
      id: crypto.randomUUID(),
      date: paymentData.date,
      previousBalance,
      interest,
      repayment: paymentData.repayment,
      totalCollected,
      newBalance
    };

    const updatedBorrower = {
      ...borrower,
      currentBalance: newBalance,
      payments: [...borrower.payments, payment]
    };

    const newBorrowers = [...borrowers];
    newBorrowers[borrowerIndex] = updatedBorrower;
    saveBorrowers(newBorrowers);

    return payment;
  }, [borrowers, saveBorrowers]);

  return {
    borrowers,
    isLoaded,
    addBorrower,
    updateBorrower,
    addPayment,
    getBorrower: useCallback((id: string) => borrowers.find(b => b.id === id), [borrowers])
  };
}
