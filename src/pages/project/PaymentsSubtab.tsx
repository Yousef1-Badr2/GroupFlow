import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { DollarSign, ArrowRightLeft, CheckCircle2 } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";
import { format } from "date-fns";
import * as firestoreService from "../../lib/firestoreService";

export default function PaymentsSubtab() {
  const { project, userRole } = useOutletContext<{ project: Project; userRole: Role }>();
  const { expenses, settlements, members, currentUser } = useStore();

  const projectExpenses = expenses.filter(e => e.projectId === project.id);
  const projectSettlements = settlements.filter(s => s.projectId === project.id);
  const projectMembers = members.filter(m => m.projectId === project.id);

  // Calculate balances
  const balances: Record<string, number> = {};
  projectMembers.forEach(m => balances[m.userId] = 0);

  // Add what people paid
  projectExpenses.forEach(exp => {
    balances[exp.purchaserId] = (balances[exp.purchaserId] || 0) + exp.total;
    // Subtract what people owe
    exp.splits.forEach(split => {
      balances[split.userId] = (balances[split.userId] || 0) - split.amount;
    });
  });

  // Apply settlements
  projectSettlements.forEach(settlement => {
    balances[settlement.fromUserId] = (balances[settlement.fromUserId] || 0) + settlement.amount;
    balances[settlement.toUserId] = (balances[settlement.toUserId] || 0) - settlement.amount;
  });

  // Calculate who owes who (simplified greedy algorithm)
  const debtors = Object.entries(balances).filter(([_, bal]) => bal < -0.01).map(([id, bal]) => ({ id, amount: -bal })).sort((a, b) => b.amount - a.amount);
  const creditors = Object.entries(balances).filter(([_, bal]) => bal > 0.01).map(([id, bal]) => ({ id, amount: bal })).sort((a, b) => b.amount - a.amount);

  const debts: { from: string; to: string; amount: number }[] = [];
  
  let i = 0;
  let j = 0;
  
  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i];
    const creditor = creditors[j];
    
    const amount = Math.min(debtor.amount, creditor.amount);
    
    debts.push({
      from: debtor.id,
      to: creditor.id,
      amount: amount
    });
    
    debtor.amount -= amount;
    creditor.amount -= amount;
    
    if (debtor.amount < 0.01) i++;
    if (creditor.amount < 0.01) j++;
  }

  const getUserName = (userId: string) => {
    if (userId === currentUser?.id) return "You";
    return `User ${userId.substring(0, 4)}`;
  };

  const handleSettleDebt = async (debt: { from: string; to: string; amount: number }) => {
    try {
      await firestoreService.settleDebt({
        projectId: project.id,
        fromUserId: debt.from,
        toUserId: debt.to,
        amount: debt.amount
      });
    } catch (error) {
      console.error("Failed to settle debt:", error);
    }
  };

  return (
    <div className="h-full flex flex-col p-4 relative">
      <div className="flex-1 overflow-y-auto space-y-6 pb-20">
        
        {/* Balances Section */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">
            Who Owes Who
          </h3>
          {debts.length === 0 ? (
            <div className="bg-primary-50/50 dark:bg-primary-900/10 rounded-2xl p-6 text-center shadow-sm border border-primary-100 dark:border-primary-900/30">
              <CheckCircle2 size={32} className="text-primary-500 mx-auto mb-2" />
              <p className="font-bold text-slate-900 dark:text-slate-100">All settled up!</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">No outstanding balances.</p>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 overflow-hidden divide-y divide-primary-100 dark:divide-primary-900/30">
              {debts.map((debt, idx) => {
                const isMeOwe = debt.from === currentUser?.id;
                const isMeOwed = debt.to === currentUser?.id;

                return (
                  <div key={idx} className="p-4 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex flex-col items-center">
                        <span className={`font-bold ${isMeOwe ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {getUserName(debt.from)}
                        </span>
                        <span className="text-xs text-slate-500">owes</span>
                      </div>
                      <ArrowRightLeft size={16} className="text-slate-300" />
                      <div className="flex flex-col items-center">
                        <span className={`font-bold ${isMeOwed ? 'text-primary-600 dark:text-primary-400' : 'text-slate-900 dark:text-slate-100'}`}>
                          {getUserName(debt.to)}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="font-bold text-lg text-slate-900 dark:text-slate-100">
                        ${debt.amount.toFixed(2)}
                      </span>
                      {!project.isArchived && (isMeOwe || isMeOwed || userRole === 'leader') && (
                        <button
                          onClick={() => handleSettleDebt(debt)}
                          className="text-xs font-bold text-primary-700 dark:text-primary-500 hover:underline mt-1"
                        >
                          Settle Up
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Expenses Log */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">
            Expense Log
          </h3>
          {projectExpenses.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No expenses recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {projectExpenses.sort((a, b) => b.date - a.date).map(expense => (
                <div key={expense.id} className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{expense.description}</h4>
                    <span className="font-bold text-slate-900 dark:text-slate-100">${expense.total.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                    <span>Paid by {getUserName(expense.purchaserId)}</span>
                    <span>{format(expense.date, 'MMM d, yyyy')}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
