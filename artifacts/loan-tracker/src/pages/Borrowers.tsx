import { useLoanContext } from "@/contexts/LoanDataContext";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Archive, ArchiveRestore, CalendarClock, ChevronDown, Mail, Phone, Plus, Users, Wallet } from "lucide-react";
import { formatMoney } from "@/lib/utils";
import { AddBorrowerForm } from "@/components/AddBorrowerForm";
import { useState } from "react";
import { toast } from "sonner";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function Borrowers() {
  const [, setLocation] = useLocation();
  const { borrowers, isLoaded, addBorrower, setBorrowerArchived } = useLoanContext();
  const [showAdd, setShowAdd] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  if (!isLoaded) return null;

  const withOutstanding = borrowers.map(b => ({
    borrower: b,
    outstanding: b.loans.reduce((s, l) => s + l.currentBalance, 0),
  }));

  const active = withOutstanding.filter(r => !r.borrower.archived);
  const archived = withOutstanding.filter(r => r.borrower.archived);

  const pending = active.filter(r => r.outstanding > 0);
  const eligible = active.filter(r => r.outstanding === 0);

  const avatarColors = ["bg-emerald-700", "bg-blue-600", "bg-violet-600", "bg-rose-600", "bg-amber-600", "bg-teal-600", "bg-cyan-700", "bg-indigo-600"];
  const getAvatar = (name: string) => {
    const bg = avatarColors[name.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
    const p = name.trim().split(/\s+/);
    const initials = p.length === 1 ? p[0][0].toUpperCase() : (p[0][0] + p[p.length - 1][0]).toUpperCase();
    return { bg, initials };
  };

  const getBorrowerMeta = (b: (typeof borrowers)[number]) => {
    const totalBorrowed = b.loans.reduce((s, l) => s + l.startingBalance, 0);
    const totalCollected = b.loans.reduce((s, l) => s + l.payments.reduce((ps, p) => ps + p.totalCollected, 0), 0);
    const allPayments = b.loans.flatMap(l => l.payments);
    const lastPaymentDate = allPayments.length > 0
      ? allPayments.reduce((latest, p) => (p.date > latest ? p.date : latest), allPayments[0].date)
      : null;
    const activeLoanCount = b.loans.filter(l => l.currentBalance > 0).length;
    return { totalBorrowed, totalCollected, lastPaymentDate, activeLoanCount };
  };

  const handleArchive = async (id: string, name: string) => {
    await setBorrowerArchived(id, true);
    toast.success(`${name} archived`);
  };

  const handleUnarchive = async (id: string, name: string) => {
    await setBorrowerArchived(id, false);
    toast.success(`${name} restored`);
  };

  const renderRow = (
    b: (typeof borrowers)[number],
    outstanding: number,
    i: number,
    opts: { settled: boolean; archived: boolean }
  ) => {
    const { bg, initials } = getAvatar(b.name);
    const { totalBorrowed, totalCollected, lastPaymentDate, activeLoanCount } = getBorrowerMeta(b);
    return (
      <div
        key={b.id}
        className={`rounded-lg border border-border p-2.5 sm:p-3 hover:bg-secondary/40 transition-colors flex items-start gap-2 sm:gap-3 ${i % 2 === 0 ? "bg-background" : "bg-secondary/10"}`}
        data-testid={`borrower-row-${b.id}`}
      >
        <Link href={`/borrowers/${b.id}`} className="flex items-start gap-2 sm:gap-3 min-w-0 flex-1 cursor-pointer">
          <div className={`shrink-0 w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center text-white font-serif font-bold text-xs sm:text-sm select-none mt-0.5 ${bg}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-medium truncate max-w-full">{b.name}</span>
              {opts.archived && (
                <span className="text-[10px] font-medium bg-secondary text-muted-foreground border border-border px-1.5 py-0.5 rounded-full shrink-0">Archived</span>
              )}
            </div>
            {(b.email || b.phone) && (
              <div className="mt-0.5 space-y-0.5">
                {b.email && (
                  <div className="flex items-center gap-1 min-w-0 text-[11px] sm:text-xs text-muted-foreground">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{b.email}</span>
                  </div>
                )}
                {b.phone && (
                  <div className="flex items-center gap-1 min-w-0 text-[11px] sm:text-xs text-muted-foreground">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span className="truncate">{b.phone}</span>
                  </div>
                )}
              </div>
            )}
            <div className="flex flex-col gap-y-0.5 mt-1.5 text-[11px] sm:text-xs text-muted-foreground">
              <span className="truncate">{b.loans.length} loan{b.loans.length !== 1 ? "s" : ""}{activeLoanCount > 0 ? ` (${activeLoanCount} active)` : ""}</span>
              {totalBorrowed > 0 && (
                <span className="inline-flex items-center gap-1 min-w-0">
                  <Wallet className="w-3 h-3 shrink-0" /> <span className="truncate">{formatMoney(totalBorrowed)} lent</span>
                </span>
              )}
              {lastPaymentDate && (
                <span className="inline-flex items-center gap-1 min-w-0">
                  <CalendarClock className="w-3 h-3 shrink-0" /> <span className="truncate">Last payment {formatDate(lastPaymentDate)}</span>
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 pl-1.5 sm:pl-2 max-w-[92px] sm:max-w-[120px]">
            {opts.settled ? (
              <div className="font-serif font-bold text-xs sm:text-sm text-green-600 whitespace-nowrap">Settled</div>
            ) : (
              <>
                <div className="font-serif font-bold text-xs sm:text-sm text-primary whitespace-nowrap truncate">{formatMoney(outstanding)}</div>
                <div className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">outstanding</div>
              </>
            )}
            {totalCollected > 0 && (
              <div className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 whitespace-nowrap truncate">{formatMoney(totalCollected)} collected</div>
            )}
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
        </Link>
        {opts.archived ? (
          <button
            type="button"
            onClick={() => handleUnarchive(b.id, b.name)}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Restore borrower"
            data-testid={`button-unarchive-${b.id}`}
          >
            <ArchiveRestore className="w-4 h-4" />
          </button>
        ) : opts.settled ? (
          <button
            type="button"
            onClick={() => handleArchive(b.id, b.name)}
            className="shrink-0 h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            title="Archive borrower"
            data-testid={`button-archive-${b.id}`}
          >
            <Archive className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] w-full max-w-[700px] mx-auto bg-background flex flex-col">
      {/* Header */}
      <header className="px-6 py-5 border-b border-border bg-card">
        <div className="flex items-center justify-between mb-4">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif font-bold text-foreground mb-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" /> Borrowers
            </h1>
            <p className="text-sm text-muted-foreground">
              {active.length} active · {pending.length} pending · {eligible.length} settled
              {archived.length > 0 && ` · ${archived.length} archived`}
            </p>
          </div>
          <Button onClick={() => setShowAdd(true)} size="sm" className="h-9 shrink-0" data-testid="button-add-borrower">
            <Plus className="w-4 h-4 mr-1.5" /> Add Borrower
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 p-4 sm:p-6">
        {borrowers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-16 text-center">No borrowers yet. Add one to get started.</p>
        ) : (
          <div className="space-y-6">
            {pending.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Pending</h3>
                  <span className="text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{pending.length}</span>
                </div>
                <div className="space-y-1.5">
                  {pending.map(({ borrower: b, outstanding }, i) => renderRow(b, outstanding, i, { settled: false, archived: false }))}
                </div>
              </div>
            )}

            {eligible.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xs font-semibold text-green-700 uppercase tracking-wider">Settled</h3>
                  <span className="text-xs font-medium bg-green-100 text-green-700 border border-green-200 px-1.5 py-0.5 rounded-full">{eligible.length}</span>
                  <span className="text-xs text-muted-foreground">— archive to hide from this list</span>
                </div>
                <div className="space-y-1.5">
                  {eligible.map(({ borrower: b, outstanding }, i) => renderRow(b, outstanding, i, { settled: true, archived: false }))}
                </div>
              </div>
            )}

            {pending.length === 0 && eligible.length === 0 && (
              <p className="text-sm text-muted-foreground py-16 text-center">
                No active borrowers.{archived.length > 0 && " All borrowers are archived — view them below."}
              </p>
            )}

            {archived.length > 0 && (
              <div>
                <button
                  type="button"
                  onClick={() => setShowArchived(v => !v)}
                  className="flex items-center gap-2 mb-2 text-left"
                  data-testid="button-toggle-archived"
                >
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Archived</h3>
                  <span className="text-xs font-medium bg-secondary text-muted-foreground border border-border px-1.5 py-0.5 rounded-full">{archived.length}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${showArchived ? "rotate-180" : ""}`} />
                </button>
                {showArchived && (
                  <div className="space-y-1.5">
                    {archived.map(({ borrower: b, outstanding }, i) => renderRow(b, outstanding, i, { settled: outstanding === 0, archived: true }))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <AddBorrowerForm
        open={showAdd}
        onOpenChange={setShowAdd}
        addBorrower={async (name, email, phone) => {
          const b = await addBorrower(name, email, phone);
          setLocation(`/borrowers/${b.id}`);
          return b;
        }}
        existingBorrowers={borrowers}
      />
    </div>
  );
}
