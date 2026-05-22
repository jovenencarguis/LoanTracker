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

const STORAGE_KEY = "loanData_v2";

export function useLoanData() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) setBorrowers(JSON.parse(data));
    } catch (e) {
      console.error("Failed to load loan data", e);
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
