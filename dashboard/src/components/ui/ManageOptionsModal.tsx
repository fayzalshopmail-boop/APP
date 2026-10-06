import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from '@/store/useAppStore';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

interface ManageOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: 'deviceBrands' | 'deviceTypes' | 'deviceProblems';
  title: string;
  parentKey?: string;
}

export function ManageOptionsModal({ isOpen, onClose, category, title, parentKey }: ManageOptionsModalProps) {
  const storeState = useAppStore();
  
  // Get options dynamically based on whether it requires a parentKey
  const options = category === 'deviceTypes' 
    ? storeState.deviceTypes 
    : (storeState[category] as Record<string, string[]>)[parentKey || ''] || [];
    
  const addOption = storeState.addOption;
  const removeOption = storeState.removeOption;
  
  const [newValue, setNewValue] = useState('');
  
  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    optionToDelete: string | null;
  }>({ isOpen: false, optionToDelete: null });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newValue.trim()) {
      addOption(category, newValue.trim(), parentKey);
      setNewValue('');
    }
  };

  const handleDeleteRequest = (opt: string) => {
    setConfirmModal({ isOpen: true, optionToDelete: opt });
  };

  const handleConfirmDelete = () => {
    if (confirmModal.optionToDelete) {
      removeOption(category, confirmModal.optionToDelete, parentKey);
    }
    setConfirmModal({ isOpen: false, optionToDelete: null });
  };

  return (
    <>
      <Dialog open={isOpen && !confirmModal.isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-[400px] bg-popover text-white border-gray-800 shadow-2xl p-0 overflow-hidden z-[60]">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500" />
          
          <div className="p-5">
            <DialogHeader className="mb-4 flex flex-row items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-400" />
              <DialogTitle className="text-lg font-semibold m-0">Manage {title}</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAdd} className="flex gap-2 mb-4">
              <input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Add new option..."
                className="flex-1 bg-secondary border border-gray-800 text-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500/50"
              />
              <Button 
                type="submit"
                disabled={!newValue.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-2 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
              >
                <Plus className="w-4 h-4" /> Add
              </Button>
            </form>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {options.map((opt) => (
                <div key={opt} className="flex items-center justify-between bg-secondary border border-gray-800 rounded-lg p-3">
                  <span className="text-sm text-gray-200">{opt}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-gray-500 hover:text-red-400" onClick={() => handleDeleteRequest(opt)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {options.length === 0 && (
                <div className="text-center text-sm text-gray-500 py-4">No options added yet.</div>
              )}
            </div>
            
            <div className="mt-5 text-right">
              <Button type="button" variant="secondary" onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmModal 
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, optionToDelete: null })}
        onConfirm={handleConfirmDelete}
        title="Delete Option?"
        message={`Are you sure you want to delete "${confirmModal.optionToDelete}" from the list?`}
        confirmText="Delete"
      />
    </>
  );
}
