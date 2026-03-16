import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, ShoppingCart, CheckCircle2, DollarSign } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";

export default function ShoppingSubtab() {
  const { project, userRole } = useOutletContext<{ project: Project; userRole: Role }>();
  const { shoppingItems, currentUser, addShoppingItem, purchaseItem } = useStore();
  const [showAddModal, setShowAddModal] = useState(false);
  const [purchasingItem, setPurchasingItem] = useState<string | null>(null);

  const items = shoppingItems.filter(i => i.projectId === project.id);
  const pendingItems = items.filter(i => !i.purchased);
  const purchasedItems = items.filter(i => i.purchased);

  return (
    <div className="h-full flex flex-col p-4 relative">
      <div className="flex-1 overflow-y-auto space-y-6 pb-20">
        {items.length === 0 ? (
          <div className="text-center py-10 text-slate-500 flex flex-col items-center">
            <ShoppingCart size={48} className="text-slate-300 mb-4" />
            <p>Shopping list is empty.</p>
          </div>
        ) : (
          <>
            {/* Pending Items */}
            {pendingItems.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">
                  To Buy ({pendingItems.length})
                </h3>
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 overflow-hidden divide-y divide-primary-100 dark:divide-primary-900/30">
                  {pendingItems.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                          <DollarSign size={14} className="mr-0.5" />
                          Est. ${item.estimatedCost.toFixed(2)}
                        </p>
                      </div>
                      {!project.isArchived && (
                        <button
                          onClick={() => setPurchasingItem(item.id)}
                          className="px-4 py-2 bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-500 rounded-xl font-medium text-sm hover:bg-primary-100 dark:hover:bg-primary-950/40 transition-colors whitespace-nowrap"
                        >
                          Mark Bought
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Purchased Items */}
            {purchasedItems.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 px-2">
                  Purchased ({purchasedItems.length})
                </h3>
                <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl shadow-sm border border-primary-100 dark:border-primary-900/30 overflow-hidden divide-y divide-primary-100 dark:divide-primary-900/30 opacity-70">
                  {purchasedItems.map((item) => (
                    <div key={item.id} className="p-4 flex items-center justify-between">
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate line-through">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                          <CheckCircle2 size={14} className="mr-1 text-primary-500" />
                          Bought for ${item.actualCost?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {!project.isArchived && (
        <button
          onClick={() => setShowAddModal(true)}
          className="absolute bottom-6 right-6 bg-primary-700 text-white p-4 rounded-full shadow-lg flex items-center justify-center hover:bg-primary-800 transition-colors"
        >
          <Plus size={24} />
        </button>
      )}

      {showAddModal && <AddItemModal projectId={project.id} onClose={() => setShowAddModal(false)} />}
      {purchasingItem && (
        <PurchaseItemModal 
          itemId={purchasingItem} 
          projectId={project.id}
          onClose={() => setPurchasingItem(null)} 
        />
      )}
    </div>
  );
}

function AddItemModal({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const [name, setName] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const addShoppingItem = useStore(state => state.addShoppingItem);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && estimatedCost) {
      addShoppingItem({
        projectId,
        name: name.trim(),
        estimatedCost: parseFloat(estimatedCost)
      });
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold mb-4">Add Item</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Estimated Cost ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={estimatedCost}
              onChange={(e) => setEstimatedCost(e.target.value)}
              className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium">Cancel</button>
            <button type="submit" disabled={!name.trim() || !estimatedCost} className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PurchaseItemModal({ itemId, projectId, onClose }: { itemId: string; projectId: string; onClose: () => void }) {
  const [actualCost, setActualCost] = useState("");
  const { purchaseItem, currentUser, members } = useStore();
  const projectMembers = members.filter(m => m.projectId === projectId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCost && currentUser) {
      const cost = parseFloat(actualCost);
      // Default to equal split among all members
      const splitAmount = cost / projectMembers.length;
      const splits = projectMembers.map(m => ({ userId: m.userId, amount: splitAmount }));
      
      purchaseItem(itemId, cost, currentUser.id, splits);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1E1E1E] rounded-2xl w-full max-w-sm p-6">
        <h2 className="text-xl font-bold mb-4">Mark as Purchased</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Actual Cost ($)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={actualCost}
              onChange={(e) => setActualCost(e.target.value)}
              className="w-full p-3 bg-primary-50/50 dark:bg-[#121212] border border-primary-100 dark:border-primary-900/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-600"
              autoFocus
            />
          </div>
          <p className="text-xs text-slate-500 italic">
            This will automatically create an expense split equally among all {projectMembers.length} members.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium">Cancel</button>
            <button type="submit" disabled={!actualCost} className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50">Confirm</button>
          </div>
        </form>
      </div>
    </div>
  );
}
