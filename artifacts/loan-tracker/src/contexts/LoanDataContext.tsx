import { createContext, useContext, type ReactNode } from "react";
import { useLoanData } from "@/hooks/useLoanData";

type LoanDataContextValue = ReturnType<typeof useLoanData>;

const LoanDataContext = createContext<LoanDataContextValue | null>(null);

export function LoanDataProvider({ children }: { children: ReactNode }) {
  const value = useLoanData();
  return (
    <LoanDataContext.Provider value={value}>
      {children}
    </LoanDataContext.Provider>
  );
}

export function useLoanContext(): LoanDataContextValue {
  const ctx = useContext(LoanDataContext);
  if (!ctx) throw new Error("useLoanContext must be used inside LoanDataProvider");
  return ctx;
}
