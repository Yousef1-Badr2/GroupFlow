import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { DollarSign, ArrowRightLeft, CheckCircle2, X, Trash2 } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";
import { format } from "date-fns";
import * as firestoreService from "../../lib/firestoreService";

export default function PaymentsSubtab() {
  const { project, userRole } = useOutletContext<{ project: Project; userRole: Role }>();
  const { expenses, settlements, members, currentUser, users } = useStore();

  const [settleDialog, setSettleDialog] = useState<{ from: string; to: string; amount: number; maxAmount: number } | null>(null);
  const [settleAmount, setSettleAmount] = useState("");

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
    if (userId === currentUser?.id) return "Me";
    const user = users.find(u => u.id === userId);
    return user?.name || `User ${userId.substring(0, 4)}`;
  };

  const handleSettleDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settleDialog) return;
    
    const amount = parseFloat(settleAmount);
    if (isNaN(amount) || amount <= 0 || amount > settleDialog.maxAmount) return;

    try {
      await firestoreService.settleDebt({
        projectId: project.id,
        fromUserId: settleDialog.from,
        toUserId: settleDialog.to,
        amount: amount
      });
      setSettleDialog(null);
      setSettleAmount("");
    } catch (error) {
      console.error("Failed to settle debt:", error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await firestoreService.deleteExpense(project.id, expenseId);
      } catch (error) {
        console.error("Failed to delete expense:", error);
      }
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    if (window.confirm("Are you sure you want to delete this settlement?")) {
      try {
        await firestoreService.deleteSettlement(project.id, settlementId);
      } catch (error) {
        console.error("Failed to delete settlement:", error);
      }
    }
  };

  // Combine expenses and settlements for the activity log
  const activityLog = [
    ...projectExpenses.map(e => ({ ...e, type: 'expense' as const })),
    ...projectSettlements.map(s => ({ ...s, type: 'settlement' as const }))
  ].sort((a, b) => b.date - a.date);

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
                          onClick={() => {
                            setSettleDialog({ ...debt, maxAmount: debt.amount });
                            setSettleAmount(debt.amount.toFixed(2));
                          }}
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

        {/* Activity Log */}
        <div>
          <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">
            Activity Log
          </h3>
          {activityLog.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No payments activity yet.</p>
          ) : (
            <div className="space-y-3">
              {activityLog.map(item => {
                if (item.type === 'expense') {
                  const expense = item as typeof projectExpenses[0];
                  return (
                    <div key={expense.id} className="bg-white dark:bg-[#1E1E1E] p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-slate-900 dark:text-slate-100">{expense.description}</h4>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-slate-900 dark:text-slate-100">${expense.total.toFixed(2)}</span>
                          {!project.isArchived && userRole === 'leader' && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-full transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                        <span>Paid by {getUserName(expense.purchaserId)}</span>
                        <span>{format(expense.date, 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  );
                } else {
                  const settlement = item as typeof projectSettlements[0];
                  return (
                    <div key={settlement.id} className="bg-primary-50 dark:bg-primary-900/10 p-4 rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 size={18} className="text-primary-500" />
                          <h4 className="font-bold text-slate-900 dark:text-slate-100">Settlement</h4>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-primary-600 dark:text-primary-400">${settlement.amount.toFixed(2)}</span>
                          {!project.isArchived && userRole === 'leader' && (
                            <button
                              onClick={() => handleDeleteSettlement(settlement.id)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-full transition-colors"
                              title="Delete Settlement"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm text-slate-500 dark:text-slate-400">
                        <span>{getUserName(settlement.fromUserId)} paid {getUserName(settlement.toUserId)}</span>
                        <span>{format(settlement.date, 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                  );
                }
              })}
            </div>
          )}
        </div>

      </div>

      {/* Settle Dialog */}
      {settleDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1E1E1E] rounded-3xl w-full max-w-sm overflow-hidden shadow-xl">
            <div className="p-4 border-b border-primary-100 dark:border-primary-900/30 flex justify-between items-center">
              <h3 className="font-bold text-lg">Settle Debt</h3>
              <button 
                onClick={() => setSettleDialog(null)}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-primary-50 dark:hover:bg-primary-900/20"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSettleDebt} className="p-6">
              <div className="text-center mb-6">
                <p className="text-slate-600 dark:text-slate-300 mb-2">
                  <span className="font-bold text-slate-900 dark:text-slate-100">{getUserName(settleDialog.from)}</span>
                  {" pays "}
                  <span className="font-bold text-slate-900 dark:text-slate-100">{getUserName(settleDialog.to)}</span>
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Amount to Settle
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <DollarSign size={20} className="text-slate-400" />
                  </div>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={settleDialog.maxAmount}
                    value={settleAmount}
                    onChange={(e) => setSettleAmount(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-primary-50 dark:bg-[#121212] border-none rounded-xl focus:ring-2 focus:ring-primary-500 text-lg font-bold"
                    placeholder="0.00"
                    required
                  />
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Maximum amount: ${settleDialog.maxAmount.toFixed(2)}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setSettleDialog(null)}
                  className="flex-1 py-3 px-4 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 font-bold rounded-xl hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!settleAmount || parseFloat(settleAmount) <= 0 || parseFloat(settleAmount) > settleDialog.maxAmount}
                  className="flex-1 py-3 px-4 bg-primary-600 text-white font-bold rounded-xl hover:bg-primary-700 transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
