import type { Loan } from "@/hooks/useLoanData";

export type PaymentStatus =
  | { kind: "paid";      lastDate: string; nextDueDate: Date }
  | { kind: "overdue";   lastDate: string; nextDueDate: Date; daysLate: number }
  | { kind: "due-soon";  lastDate: string; nextDueDate: Date; daysLeft: number }
  | { kind: "upcoming";  lastDate: string; nextDueDate: Date; daysLeft: number };

export function getNextDueDate(loan: Loan): Date {
  const interval = loan.paymentIntervalDays ?? 30;
  const lastPayment = loan.payments.length > 0 ? loan.payments[loan.payments.length - 1] : null;
  const refDateStr = lastPayment ? lastPayment.date : loan.dateBorrowed;
  const refDate = new Date(refDateStr + "T00:00:00");
  return new Date(refDate.getTime() + interval * 86_400_000);
}

export function getPaymentStatus(loan: Loan): PaymentStatus {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastPayment = loan.payments.length > 0 ? loan.payments[loan.payments.length - 1] : null;
  const refDateStr = lastPayment ? lastPayment.date : loan.dateBorrowed;
  const nextDue = getNextDueDate(loan);
  const diffDays = Math.round((nextDue.getTime() - today.getTime()) / 86_400_000);

  if (diffDays > 7) {
    if (lastPayment) return { kind: "paid", lastDate: lastPayment.date, nextDueDate: nextDue };
    return { kind: "upcoming", lastDate: refDateStr, nextDueDate: nextDue, daysLeft: diffDays };
  }
  if (diffDays >= 0) return { kind: "due-soon", lastDate: refDateStr, nextDueDate: nextDue, daysLeft: diffDays };
  return { kind: "overdue", lastDate: refDateStr, nextDueDate: nextDue, daysLate: -diffDays };
}

export function statusLabel(s: PaymentStatus): string {
  if (s.kind === "paid")     return "Paid";
  if (s.kind === "overdue")  return `Overdue ${s.daysLate}d`;
  if (s.kind === "due-soon") return s.daysLeft === 0 ? "Due today" : `Due in ${s.daysLeft}d`;
  return `Due in ${(s as { kind: "upcoming"; daysLeft: number }).daysLeft}d`;
}

export function fullStatusLabel(s: PaymentStatus): string {
  if (s.kind === "paid")     return "Paid this period";
  if (s.kind === "overdue")  return `Overdue by ${s.daysLate} day${s.daysLate !== 1 ? "s" : ""}`;
  if (s.kind === "due-soon") return s.daysLeft === 0 ? "Due today!" : `Due in ${s.daysLeft} day${s.daysLeft !== 1 ? "s" : ""}`;
  return `Due in ${(s as { kind: "upcoming"; daysLeft: number }).daysLeft} days`;
}

export const STATUS_STYLES: Record<PaymentStatus["kind"], string> = {
  overdue:    "bg-red-50 border-red-200 text-red-700",
  "due-soon": "bg-amber-50 border-amber-200 text-amber-700",
  upcoming:   "bg-blue-50 border-blue-200 text-blue-700",
  paid:       "bg-green-50 border-green-200 text-green-700",
};

export const BADGE_STYLES: Record<PaymentStatus["kind"], string> = {
  overdue:    "bg-red-100 text-red-700 border border-red-200",
  "due-soon": "bg-amber-100 text-amber-700 border border-amber-200",
  upcoming:   "bg-blue-100 text-blue-700 border border-blue-200",
  paid:       "bg-green-100 text-green-700 border border-green-200",
};
