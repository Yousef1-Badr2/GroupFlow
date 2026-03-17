import React, { useState, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, ShoppingCart, CheckCircle2, DollarSign, ImagePlus, X, Loader2 } from "lucide-react";
import { useStore } from "../../store";
import { Project, Role } from "../../types";
import * as firestoreService from "../../lib/firestoreService";

export default function ShoppingSubtab() {
  const { project, userRole } = useOutletContext<{ project: Project; userRole: Role }>();
  const { shoppingItems } = useStore();
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
                      {!project.isArchived && (
                        <button
                          onClick={() => setPurchasingItem(item.id)}
                          className="mr-4 px-3 py-1.5 bg-primary-50 text-primary-700 dark:bg-primary-950/20 dark:text-primary-500 rounded-xl font-medium text-sm hover:bg-primary-100 dark:hover:bg-primary-950/40 transition-colors whitespace-nowrap"
                        >
                          Mark Bought
                        </button>
                      )}
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="font-bold text-slate-900 dark:text-slate-100 truncate">{item.name}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center">
                          <DollarSign size={14} className="mr-0.5" />
                          Est. ${item.estimatedCost.toFixed(2)}
                        </p>
                      </div>
                      {item.requestedImageUrl && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
                          <img src={item.requestedImageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
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
                      {(item.proofImageUrl || item.requestedImageUrl) && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 dark:border-slate-800">
                          <img src={item.proofImageUrl || item.requestedImageUrl} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      )}
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim() && estimatedCost && !isUploading) {
      setIsUploading(true);
      try {
        let requestedImageUrl;
        if (selectedImage) {
          requestedImageUrl = await firestoreService.uploadImage(selectedImage, `projects/${projectId}/shopping`);
        }

        await firestoreService.addShoppingItem({
          projectId,
          name: name.trim(),
          estimatedCost: parseFloat(estimatedCost),
          ...(requestedImageUrl && { requestedImageUrl })
        });
        onClose();
      } catch (error) {
        console.error("Failed to add shopping item:", error);
      } finally {
        setIsUploading(false);
      }
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Item Image (Optional)</label>
            {imagePreview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-primary-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <ImagePlus size={24} className="mb-2" />
                <span className="text-sm font-medium">Upload Image</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!name.trim() || !estimatedCost || isUploading} className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center">
              {isUploading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PurchaseItemModal({ itemId, projectId, onClose }: { itemId: string; projectId: string; onClose: () => void }) {
  const [actualCost, setActualCost] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, members } = useStore();
  const projectMembers = members.filter(m => m.projectId === projectId);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (actualCost && currentUser && !isUploading) {
      setIsUploading(true);
      const cost = parseFloat(actualCost);
      // Default to equal split among all members
      const splitAmount = cost / projectMembers.length;
      const splits = projectMembers.map(m => ({ userId: m.userId, amount: splitAmount }));
      
      try {
        let proofImageUrl;
        if (selectedImage) {
          proofImageUrl = await firestoreService.uploadImage(selectedImage, `projects/${projectId}/receipts`);
        }

        await firestoreService.purchaseItem(itemId, projectId, cost, currentUser.id, splits, proofImageUrl);
        onClose();
      } catch (error) {
        console.error("Failed to purchase item:", error);
      } finally {
        setIsUploading(false);
      }
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

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Proof of Purchase (Optional)</label>
            {imagePreview ? (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-500 hover:text-primary-600 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
              >
                <ImagePlus size={24} className="mb-2" />
                <span className="text-sm font-medium">Upload Receipt/Item</span>
              </button>
            )}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
          </div>

          <p className="text-xs text-slate-500 italic">
            This will automatically create an expense split equally among all {projectMembers.length} members.
          </p>
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} disabled={isUploading} className="px-4 py-2 text-primary-600 dark:text-primary-400 font-medium disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={!actualCost || isUploading} className="px-4 py-2 bg-primary-700 text-white rounded-xl font-medium disabled:opacity-50 flex items-center">
              {isUploading ? <Loader2 size={18} className="animate-spin mr-2" /> : null}
              Confirm
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
